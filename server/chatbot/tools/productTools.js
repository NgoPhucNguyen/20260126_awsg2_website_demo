import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";

// Search products by name or keyword
export const searchProductsTool = tool(
    async ({ keyword, limit = 10 }) => {
        try {
            const products = await prisma.product.findMany({
                where: {
                    OR: [
                        { name: { contains: keyword, mode: "insensitive" } },
                        { nameVn: { contains: keyword, mode: "insensitive" } },
                        { description: { contains: keyword, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    nameVn: true,
                    brand: { select: { name: true } },
                    category: { select: { name: true, nameVn: true } },
                    description: true,
                },
                take: limit,
            });
            return JSON.stringify(products);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "searchProducts",
        description: "Tìm kiếm sản phẩm dựa theo từ khóa (tên tiếng Anh, tiếng Việt hoặc mô tả)",
        schema: z.object({
            keyword: z.string().describe("Từ khóa tìm kiếm"),
            limit: z.number().int().positive().default(10).describe("Số lượng kết quả trả về"),
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