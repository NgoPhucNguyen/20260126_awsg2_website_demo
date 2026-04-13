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
                    // 🚀 TỐI ƯU: Chỉ lấy số lượng đếm, không kéo nguyên mảng data sản phẩm
                    _count: { select: { products: true } }
                },
            });

            if (!categories || categories.length === 0) {
                return "Không tìm thấy danh mục nào.";
            }

            // 🚀 ÉP TEXT ĐỂ TRÁNH ẢO GIÁC JSON
            const formattedCats = categories.map(c => {
                const childNames = c.children.length > 0 
                    ? ` (Gồm các danh mục con: ${c.children.map(child => child.nameVn).join(', ')})` 
                    : "";
                return `- Danh mục: ${c.nameVn} [Mã: ${c.id}] - Có ${c._count.products} sản phẩm${childNames}`;
            });

            return `DANH SÁCH DANH MỤC:\n${formattedCats.join('\n')}\n\nLƯU Ý CHO AI: Nếu khách muốn xem sản phẩm, hãy dùng công cụ searchProducts.`;
        } catch (error) {
            return `Lỗi hệ thống: ${error.message}`;
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
                    _count: { select: { products: true } }
                },
            });
            if (!category) {
                return "Danh mục không tìm thấy.";
            }

            const parentTxt = category.parent ? `Nằm trong danh mục cha: ${category.parent.nameVn}` : "Là danh mục gốc";
            const childrenTxt = category.children.length > 0 ? `Danh mục con: ${category.children.map(c => c.nameVn).join(', ')}` : "Không có danh mục con";

            return `THÔNG TIN DANH MỤC:\n- Tên: ${category.nameVn} [Mã: ${category.id}]\n- Vị trí: ${parentTxt}\n- ${childrenTxt}\n- Tổng số sản phẩm đang có: ${category._count.products}`;
        } catch (error) {
            return `Lỗi hệ thống: ${error.message}`;
        }
    },
    {
        name: "getCategoryDetails",
        description: "Lấy thông tin chi tiết danh mục kèm danh mục con và số lượng sản phẩm",
        schema: z.object({
            categoryId: z.string().describe("ID danh mục"),
        }),
    }
);

//Customer or Admin?
// Get brands
export const getBrandsTool = tool(
    async ({ limit = 50 }) => {
        try {
            const brands = await prisma.brand.findMany({
                include: {
                    // 🚀 TỐI ƯU: Đếm số lượng, không lấy danh sách sản phẩm dài dằng dặc
                    _count: { select: { products: true } }
                },
                take: limit,
            });

            if (!brands || brands.length === 0) {
                return "Không tìm thấy thương hiệu nào.";
            }

            const formattedBrands = brands.map(b => 
                `- ${b.name} (Có ${b._count.products} sản phẩm)`
            );

            // 🚀 ÉP AI VÀO THẾ BÍ: Không cho nó đường thoát để bịa đặt
            const resultText = `
                [BÁO CÁO NỘI BỘ - TUYỆT MẬT]
                - Tổng số hãng: ${brands.length} (CẤM NÓI SỐ KHÁC)
                - Danh sách hãng đang có: ${brands.map(b => b.name).join(", ")}
                - CẢNH BÁO: Cửa hàng KHÔNG CÓ Dior, Chanel, Sulwhasoo, Estee Lauder. 
                - YÊU CẦU: Trả lời khách đúng số ${brands.length} và liệt kê 3-5 hãng từ danh sách trên.
            `;
            return resultText;
        } catch (error) {
            return `Lỗi hệ thống: ${error.message}`;
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