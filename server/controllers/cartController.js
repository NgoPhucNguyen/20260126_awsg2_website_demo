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
            name: detail.variant.product.nameVn,
            price: detail.unitPrice,
            quantity: detail.quantity,
            // ... map các trường image/size nếu cần ...
            image: detail.variant.thumbnailUrl, 
            specification: detail.variant.specification,
            size: detail.variant.specification?.size || detail.variant.specification?.volume || null
        }));

        res.status(200).json({ mergedCart: formattedCart });

    } catch (error) {
        console.error("Cart Sync Error:", error);
        res.status(500).json({ error: "Failed to sync cart" });
    }
};

// ➕ ADD SINGLE ITEM TO DB (Action-Based Sync)
export const addCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { variantId, quantity, price } = req.body;

        // 1. Find or Create DRAFT cart
        let dbCart = await prisma.cart.findFirst({
            where: { customerId: userId, status: 'DRAFT' }
        });

        if (!dbCart) {
            dbCart = await prisma.cart.create({
                data: { customerId: userId, status: 'DRAFT', finalPrice: 0, couponDiscount: 0 }
            });
        }

        // 🌟 FORCE TYPES TO INTEGER TO PREVENT PRISMA CRASHES
        const safeVariantId = Number(variantId);
        const safePrice = Number(price);
        const safeQuantity = Number(quantity);

        // 2. Check if item already exists in the cart
        const existingDetail = await prisma.orderDetail.findFirst({
            where: { orderId: dbCart.id, productVariantId: safeVariantId }
        });

        if (existingDetail) {
            // ✅ ATOMIC INCREMENT
            await prisma.orderDetail.update({
                where: { id: existingDetail.id },
                data: { quantity: { increment: safeQuantity } } 
            });
        } else {
            // ✅ CREATE NEW ITEM
            await prisma.orderDetail.create({
                data: {
                    orderId: dbCart.id,
                    productVariantId: safeVariantId,
                    quantity: safeQuantity,
                    originalPrice: safePrice,
                    unitPrice: safePrice
                }
            });
        }

        res.status(200).json({ message: "Item added successfully" });
    } catch (error) {
        console.error("❌ Add Cart Item Error:", error); // This will tell us if anything else is wrong!
        res.status(500).json({ error: "Failed to add item" });
    }
};

// 🗑️ DELETE ITEM FROM DB
export const removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { variantId } = req.params;

        // 1. Find the user's active cart
        const dbCart = await prisma.cart.findFirst({
            where: { customerId: userId, status: 'DRAFT' }
        });

        if (!dbCart) return res.status(200).json({ message: "Cart not found" });

        // 2. Delete the specific item from the OrderDetail table
        await prisma.orderDetail.deleteMany({
            where: { 
                orderId: dbCart.id, 
                productVariantId: Number(variantId) 
            }
        });

        res.status(200).json({ message: "Item removed from database" });
    } catch (error) {
        console.error("Delete Cart Item Error:", error);
        res.status(500).json({ error: "Failed to delete item" });
    }
};


// 🔄 UPDATE ITEM QUANTITY IN DB (CLEANED & FIXED)
export const updateCartItemQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { variantId, quantity } = req.body; 
        console.log(`\n📥 [BACKEND] Received Update: User: ${userId}, Variant: ${variantId}, New Qty: ${quantity}`); // 🐛 DEBUG LOG

        // 1. Find active cart
        const dbCart = await prisma.cart.findFirst({
            where: { customerId: userId, status: 'DRAFT' }
        });

        if (!dbCart) {
            console.log(`❌ [BACKEND] Active cart not found for user!`);
            return res.status(404).json({ message: "Cart not found" });
        }

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (new Date() - new Date(dbCart.createdAt) > ONE_DAY_MS) {
            console.log(`⚠️ [BACKEND] Cart is expired! Updating status to EXPIRED.`); // 🐛 DEBUG LOG
            await prisma.cart.update({
                where: { id: dbCart.id },
                data: { status: 'EXPIRED' }
            });
            return res.status(400).json({ message: "Cart has expired. Please refresh." });
        }

        console.log(`🛒 [BACKEND] Found valid Cart ID: ${dbCart.id}`); // 🐛 DEBUG LOG

        // 2. Enforce Backend Limit (Security against hackers bypassing the frontend!)
        const safeQuantity = Math.min(5, Math.max(1, quantity));

        // 3. Update the exact quantity in the database
        // 🌟 THE FIX: This is where const updateResult belongs!
        const updateResult = await prisma.orderDetail.updateMany({
            where: { 
                orderId: dbCart.id, 
                productVariantId: Number(variantId) 
            },
            data: { quantity: safeQuantity }
        });
        
        console.log(`📝 [BACKEND] Prisma Update Result: Modified ${updateResult.count} rows`); // 🐛 DEBUG LOG

        if (updateResult.count === 0) {
            console.log(`⚠️ [BACKEND] Warning: Found the cart, but could not find Variant ${variantId} inside it!`); // 🐛 DEBUG LOG
        }

        res.status(200).json({ message: "Quantity updated" });
    } catch (error) {
        console.error("❌ [BACKEND] Update Quantity Error:", error);
        res.status(500).json({ error: "Failed to update quantity" });
    }
};