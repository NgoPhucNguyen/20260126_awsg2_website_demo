// server/chatbot/tools/productTools.js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";
import EmbeddingClient from '../core/embedding_model.js'; 

const embeddingClient = new EmbeddingClient();

// 🚀 TÌM KIẾM LAI (HYBRID SEARCH: Bổ sung quét Category + Cấm Ảo Giác)
export const searchProductsTool = tool(
    async ({ keyword, limit = 5 }) => {
        try {
            // 1. Chuyển từ khóa thành Vector
            const queryEmbedding = await embeddingClient.createEmbedding(keyword);
            const vectorLiteral = `[${queryEmbedding.join(',')}]`;
            
            // 2. Tạo chuỗi cho tìm kiếm từ khóa ILIKE (tương đối)
            const searchKeyword = `%${keyword}%`;

            // 3. Chạy lệnh SQL trực tiếp (Raw Query)
            // 🚀 ĐÃ THÊM BẢNG CATEGORY (c) ĐỂ TÌM "KEM DƯỠNG", "TẨY TRANG"...
            const searchResults = await prisma.$queryRawUnsafe(`
                SELECT 
                    p.id, 
                    p.name_vn as "nameVn", 
                    p.description,
                    p.ingredient,
                    p.skin_type as "skinType",
                    b.name as brand_name,
                    c.name_vn as category_name,
                    1 - (pv.embedding <=> $1::vector) as similarity
                FROM product_vectors pv
                JOIN product p ON pv.product_id = p.id
                LEFT JOIN brand b ON p.brand_id = b.id
                LEFT JOIN category c ON p.category_id = c.id
                WHERE p.is_active = true 
                  AND (
                      b.name ILIKE $2 
                      OR p.name_vn ILIKE $2 
                      OR c.name_vn ILIKE $2 
                      OR 1 - (pv.embedding <=> $1::vector) > 0.4
                  )
                ORDER BY 
                    CASE WHEN c.name_vn ILIKE $2 THEN 1 ELSE 0 END DESC,
                    CASE WHEN b.name ILIKE $2 THEN 1 ELSE 0 END DESC,
                    CASE WHEN p.name_vn ILIKE $2 THEN 1 ELSE 0 END DESC,
                    similarity DESC
                LIMIT $3;
            `, vectorLiteral, searchKeyword, limit);

            // 4. Nếu không có kết quả nào thỏa mãn
            if (!searchResults || searchResults.length === 0) {
                return JSON.stringify({ 
                    error: "SYSTEM_NO_DATA", 
                    message: `Hệ thống KHÔNG BÁN sản phẩm hoặc thương hiệu: '${keyword}'. Vui lòng xin lỗi và gợi ý khách hàng sản phẩm khác.` 
                });
            }

            // 5. Lấy thêm thông tin Giá và Ảnh từ Variant
            const productIds = searchResults.map(r => r.id);
            const variants = await prisma.productVariant.findMany({
                where: { productId: { in: productIds } },
                select: {
                    id: true, 
                    productId: true, 
                    unitPrice: true, 
                    thumbnailUrl: true,
                    promotions: { 
                        include: { promotion: true } 
                    },
                    inventories: {select : { quantity: true}}            
                }
            });

            // 6. Format dữ liệu trả về cho LLM đọc
            const formattedProducts = searchResults.map(p => {
                const pVariants = variants.filter(v => v.productId === p.id);
                const defaultVariant = pVariants.length > 0 ? pVariants[0] : null;
                const minPrice = pVariants.length > 0 ? Math.min(...pVariants.map(v => v.unitPrice)) : null;
                
                if (!defaultVariant || minPrice === null) return null; 
                
                // 🚀 TÍNH TỔNG TỒN KHO CỦA SẢN PHẨM NÀY
                const totalStock = pVariants.reduce((sum, v) => {
                    const variantStock = v.inventories?.reduce((s, i) => s + i.quantity, 0) || 0;
                    return sum + variantStock;
                }, 0);

                // 🚀 THAY ĐỔI CÁCH HIỂN THỊ ID ĐỂ ĐÁNH LỪA AI
                const idTag = totalStock > 0 ? `[ID: ${p.id}]` : `(Mã: ${p.id} - ĐÃ HẾT HÀNG)`;
                const stockStatus = totalStock > 0 ? "CÒN HÀNG" : "ĐÃ HẾT HÀNG";

                // 🚀 BƯỚC TÍNH TOÁN GIÁ NGAY TRONG BACKEND (KHÔNG GIAO CHO AI)
                let priceInfo = "";
                const now = new Date();
                
                const activePromos = defaultVariant.promotions?.filter(prm => {
                    const promo = prm.promotion;
                    return promo.startTime <= now && promo.endTime >= now;
                });

                if (activePromos && activePromos.length > 0) {
                    const currentPromo = activePromos[0].promotion;
                    let finalPrice = minPrice;

                    if (currentPromo.type === "PERCENTAGE") {
                        // Tính giá sau khi giảm %
                        finalPrice = minPrice - (minPrice * currentPromo.value / 100);
                        priceInfo = `Giá gốc ${minPrice.toLocaleString('vi-VN')} VND, ĐANG GIẢM ${currentPromo.value}%, CHỈ CÒN ${finalPrice.toLocaleString('vi-VN')} VND`;
                    } else if (currentPromo.type === "FIXED") {
                        // Tính giá sau khi trừ tiền mặt
                        finalPrice = minPrice - currentPromo.value;
                        priceInfo = `Giá gốc ${minPrice.toLocaleString('vi-VN')} VND, ĐANG GIẢM ${currentPromo.value.toLocaleString('vi-VN')} VND, CHỈ CÒN ${finalPrice.toLocaleString('vi-VN')} VND`;
                    }
                } else {
                    priceInfo = `Giá: ${minPrice.toLocaleString('vi-VN')} VND (Không có khuyến mãi)`;
                }

                const skin = p.skinType || "Mọi loại da";
                const desc = p.description?.substring(0, 100) || "Không có mô tả";

                // 🚀 DÙNG idTag mới ở đây
                return `- ${p.nameVn} ${idTag} - ${priceInfo}. (Tình trạng: ${stockStatus}). (Phù hợp: ${skin}...)`;
            }).filter(Boolean);

            // Ghép danh sách thành một đoạn văn bản duy nhất
            const resultText = formattedProducts.join("\n\n");
            
            // CẬP NHẬT LỆNH: Cấm dùng thẻ ID cho hàng hết
            return `ĐÂY LÀ KẾT QUẢ TỪ DATABASE:\n\n${resultText}\n\nLƯU Ý DÀNH CHO AI:\n- Nếu sản phẩm ghi "ĐÃ HẾT HÀNG", bạn TUYỆT ĐỐI KHÔNG ĐƯỢC gắn thẻ [ID: X] vào câu trả lời, chỉ cần nêu tên và xin lỗi khách.\n- CHỈ dùng thẻ [ID: X] cho các sản phẩm "CÒN HÀNG" mà bạn muốn gợi ý thay thế.`;

        } catch (error) {
            console.error("Hybrid Search Error:", error);
            return "Lỗi tìm kiếm trong cơ sở dữ liệu. Báo khách hàng chờ ít phút.";
        }
    },
    {
        name: "searchProducts",
        description: "BẮT BUỘC sử dụng công cụ này để tìm kiếm thông tin mỹ phẩm, giá cả và hình ảnh khi khách hàng hỏi về một sản phẩm, thương hiệu hoặc nhu cầu làm đẹp.",
        schema: z.object({
            keyword: z.string().describe("Từ khóa, tên sản phẩm, thương hiệu hoặc nhu cầu của khách (VD: Cocoon, kem dưỡng, trị mụn)"),
            limit: z.number().int().positive().default(5).describe("Số lượng kết quả"),
        }),
    }
);

