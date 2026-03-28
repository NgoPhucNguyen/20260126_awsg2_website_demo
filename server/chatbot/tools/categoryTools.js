import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";

// Get all categories or by parent
export const getCategoriesTool = tool(
    async ({ parentId = null }) => {
        try {
            const categories = await prisma.category.findMany({
                where: parentId ? { parentId: parseInt(parentId) } : { parentId: null },
                include: {
                    children: true,
                    products: { select: { id: true, name: true } },
                },
            });
            return JSON.stringify(categories);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getCategories",
        description: "Lấy danh sách danh mục sản phẩm (hoặc danh mục con nếu có parentId)",
        schema: z.object({
            parentId: z.string().optional().describe("ID danh mục cha (để lấy danh mục con)"),
        }),
    }
);

// Get category details
export const getCategoryDetailsTool = tool(
    async ({ categoryId }) => {
        try {
            const category = await prisma.category.findUnique({
                where: { id: parseInt(categoryId) },
                include: {
                    parent: true,
                    children: true,
                    products: true,
                },
            });
            if (!category) {
                return JSON.stringify({ error: "Danh mục không tìm thấy" });
            }
            return JSON.stringify(category);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getCategoryDetails",
        description: "Lấy thông tin chi tiết danh mục kèm danh mục con và sản phẩm",
        schema: z.object({
            categoryId: z.string().describe("ID danh mục"),
        }),
    }
);

// Get brands
export const getBrandsTool = tool(
    async ({ limit = 50 }) => {
        try {
            const brands = await prisma.brand.findMany({
                include: {
                    products: { select: { id: true, name: true } },
                },
                take: limit,
            });
            return JSON.stringify(brands);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getBrands",
        description: "Lấy danh sách thương hiệu sản phẩm",
        schema: z.object({
            limit: z.number().int().positive().default(50).describe("Số lượng thương hiệu"),
        }),
    }
);
