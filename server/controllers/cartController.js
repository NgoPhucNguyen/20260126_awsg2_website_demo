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
            const now = new Date();
            for (const localItem of localCart) {
                // 🔍 NEW: Look up the variant AND its active promotions
                const variant = await prisma.productVariant.findUnique({
                    where: { id: Number(localItem.variantId) },
                    include: {
                        promotions: {
                            include: { promotion: true },
                            where: {
                                promotion: {
                                    startTime: { lte: now },
                                    endTime: { gte: now }
                                }
                            }
                        }
                    }
                });

                if (!variant) continue;

                // 💰 Calculate the REAL current price
                let currentPrice = variant.unitPrice;
                if (variant.promotions.length > 0) {
                    const promo = variant.promotions[0].promotion;
                    const discount = promo.type === 'PERCENTAGE' 
                        ? (currentPrice * promo.value) / 100 
                        : promo.value;
                    currentPrice = Math.max(0, currentPrice - discount);
                }
                // 🌟 THE FIX: Use upsert logic to either update existing item or create new one
                const existingDetail = await prisma.orderDetail.findFirst({
                    where: { orderId: dbCart.id, productVariantId: variant.id }
                });
                // 🐛 BUG FIX: This is where the actual database update happens! We either increment quantity or create a new record.
                if (existingDetail) {
                    await prisma.orderDetail.update({
                        where: { id: existingDetail.id },
                        data: { 
                            quantity: existingDetail.quantity + localItem.quantity,
                            unitPrice: currentPrice // ✅ Sync to the LATEST price
                        }
                    });
                } else {
                    await prisma.orderDetail.create({
                        data: {
                            orderId: dbCart.id,
                            productVariantId: variant.id,
                            quantity: localItem.quantity,
                            originalPrice: variant.unitPrice, // 👈 Original base price
                            unitPrice: currentPrice           // 👈 Actual price user pays
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
            nameVn: detail.variant.product.nameVn || detail.variant.product.name,
            // Price logic: We want to show the price that the user is actually paying (after promotion), not the original price
            price: detail.unitPrice,
            originalPrice: detail.originalPrice,
            isSale: detail.unitPrice < detail.originalPrice,
            quantity: detail.quantity,
            // For simplicity, we take the first image of the variant as the thumbnail
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
        const { variantId, quantity } = req.body;
        
        const safeVariantId = Number(variantId);
        const safeQuantity = Number(quantity);
        
        // 
        const stockData = await prisma.inventory.aggregate({
            _sum: { quantity: true },
            where: { productVariantId: safeVariantId }
        });
        const totalStock = stockData._sum.quantity || 0; // Nếu không có trong kho thì = 0
        
        // 1. Kiểm tra tồn kho trước khi thêm
        let dbCart = await prisma.cart.findFirst({
            where: { customerId: userId, status: 'DRAFT' },
            include: { orderDetails: true }
        });

        if (!dbCart) {
            dbCart = await prisma.cart.create({
                data: { customerId: userId, status: 'DRAFT', finalPrice: 0, couponDiscount: 0 },
                include: { orderDetails: true }
            });
        }
        
        const existingDetail = dbCart.orderDetails.find(item => item.productVariantId === safeVariantId);
        const currentCartQty = existingDetail ? existingDetail.quantity : 0;
        const requestedTotalQty = currentCartQty + safeQuantity;

        // 🚀 CHẶN NGAY NẾU VƯỢT QUÁ TỒN KHO
        if (requestedTotalQty > totalStock) {
            return res.status(400).json({ 
                message: `Rất tiếc, sản phẩm này chỉ còn ${totalStock} chiếc trong kho.` 
            });
        }

        const variant = await prisma.productVariant.findUnique({
            where: { id: safeVariantId },
            include: {
                promotions: {
                    include: { promotion: true },
                    where: { promotion: { startTime: { lte: new Date() }, endTime: { gte: new Date() } } }
                }
            }
        });

        if (!variant) return res.status(404).json({ error: "Product not found" });

        let realPrice = variant.unitPrice;
        if (variant.promotions.length > 0) {
            const promo = variant.promotions[0].promotion;
            const discount = promo.type === 'PERCENTAGE' ? (realPrice * promo.value) / 100 : promo.value;
            realPrice = realPrice - discount;
        }

        if (existingDetail) {
            await prisma.orderDetail.update({
                where: { id: existingDetail.id },
                data: { 
                    quantity: { increment: safeQuantity },
                    unitPrice: realPrice
            } 
            });
        } else {
            // ✅ CREATE NEW ITEM
            await prisma.orderDetail.create({
                data: {
                    orderId: dbCart.id,
                    productVariantId: safeVariantId,
                    quantity: safeQuantity,
                    originalPrice: variant.unitPrice,
                    unitPrice: realPrice
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

        const safeVariantId = Number(variantId);
        const requestedQuantity = Number(quantity);

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
        
        // Check stock availability BEFORE updating quantity
        const stockData = await prisma.inventory.aggregate({
            _sum: { quantity: true },
            where: { productVariantId: safeVariantId }
        });
        const totalStock = stockData._sum.quantity || 0;

        if (requestedQuantity > totalStock) {
            return res.status(400).json({ 
                message: `Không thể tăng thêm. Sản phẩm chỉ còn ${totalStock} chiếc trong kho.` 
            });
        }

        // 2. Enforce Backend Limit (Cực kỳ quan trọng: Lấy Min của 5, Tổng kho, và số lượng khách yêu cầu)
        const safeQuantity = Math.min(5, totalStock, Math.max(1, requestedQuantity));
        // ========================================================

        // 3. Update the exact quantity in the database
        const updateResult = await prisma.orderDetail.updateMany({
            where: { 
                orderId: dbCart.id, 
                productVariantId: safeVariantId 
            },
            data: { quantity: safeQuantity }
        });
        
        console.log(`📝 [BACKEND] Prisma Update Result: Modified ${updateResult.count} rows`); 

        if (updateResult.count === 0) {
            console.log(`⚠️ [BACKEND] Warning: Found the cart, but could not find Variant ${variantId} inside it!`); 
        }

        res.status(200).json({ message: "Quantity updated" });
    } catch (error) {
        console.error("❌ [BACKEND] Update Quantity Error:", error);
        res.status(500).json({ error: "Failed to update quantity" });
    }
};



export const getCustomerCoupons = async (req, res) => {
    try {
        // Lấy ID của khách hàng đang đăng nhập từ Middleware (Giả sử là req.user.id)
        // Lưu ý: Middleware xác thực (verifyToken) của bạn phải được chạy trước hàm này
        const customerId = req.user?.id;

        if (!customerId) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để xem ví Voucher." });
        }

        const myVouchers = await prisma.couponUsage.findMany({
            where: {
                customerId: customerId,
                status: 'ACTIVE',       // Chỉ lấy mã đang kích hoạt
                remaining: { gt: 0 },   // Phải còn ít nhất 1 lượt sử dụng
                coupon: {
                    expireAt: { gt: new Date() } // Mã chưa qua thời gian hết hạn
                }
            },
            include: {
                coupon: true // Kéo theo toàn bộ thông tin gốc của Coupon (code, type, value, expireAt...)
            },
            orderBy: {
                coupon: {
                    expireAt: 'asc' // Sắp xếp: Mã nào sắp hết hạn thì đẩy lên đầu để ưu tiên dùng trước
                }
            }
        });

        res.json(myVouchers);
    } catch (error) {
        console.error("[ERROR] getCustomerCoupons:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tải ví Voucher." });
    }
};
