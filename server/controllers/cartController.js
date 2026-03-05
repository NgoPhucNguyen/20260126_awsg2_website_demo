// server/controllers/cartController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const syncCart = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy từ middleware verifyJWT
        const { localCart } = req.body; // Mảng items từ localStorage

        // 1. Tìm giỏ hàng DRAFT hiện tại của user
        let dbCart = await prisma.cart.findFirst({
            where: { customerId: userId, status: 'DRAFT' },
            include: { orderDetails: true }
        });

        // 🌟 RULE 4: KIỂM TRA HẾT HẠN (24 GIỜ)
        if (dbCart) {
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            const now = new Date();
            if (now - new Date(dbCart.createdAt) > ONE_DAY_MS) {
                // Đã quá 1 ngày -> Đánh dấu hết hạn
                await prisma.cart.update({
                    where: { id: dbCart.id },
                    data: { status: 'EXPIRED' }
                });
                dbCart = null; // Bỏ giỏ này, chuẩn bị tạo giỏ mới
            }
        }

        // 2. Tạo giỏ hàng mới nếu chưa có (hoặc giỏ cũ vừa bị hủy do hết hạn)
        if (!dbCart) {
            dbCart = await prisma.cart.create({
                data: {
                    customerId: userId,
                    status: 'DRAFT',
                    finalPrice: 0,
                    couponDiscount: 0
                },
                include: { orderDetails: true }
            });
        }

        // 🌟 RULE 3: MERGE LOCAL CART VÀO DATABASE CART
        if (localCart && localCart.length > 0) {
            for (const localItem of localCart) {
                // Tìm xem món này đã có trong DB chưa
                const existingDetail = await prisma.orderDetail.findFirst({
                    where: {
                        orderId: dbCart.id,
                        productVariantId: localItem.variantId
                    }
                });

                if (existingDetail) {
                    // Nếu có rồi -> Cộng dồn số lượng
                    await prisma.orderDetail.update({
                        where: { id: existingDetail.id },
                        data: { quantity: existingDetail.quantity + localItem.quantity }
                    });
                } else {
                    // Nếu chưa có -> Tạo mới vào DB
                    await prisma.orderDetail.create({
                        data: {
                            orderId: dbCart.id,
                            productVariantId: localItem.variantId,
                            quantity: localItem.quantity,
                            originalPrice: localItem.price,
                            unitPrice: localItem.price
                        }
                    });
                }
            }
        }

        // 3. Lấy lại giỏ hàng đã gộp hoàn chỉnh để gửi về Frontend
        const finalCart = await prisma.cart.findUnique({
            where: { id: dbCart.id },
            include: {
                orderDetails: {
                    include: { variant: { include: { product: true } } }
                }
            }
        });

        // Format lại dữ liệu cho giống với cấu trúc localStorage của Frontend
        const formattedCart = finalCart.orderDetails.map(detail => ({
            id: detail.variant.productId,
            variantId: detail.productVariantId,
            name: detail.variant.product.name,
            price: detail.unitPrice,
            quantity: detail.quantity,
            // ... map các trường image/size nếu cần ...
            thumbnailUrl: detail.variant.thumbnailUrl, 
            specification: detail.variant.specification
        }));

        res.status(200).json({ mergedCart: formattedCart });

    } catch (error) {
        console.error("Cart Sync Error:", error);
        res.status(500).json({ error: "Failed to sync cart" });
    }
};