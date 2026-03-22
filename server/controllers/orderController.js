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
    const { shippingAddress, paymentMethod, note, couponCode, cartItems } = req.body;

    if (!customerId) {
        return res.status(401).json({ message: "Vui lòng đăng nhập để thanh toán." });
    }

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: "Giỏ hàng của bạn đang trống!" });
    }

    try {
        const variantIds = cartItems.map(item => item.variantId);
        const dbVariants = await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            include: {
                promotions: {
                    include: { promotion: true }
                }
            }
        });

        if (dbVariants.length !== variantIds.length) {
            return res.status(400).json({ message: "Có sản phẩm không tồn tại hoặc đã ngừng bán." });
        }

        let totalPrice = 0;
        const orderDetailsData = [];
        const now = new Date();

        for (const item of cartItems) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 10) {
                return res.status(400).json({ message: "Phát hiện số lượng sản phẩm không hợp lệ! Hành vi đã bị ghi nhận." });
            }

            const realVariant = dbVariants.find(v => v.id === item.variantId);
            
            let currentUnitPrice = realVariant.unitPrice;
            let appliedPromotionId = null;

            // 🚀 FIX: Bọc thép an toàn cho Array và Date
            if (realVariant.promotions && Array.isArray(realVariant.promotions)) {
                const activePromoLink = realVariant.promotions.find(p => {
                    if (!p.promotion) return false;
                    const start = new Date(p.promotion.startTime);
                    const end = new Date(p.promotion.endTime);
                    return start <= now && end >= now;
                });

                if (activePromoLink) {
                    const promo = activePromoLink.promotion;
                    appliedPromotionId = promo.id; 
                    
                    if (promo.type === 'PERCENTAGE') {
                        currentUnitPrice = currentUnitPrice * (1 - promo.value / 100);
                    } else if (promo.type === 'FIXED') {
                        currentUnitPrice = Math.max(0, currentUnitPrice - promo.value);
                    }
                }
            }

            totalPrice += (currentUnitPrice * item.quantity);

            orderDetailsData.push({
                productVariantId: realVariant.id,
                promotionId: appliedPromotionId, // Lưu chuẩn ID
                quantity: item.quantity,
                originalPrice: realVariant.unitPrice, 
                unitPrice: currentUnitPrice, 
            });
        }

        // =======================================================
        // 3. TÍNH TOÁN MÃ GIẢM GIÁ
        // =======================================================
        // =======================================================
        // 3. TÍNH TOÁN MÃ GIẢM GIÁ (ĐÃ FIX LỖI PUBLIC COUPON)
        // =======================================================
        let baseShippingFee = 30000; 
        let orderDiscount = 0;
        let shippingDiscount = 0;
        let appliedOrderCouponId = null;
        let appliedShippingCouponId = null;
        let couponUsageIdToUpdate = null;
        let isPublicCoupon = false;

        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });

            if (coupon) {
                const now = new Date();
                if (now >= coupon.createdAt && now <= coupon.expireAt) {
                    const globalUsedCount = await prisma.cart.count({
                        where: { OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }], status: { notIn: ['DRAFT', 'CANCELLED'] } }
                    });
                    
                    if (globalUsedCount < coupon.usageLimit) {
                        const walletItem = await prisma.couponUsage.findFirst({
                            where: { couponId: coupon.id, customerId: customerId, status: 'ACTIVE', remaining: { gt: 0 } }
                        }); 
                        
                        let canApply = false;
                        
                        if (walletItem) {
                            couponUsageIdToUpdate = walletItem.id; 
                            canApply = true;
                        } else {
                            const personalUsedCount = await prisma.couponUsage.count({
                                where: { couponId: coupon.id, customerId: customerId }
                            });
                            const limitPerUser = coupon.rule?.usagePerUser || 1;
                            
                            if (limitPerUser === 0 || personalUsedCount < limitPerUser) {
                                isPublicCoupon = true;
                                canApply = true;
                            }
                        }

                        // 🚀 FIX Ở ĐÂY: canApply chạy độc lập, không bị kẹt trong if(walletItem)
                        if (canApply) {
                            const rule = coupon.rule || {};
                            const minOrderValue = rule.minOrderValue || 0;
                            
                            if (totalPrice >= minOrderValue) {
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
                }
            }
        }

        const finalShippingFee = baseShippingFee - shippingDiscount;
        const finalPrice = Math.max(0, (totalPrice - orderDiscount)) + finalShippingFee; // Không âm

        // =======================================================
        // 4, 5, 6: CÁC BƯỚC KHÁC GIỮ NGUYÊN HOÀN TOÀN...
        // =======================================================
        let currentCart = await prisma.cart.findFirst({
            where: { customerId: customerId, status: 'DRAFT' }
        });

        if (!currentCart) {
            currentCart = await prisma.cart.create({
                data: { customerId: customerId, status: 'DRAFT' }
            });
        }

        await prisma.$transaction(async (tx) => {
            for (const item of orderDetailsData) {
                const inventories = await tx.inventory.findMany({
                    where: { productVariantId: item.productVariantId, quantity: { gt: 0 } },
                    orderBy: { quantity: 'desc' }
                });
                let remainingToDeduct = item.quantity; 
                for (const inv of inventories) {
                    if (remainingToDeduct <= 0) break;
                    const deductAmount = Math.min(inv.quantity, remainingToDeduct);
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: deductAmount } }
                    });
                    remainingToDeduct -= deductAmount;
                }
                if (remainingToDeduct > 0) {
                    throw new Error(`SẢN PHẨM_HẾT_HÀNG|Rất tiếc, sản phẩm trong giỏ đã hết hàng ngay lúc bạn thanh toán!`);
                }
            }

            await tx.orderDetail.deleteMany({ where: { orderId: currentCart.id } });
            
            await tx.orderDetail.createMany({
                data: orderDetailsData.map(detail => ({
                    ...detail,
                    orderId: currentCart.id
                }))
            });

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

            if (couponUsageIdToUpdate) {
                const updatedUsage = await tx.couponUsage.update({
                    where: { id: couponUsageIdToUpdate },
                    data: {
                        remaining: { decrement: 1 }, 
                        usedAt: new Date()
                    }
                });

                if (updatedUsage.remaining <= 0) {
                    await tx.couponUsage.update({
                        where: { id: couponUsageIdToUpdate },
                        data: { status: 'USED_UP' }
                    });
                }
            } else if (isPublicCoupon && (appliedOrderCouponId || appliedShippingCouponId)) {
                // 🚀 NẾU KHÁCH XÀI MÃ GÕ TAY: Tự động ghi vào lịch sử ví để chống khách xài lặp lại
                await tx.couponUsage.create({
                    data: {
                        couponId: appliedOrderCouponId || appliedShippingCouponId,
                        customerId: customerId,
                        status: 'USED_UP',
                        remaining: 0,
                        usedAt: new Date()
                    }
                });
            }
            await tx.cart.create({
                data: { customerId: customerId, status: 'DRAFT' }
            });
        });

        if (paymentMethod === 'VNPAY') {
            let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";
            let tmnCode = process.env.VNP_TMN_CODE;
            let secretKey = process.env.VNP_HASH_SECRET;
            let vnpUrl = process.env.VNP_URL;
            let returnUrl = process.env.VNP_RETURN_URL;

            let createDate = moment(new Date()).format('YYYYMMDDHHmmss');
            let orderIdStr = currentCart.id.replace(/-/g, ''); 
            
            let vnp_Params = {};
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = tmnCode;
            vnp_Params['vnp_Locale'] = 'vn';
            vnp_Params['vnp_CurrCode'] = 'VND';
            vnp_Params['vnp_TxnRef'] = orderIdStr;
            vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderIdStr;
            vnp_Params['vnp_OrderType'] = 'other';
            vnp_Params['vnp_Amount'] = finalPrice * 100; 
            vnp_Params['vnp_ReturnUrl'] = returnUrl;
            vnp_Params['vnp_IpAddr'] = ipAddr;
            vnp_Params['vnp_CreateDate'] = createDate;

            vnp_Params = sortObject(vnp_Params);

            let signData = qs.stringify(vnp_Params, { encode: false });
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
            
            vnp_Params['vnp_SecureHash'] = signed;
            vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

            return res.status(200).json({ 
                message: "Đang chuyển hướng sang VNPAY...", 
                paymentUrl: vnpUrl 
            });

        } else {
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
                mainCoupon: true,
                shippingCoupon: true,
                orderDetails: {
                    include: {
                        variant: {
                            include: { product: true } // Kéo tên sản phẩm gốc ra
                        },
                        promotion: true
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
// =========================================================================
// 🚀 TÍNH NĂNG MỚI: HỦY ĐƠN HÀNG (ĐÃ FIX BUG 403)
// =========================================================================
export const cancelOrder = async (req, res) => {
    const { id } = req.params;
    
    // 🚀 Lấy ID từ token (Hỗ trợ cả 2 chuẩn lưu trữ)
    const currentUserId = req.user?.id || req.user?.userId; 
    const userRole = req.user?.role; 

    if (!currentUserId) return res.status(401).json({ message: "Vui lòng đăng nhập." });

    try {
        const order = await prisma.cart.findUnique({
            where: { id },
            include: { orderDetails: true }
        });

        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

        // 🚀 Kiểm tra quyền (Hỗ trợ nhiều kiểu lưu Role)
        const isAdmin = userRole === 5150 || userRole === 'Admin' || userRole === 'ADMIN';
        
        // 🚀 Debug xem tại sao nó vướng 403
        console.log("Check Quyền Hủy Đơn ->", {
            Nguoi_Bam_Huy: currentUserId, 
            Chu_Don_Hang: order.customerId, 
            La_Admin_Khong: isAdmin 
        });

        if (!isAdmin && order.customerId !== currentUserId) {
            return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này." });
        }

        if (order.status !== 'PENDING') {
            return res.status(400).json({ message: "Không thể hủy đơn hàng đã được xử lý hoặc đang giao." });
        }

        if (!isAdmin) {
            const now = new Date();
            const orderTime = new Date(order.createdAt);
            const diffInHours = (now - orderTime) / (1000 * 60 * 60);

            if (diffInHours > 2) {
                return res.status(400).json({ message: "Đã quá 2 tiếng kể từ lúc đặt hàng. Vui lòng liên hệ Admin để được hỗ trợ." });
            }
        }

        // THỰC HIỆN HỦY VÀ HOÀN TRẢ
        await prisma.$transaction(async (tx) => {
            // A. Hoàn trả Tồn kho 
            for (const item of order.orderDetails) {
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

            // B. Hoàn trả lượt dùng Mã giảm giá (nếu là mã được phát hành vào ví)
            if (order.couponId) {
                const usage = await tx.couponUsage.findFirst({
                    where: { couponId: order.couponId, customerId: order.customerId }
                });
                if (usage) {
                    await tx.couponUsage.update({
                        where: { id: usage.id },
                        data: { remaining: { increment: 1 }, status: 'ACTIVE' }
                    });
                }
            }

            // C. Hoàn trả Mã giảm giá Vận chuyển
            if (order.shippingCouponId) {
                const shippingUsage = await tx.couponUsage.findFirst({
                    where: { couponId: order.shippingCouponId, customerId: order.customerId }
                });
                if (shippingUsage) {
                    await tx.couponUsage.update({
                        where: { id: shippingUsage.id },
                        data: { remaining: { increment: 1 }, status: 'ACTIVE' }
                    });
                }
            }

            // C. Cập nhật trạng thái
            await tx.cart.update({
                where: { id },
                data: { status: 'CANCELLED', paymentStatus: 'FAILED' }
            });
        });

        res.json({ message: "Hủy đơn hàng thành công. Tồn kho và Voucher đã được hoàn trả." });

    } catch (error) {
        console.error("Lỗi khi hủy đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi hủy đơn hàng." });
    }
};


// =========================================================================
// 🚀 TÍNH NĂNG MỚI: ADMIN CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
// =========================================================================
export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    try {
        const order = await prisma.cart.findUnique({ where: { id } });
        
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
        if (order.status === 'CANCELLED') return res.status(400).json({ message: "Đơn hàng đã bị hủy, không thể cập nhật trạng thái." });

        let updateData = { status };
        // Tự động chốt tiền nếu giao thành công đơn COD
        if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
            updateData.paymentStatus = 'PAID';
        }

        const updatedOrder = await prisma.cart.update({
            where: { id },
            data: updateData
        });

        res.json({ message: `Cập nhật trạng thái thành ${status} thành công.`, order: updatedOrder });

    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống." });
    }
};

// =========================================================================
// 🚀 TÍNH NĂNG MỚI: ADMIN LẤY TẤT CẢ ĐƠN HÀNG
// =========================================================================
export const getAllOrdersAdmin = async (req, res) => {
    try {
        const orders = await prisma.cart.findMany({
            where: { status: { notIn: ['DRAFT'] } }, // Không lấy các giỏ hàng đang chọn dở
            include: {
                customer: { select: { firstName: true, lastName: true, mail: true, phoneNumber: true, accountName: true } },
                orderDetails: {
                    include: {
                        variant: { include: { product: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
    } catch (error) {
        console.error("Lỗi lấy danh sách đơn Admin:", error);
        res.status(500).json({ message: "Lỗi hệ thống." });
    }
};