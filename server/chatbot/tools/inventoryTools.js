import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";

// Check inventory for a product or specific variant
export const checkInventoryTool = tool(
    async ({ productId, productVariantId, warehouseId = null }) => {
        try {
            if (!productId && !productVariantId) {
                return "Thiếu ID sản phẩm hoặc ID biến thể.";
            }

            let variants = [];

            // 1. Lấy thông tin biến thể dựa theo schema
            if (productVariantId) {
                const v = await prisma.productVariant.findUnique({
                    where: { id: parseInt(productVariantId) },
                    include: { inventories: true, product: true }
                });
                if (v) variants = [v];
            } else if (productId) {
                variants = await prisma.productVariant.findMany({
                    where: { productId: parseInt(productId) },
                    include: { inventories: true, product: true }
                });
            }

            // 2. Nếu không tìm thấy biến thể nào
            if (!variants || variants.length === 0) {
                return "Sản phẩm này hiện ĐÃ HẾT HÀNG. Vui lòng xin lỗi và gợi ý khách hàng sản phẩm khác tương tự.";
            }

            const resultLines = [];
            let hasStock = false;

            // 3. Xử lý tồn kho cho TỪNG BIẾN THỂ (Không cộng dồn lung tung)
            for (const v of variants) {
                // Lọc theo kho nếu có yêu cầu
                const invs = warehouseId 
                    ? v.inventories.filter(i => i.warehouseId === warehouseId) 
                    : v.inventories;
                
                // Số lượng của riêng biến thể này
                const qty = invs.reduce((sum, i) => sum + i.quantity, 0);
                
                // Lấy tên phân loại từ trường JSON specification hoặc mã sku
                const specString = v.specification ? JSON.stringify(v.specification).replace(/["{}]/g, '') : v.sku;

                if (qty > 0) {
                    hasStock = true;
                    resultLines.push(`- Phân loại [${specString}]: CÒN ${qty} sản phẩm`);
                } else {
                    resultLines.push(`- Phân loại [${specString}]: HẾT HÀNG`);
                }
            }

            // 4. Nếu toàn bộ các phân loại đều hết hàng
            if (!hasStock) {
                return "Tất cả các phân loại của sản phẩm này ĐÃ HẾT HÀNG. Bạn CẦN PHẢI xin lỗi khách và gợi ý sản phẩm khác có công dụng tương tự.";
            }

            // 5. Trả về cho AI đọc
            return `TÌNH TRẠNG TỒN KHO CHI TIẾT TỪNG PHÂN LOẠI:\n${resultLines.join('\n')}\n\nLƯU Ý CHO AI: Hãy báo cho khách biết chính xác phân loại nào đang còn hàng và còn số lượng bao nhiêu. Không cần nhắc đến các loại đã hết hàng trừ khi khách hỏi.`;

        } catch (error) {
            return `Lỗi kiểm tra tồn kho: ${error.message}`;
        }
    },
    {
        name: "checkInventory",
        description: "Kiểm tra tồn kho thực tế. Dùng productId để quét tất cả biến thể của sản phẩm, hoặc productVariantId để kiểm tra 1 loại. BẮT BUỘC gọi hàm này khi khách hỏi còn hàng không.",
        schema: z.object({
            productId: z.string().optional().describe("ID của sản phẩm (nếu khách hỏi chung chung)"),
            productVariantId: z.string().optional().describe("ID của biến thể cụ thể"),
            warehouseId: z.string().optional().describe("ID kho cụ thể"),
        }),
    }
);

// Get inventory by warehouse
export const getInventoryByWarehouseTool = tool(
    async ({ warehouseId }) => {
        try {
            const inventory = await prisma.inventory.findMany({
                where: { warehouseId },
                include: {
                    variant: { include: { product: true } },
                    warehouse: true,
                },
            });

            if (!inventory || inventory.length === 0) {
                return "Kho này hiện không có sản phẩm nào hoặc không tồn tại.";
            }

            const wName = inventory[0].warehouse.name;
            const formatted = inventory.map(inv => {
                const prodName = inv.variant?.product?.nameVn || "Sản phẩm ẩn";
                return `- ${prodName} [ID: ${inv.productVariantId}] - Số lượng: ${inv.quantity}`;
            });

            return `BÁO CÁO TỒN KHO TẠI [${wName}]:\n${formatted.join('\n')}`;
        } catch (error) {
            return `Lỗi lấy tồn kho theo kho: ${error.message}`;
        }
    },
    {
        name: "getInventoryByWarehouse",
        description: "Lấy danh sách tồn kho của một kho cụ thể",
        schema: z.object({
            warehouseId: z.string().describe("ID kho"),
        }),
    }
);

// Get low stock items
export const getLowStockItemsTool = tool(
    async ({ threshold = 10, limit = 50 }) => {
        try {
            const lowStock = await prisma.inventory.findMany({
                where: {
                    quantity: { lte: threshold },
                },
                include: {
                    variant: { include: { product: true } },
                    warehouse: true,
                },
                take: limit,
                orderBy: { quantity: "asc" },
            });

            if (!lowStock || lowStock.length === 0) {
                return `Tuyệt vời! Hiện không có sản phẩm nào có tồn kho dưới ${threshold}.`;
            }

            const formatted = lowStock.map(item => {
                const prodName = item.variant?.product?.nameVn || "Sản phẩm ẩn";
                const wName = item.warehouse?.name || "Kho không xác định";
                return `- ${prodName} [ID Biến thể: ${item.productVariantId}] - CÒN LẠI: ${item.quantity} (Tại: ${wName})`;
            });

            return `🚨 CẢNH BÁO SẮP HẾT HÀNG (Dưới ${threshold} sản phẩm):\n\n${formatted.join('\n')}\n\nLƯU Ý DÀNH CHO ADMIN: Báo cáo rõ tên sản phẩm, số lượng còn và tên kho tương ứng.`;
        } catch (error) {
            return `Lỗi lấy danh sách sắp hết hàng: ${error.message}`;
        }
    },
    {
        name: "getLowStockItems",
        description: "Lấy danh sách sản phẩm có tồn kho dưới ngưỡng (cảnh báo hết hàng)",
        schema: z.object({
            threshold: z.number().int().positive().default(10).describe("Ngưỡng tồn kho thấp"),
            limit: z.number().int().positive().default(50).describe("Số mục trả về"),
        }),
    }
);