import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import crypto from 'crypto';
import qs from 'qs';

const prisma = new PrismaClient();

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

export const checkoutOrder = async (req, res) => {
    const customerId = req.user?.id; 
    // Nhận thêm cartItems từ Frontend
    const { shippingAddress, paymentMethod, note, couponCode, cartItems } = req.body;

    if (!customerId) {
        return res.status(401).json({ message: "Vui lòng đăng nhập để thanh toán." });
    }

    // 1. Kiểm tra xem Frontend có gửi mảng giỏ hàng lên không
    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: "Giỏ hàng của bạn đang trống!" });
    }

    try {
        // =======================================================
        // 2. KIỂM TRA BẢO MẬT: Lấy giá thật từ Database (Chống bypass)
        // =======================================================
        // Lấy ra mảng các ID biến thể sản phẩm mà khách muốn mua
        const variantIds = cartItems.map(item => item.variantId);
        
        const dbVariants = await prisma.productVariant.findMany({
            where: { id: { in: variantIds } }
        });

        if (dbVariants.length !== variantIds.length) {
            return res.status(400).json({ message: "Có sản phẩm không tồn tại hoặc đã ngừng bán." });
        }

        let totalPrice = 0;
        const orderDetailsData = [];

        // So khớp dữ liệu Frontend gửi và Database
        for (const item of cartItems) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 10) {
                return res.status(400).json({ message: "Phát hiện số lượng sản phẩm không hợp lệ! Hành vi đã bị ghi nhận." });
            }

            const realVariant = dbVariants.find(v => v.id === item.variantId);
            
            // Tính tổng tiền bằng giá THẬT của Database
            totalPrice += (realVariant.unitPrice * item.quantity);

            // Chuẩn bị dữ liệu để insert vào bảng OrderDetail
            orderDetailsData.push({
                productVariantId: realVariant.id,
                quantity: item.quantity,
                unitPrice: realVariant.unitPrice,
                originalPrice: realVariant.unitPrice 
            });
        }

        // =======================================================
        // 3. TÍNH TOÁN MÃ GIẢM GIÁ
        // =======================================================
        let baseShippingFee = 30000; 
        let orderDiscount = 0;
        let shippingDiscount = 0;
        let appliedOrderCouponId = null;
        let appliedShippingCouponId = null;
        let couponUsageIdToUpdate = null;

        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });

            if (coupon) {
                const walletItem = await prisma.couponUsage.findFirst({
                    where: { couponId: coupon.id, customerId: customerId, status: 'ACTIVE', remaining: { gt: 0 } }
                });

                if (walletItem) {
                    couponUsageIdToUpdate = walletItem.id; 
                    const rule = coupon.rule || {};
                    // Áp dụng giảm giá theo loại
                    // Lưu ý: Nếu có cả 2 loại giảm giá, ưu tiên áp dụng mã ORDER trước, sau đó mới đến SHIPPING
                    if (coupon.category === 'ORDER') {
                        appliedOrderCouponId = coupon.id; 
                        let calc = coupon.type === 'PERCENTAGE' ? (totalPrice * coupon.value) / 100 : coupon.value;
                        if (rule.maxDiscountValue && rule.maxDiscountValue > 0) calc = Math.min(calc, rule.maxDiscountValue);
                        orderDiscount = Math.min(calc, totalPrice);
                    } else if (coupon.category === 'SHIPPING') {
                        appliedShippingCouponId = coupon.id;
                        let calc = coupon.type === 'PERCENTAGE' ? (baseShippingFee * coupon.value) / 100 : coupon.value;
                        if (rule.maxDiscountValue && rule.maxDiscountValue > 0) calc = Math.min(calc, rule.maxDiscountValue);
                        shippingDiscount = Math.min(calc, baseShippingFee);
                    }
                }
            }
        }

        const finalShippingFee = baseShippingFee - shippingDiscount;
        const finalPrice = (totalPrice - orderDiscount) + finalShippingFee;

        // =======================================================
        // 4. KIẾM TRA HOẶC TẠO GIỎ HÀNG GỐC 
        // =======================================================
        let currentCart = await prisma.cart.findFirst({
            where: { customerId: customerId, status: 'DRAFT' }
        });

        // Đảm bảo luôn có 1 giỏ hàng để cập nhật thành Đơn hàng
        if (!currentCart) {
            currentCart = await prisma.cart.create({
                data: { customerId: customerId, status: 'DRAFT' }
            });
        }

        // =============================================================
        // 🚀 5. TRANSACTION LƯU XUỐNG DATABASE
        // =============================================================
        await prisma.$transaction(async (tx) => {
            for (const item of orderDetailsData) {
                // Tìm kho đang chứa sản phẩm này
                const inventories = await tx.inventory.findMany({
                    where: { 
                        productVariantId: item.productVariantId, 
                        quantity: { gt: 0 } 
                    },
                    orderBy: { quantity: 'desc' }
            });
            let remainingToDeduct = item.quantity; // Số lượng khách muốn mua
                // Vòng lặp rà soát và trừ dần ở kho
                for (const inv of inventories) {
                    if (remainingToDeduct <= 0) break;
                    const deductAmount = Math.min(inv.quantity, remainingToDeduct);
                    // ⚡ ATOMIC UPDATE: Khóa dòng dữ liệu, an toàn tuyệt đối với 1000 người mua cùng lúc
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: deductAmount } }
                    });
                    remainingToDeduct -= deductAmount;
                }
                // 🚨 NẾU KHO KHÔNG ĐỦ HÀNG -> HỦY BỎ (ROLLBACK) TOÀN BỘ GIAO DỊCH
                if (remainingToDeduct > 0) {
                    throw new Error(`SẢN PHẨM_HẾT_HÀNG|Rất tiếc, sản phẩm trong giỏ đã hết hàng ngay lúc bạn thanh toán!`);
                }
            }

            // A. Dọn dẹp OrderDetails cũ (nếu có rác) và Insert danh sách mới
            await tx.orderDetail.deleteMany({ where: { orderId: currentCart.id } });
            
            await tx.orderDetail.createMany({
                data: orderDetailsData.map(detail => ({
                    ...detail,
                    orderId: currentCart.id // Móc vào Đơn hàng hiện tại
                }))
            });

            // B. Chuyển Giỏ hàng thành ĐƠN HÀNG (PENDING)
            await tx.cart.update({
                where: { id: currentCart.id },
                data: {
                    status: 'PENDING',
                    shippingAddress: shippingAddress,
                    paymentMethod: paymentMethod,
                    paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING',
                    note: note,
                    finalPrice: finalPrice,
                    couponId: appliedOrderCouponId,
                    shippingCouponId: appliedShippingCouponId,
                    couponDiscount: orderDiscount,
                    shippingDiscount: shippingDiscount
                }
            });

            // C. Trừ số lượt sử dụng trong Ví Voucher 
            if (couponUsageIdToUpdate) {
                const updatedUsage = await tx.couponUsage.update({
                    where: { id: couponUsageIdToUpdate },
                    data: {
                        remaining: { decrement: 1 }, // Ép PostgreSQL tự trừ an toàn
                        usedAt: new Date()
                    }
                });

                // Nếu trừ xong mà về 0 thì cập nhật status
                if (updatedUsage.remaining <= 0) {
                    await tx.couponUsage.update({
                        where: { id: couponUsageIdToUpdate },
                        data: { status: 'USED_UP' }
                    });
                }
            }

            // D. Tạo Giỏ hàng mới tinh cho tương lai
            await tx.cart.create({
                data: { customerId: customerId, status: 'DRAFT' }
            });
        });

        // =============================================================
        // 🚀 6. XỬ LÝ TRẢ VỀ DỰA TRÊN PHƯƠNG THỨC THANH TOÁN
        // =============================================================
        
        if (paymentMethod === 'VNPAY') {
            // Lấy IP của người dùng để gửi cho VNPAY (Bắt buộc)
            let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";

            // Lấy config từ .env
            let tmnCode = process.env.VNP_TMN_CODE;
            let secretKey = process.env.VNP_HASH_SECRET;
            let vnpUrl = process.env.VNP_URL;
            let returnUrl = process.env.VNP_RETURN_URL;

            // VNPAY yêu cầu format ngày giờ YYYYMMDDHHmmss
            let createDate = moment(new Date()).format('YYYYMMDDHHmmss');
            
            // Dùng ID giỏ hàng làm mã đơn hàng gửi VNPAY (Xóa dấu gạch ngang của UUID cho an toàn)
            let orderIdStr = currentCart.id.replace(/-/g, ''); 
            
            // Tạo Object chứa các tham số
            let vnp_Params = {};
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = tmnCode;
            vnp_Params['vnp_Locale'] = 'vn';
            vnp_Params['vnp_CurrCode'] = 'VND';
            vnp_Params['vnp_TxnRef'] = orderIdStr;
            vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderIdStr;
            vnp_Params['vnp_OrderType'] = 'other';
            vnp_Params['vnp_Amount'] = finalPrice * 100; // VNPAY quy định số tiền phải nhân 100
            vnp_Params['vnp_ReturnUrl'] = returnUrl;
            vnp_Params['vnp_IpAddr'] = ipAddr;
            vnp_Params['vnp_CreateDate'] = createDate;

            // Sắp xếp tham số theo chuẩn VNPAY
            vnp_Params = sortObject(vnp_Params);

            // Băm chuỗi dữ liệu (Tạo chữ ký bảo mật HMAC SHA512)
            let signData = qs.stringify(vnp_Params, { encode: false });
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
            
            // Gắn chữ ký vào cuối URL
            vnp_Params['vnp_SecureHash'] = signed;
            vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

            // Gửi link VNPAY về cho Frontend
            return res.status(200).json({ 
                message: "Đang chuyển hướng sang VNPAY...", 
                paymentUrl: vnpUrl 
            });

        } else {
            // NẾU LÀ COD -> Trả về thành công luôn
            return res.status(200).json({ 
                message: "🎉 Đặt hàng thành công!", 
                orderId: currentCart.id 
            });
        }

    } catch (error) {
        console.error("[ERROR] Checkout:", error);
        if (error.message && error.message.includes("SẢN PHẨM_HẾT_HÀNG")) {
            const userMsg = error.message.split('|')[1];
            return res.status(400).json({ message: userMsg });
        }
        res.status(500).json({ message: "Lỗi hệ thống khi xử lý thanh toán. Vui lòng thử lại!" });
    }
};