// Get detailed product info
export const getProductInfoTool = tool(
    async ({ productId }) => {
        try {
            const product = await prisma.product.findUnique({
                where: { id: parseInt(productId) },
                include: {
                    brand: true,
                    category: true,
                    variants: {
                        include: {
                            images: { orderBy: { displayOrder: "asc" } },
                            promotions: { include: { promotion: true } },
                        },
                    },
                },
            });
            if (!product) {
                return JSON.stringify({ error: "Sản phẩm không tìm thấy" });
            }
            return JSON.stringify(product);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getProductInfo",
        description: "Lấy thông tin chi tiết của sản phẩm bao gồm biến thể, hình ảnh, khuyến mãi",
        schema: z.object({
            productId: z.string().describe("ID của sản phẩm cần lấy thông tin"),
        }),
    }
);

// Get products by category
export const getProductsByCategoryTool = tool(
    async ({ categoryId, limit = 20 }) => {
        try {
            const products = await prisma.product.findMany({
                where: { categoryId: parseInt(categoryId), isActive: true },
                include: {
                    brand: true,
                    category: true,
                    variants: {
                        take: 1,
                        include: { images: { take: 1 } },
                    },
                },
                take: limit,
            });
            return JSON.stringify(products);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getProductsByCategory",
        description: "Lấy danh sách sản phẩm theo danh mục",
        schema: z.object({
            categoryId: z.string().describe("ID danh mục sản phẩm"),
            limit: z.number().int().positive().default(20).describe("Số lượng sản phẩm"),
        }),
    }
);

// Get product variant info
export const getProductVariantTool = tool(
    async ({ variantId }) => {
        try {
            const variant = await prisma.productVariant.findUnique({
                where: { id: parseInt(variantId) },
                include: {
                    product: true,
                    images: { orderBy: { displayOrder: "asc" } },
                    promotions: { include: { promotion: true } },
                },
            });
            if (!variant) {
                return JSON.stringify({ error: "Biến thể sản phẩm không tìm thấy" });
            }
            return JSON.stringify(variant);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getProductVariant",
        description: "Lấy thông tin chi tiết biến thể sản phẩm (kích cỡ, màu, giá)",
        schema: z.object({
            variantId: z.string().describe("ID biến thể sản phẩm"),
        }),
    }
);