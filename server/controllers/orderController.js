import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

        res.status(200).json({ message: "🎉 Đặt hàng thành công!", orderId: currentCart.id });

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