export const getMyOrders = async (req, res) => {
    const customerId = req.user?.id;

    if (!customerId) {
        return res.status(401).json({ message: "Vui lòng đăng nhập để xem lịch sử." });
    }

    try {
        const orders = await prisma.cart.findMany({
            where: {
                customerId: customerId,
                // Loại bỏ những cái đang là Giỏ hàng, chỉ lấy Đơn hàng đã checkout
                status: { notIn: ['CART', 'DRAFT'] } 
            },
            include: {
                orderDetails: {
                    include: {
                        variant: {
                            include: {
                                product: true // Kéo tên sản phẩm gốc ra
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' // Đơn hàng mới nhất lên đầu
            }
        });

        res.status(200).json(orders);
    } catch (error) {
        console.error("[ERROR] getMyOrders:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tải lịch sử mua hàng." });
    }
};


// 🔍 KIỂM TRA KẾT QUẢ TRẢ VỀ TỪ VNPAY
export const verifyVnpayReturn = async (req, res) => {
    try {
        let vnp_Params = req.query;

        let secureHash = vnp_Params['vnp_SecureHash'];
        
        // Cần copy ra một object mới để đảm bảo tính toàn vẹn khi sort
        let signDataParams = Object.assign({}, vnp_Params);
        delete signDataParams['vnp_SecureHash'];
        delete signDataParams['vnp_SecureHashType']; 

        signDataParams = sortObject(signDataParams);

        let secretKey = process.env.VNP_HASH_SECRET;
        
        // 🚀 FIX LỖI CHỮ KÝ: Dùng đúng chuẩn của VNPAY
        let signData = qs.stringify(signDataParams, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            const responseCode = vnp_Params['vnp_ResponseCode'];
            const orderIdStr = vnp_Params['vnp_TxnRef']; 

            // 🚀 FIX LỖI 500 SLICE: Kiểm tra độ dài trước khi cắt
            if (!orderIdStr || orderIdStr.length < 32) {
                return res.status(400).json({ message: "Mã đơn hàng không hợp lệ!" });
            }

            // Khôi phục lại UUID chuẩn
            const orderId = `${orderIdStr.slice(0,8)}-${orderIdStr.slice(8,12)}-${orderIdStr.slice(12,16)}-${orderIdStr.slice(16,20)}-${orderIdStr.slice(20)}`;

            if (responseCode === '00') {
                // ✅ THÀNH CÔNG: Chốt đơn
                await prisma.cart.update({
                    where: { id: orderId },
                    data: { paymentStatus: 'PAID' }
                });
                return res.status(200).json({ message: "Thanh toán thành công", code: "00" });
                
            } else {
                // ❌ THẤT BẠI HOẶC HỦY: Trả lại tồn kho và Hủy đơn
                const failedOrder = await prisma.cart.findUnique({
                    where: { id: orderId },
                    include: { orderDetails: true }
                });

                if (failedOrder && failedOrder.status !== 'CANCELLED') {
                    // Dùng Transaction để đảm bảo trả lại kho an toàn
                    await prisma.$transaction(async (tx) => {
                        // Trả lại tồn kho cho từng sản phẩm
                        for (const item of failedOrder.orderDetails) {
                            const inventory = await tx.inventory.findFirst({
                                where: { productVariantId: item.productVariantId }
                            });

                            if (inventory) {
                                await tx.inventory.update({
                                    where: { id: inventory.id },
                                    data: { quantity: { increment: item.quantity } }
                                });
                            }
                        }

                        // Trả lại lượt dùng Voucher (Nếu có)
                        if (failedOrder.couponId) {
                            const usage = await tx.couponUsage.findFirst({
                                where: { couponId: failedOrder.couponId, customerId: failedOrder.customerId }
                            });
                            if (usage) {
                                await tx.couponUsage.update({
                                    where: { id: usage.id },
                                    data: { remaining: { increment: 1 }, status: 'ACTIVE' }
                                });
                            }
                        }

                        // Cuối cùng: Hủy đơn hàng
                        await tx.cart.update({
                            where: { id: orderId },
                            data: { paymentStatus: 'FAILED', status: 'CANCELLED' } 
                        });
                    });
                }
                
                return res.status(200).json({ message: "Giao dịch bị hủy hoặc thất bại", code: responseCode });
            }
        } else {
            console.error("Sai chữ ký VNPAY. Chuỗi ký gốc:", secureHash, "Chuỗi băm:", signed);
            return res.status(400).json({ message: "Chữ ký không hợp lệ (Bị giả mạo)!" });
        }
    } catch (error) {
        console.error("VNPAY Return Error:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xác thực VNPAY" });
    }
};