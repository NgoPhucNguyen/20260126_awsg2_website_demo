// server/chatbot/tools/productTools.js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";

// Search products by name or keyword
export const searchProductsTool = tool(
    async ({ keyword, limit = 5 }) => {
        try {
        const products = await prisma.product.findMany({
            where: {
            isActive: true,
            OR: [
                { nameVn: { contains: keyword, mode: "insensitive" } },
                { description: { contains: keyword, mode: "insensitive" } },
            ],
            },
            select: {
            id: true,
            nameVn: true,
            description: true,
            brand: { select: { name: true } },
            // Lấy Variant đầu tiên để có giá và ảnh hiển thị lên Card
            variants: {
                take: 1,
                select: {
                unitPrice: true,
                thumbnailUrl: true,
                }
            }
            },
            take: limit,
        });

        // Format lại dữ liệu gọn gàng để trả về cho LLM
        const formattedProducts = products.map(p => ({
            id: p.id,
            name: p.nameVn,
            brand: p.brand?.name,
            price: p.variants[0]?.unitPrice || "Liên hệ",
            imageUrl: p.variants[0]?.thumbnailUrl || "",
            description: p.description?.substring(0, 100) + "..." // Cắt ngắn mô tả cho gọn
        }));

        return JSON.stringify(formattedProducts);
        } catch (error) {
        return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "searchProducts",
        description: "Tìm kiếm sản phẩm mỹ phẩm kèm giá và ảnh để tư vấn cho khách hàng.",
        schema: z.object({
        keyword: z.string().describe("Từ khóa hoặc tên sản phẩm"),
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