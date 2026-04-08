// server/chatbot/tools/inventoryTools.js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";

// Check inventory for a product variant
export const checkInventoryTool = tool(
    async ({ productVariantId, warehouseId = null }) => {
        try {
            const where = { productVariantId: parseInt(productVariantId) };
            if (warehouseId) {
                where.warehouseId = warehouseId;
            }

            const inventory = await prisma.inventory.findMany({
                where,
                include: {
                    variant: { include: { product: true } },
                    warehouse: true,
                },
            });

            if (inventory.length === 0) {
                return JSON.stringify({
                    message: "Sản phẩm không có trong kho",
                    totalQuantity: 0,
                });
            }

            const totalQuantity = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
            return JSON.stringify({ inventory, totalQuantity });
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "checkInventory",
        description: "Kiểm tra tồn kho của biến thể sản phẩm (toàn bộ hoặc ở kho cụ thể)",
        schema: z.object({
            productVariantId: z.string().describe("ID biến thể sản phẩm"),
            warehouseId: z.string().optional().describe("ID kho (nếu không, kiểm tra tất cả kho)"),
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
            return JSON.stringify(inventory);
        } catch (error) {
            return JSON.stringify({ error: error.message });
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
            return JSON.stringify(lowStock);
        } catch (error) {
            return JSON.stringify({ error: error.message });
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
