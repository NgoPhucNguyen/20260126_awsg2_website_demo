// server/controllers/adminInventoryController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🟢 1. LẤY DỮ LIỆU TỒN KHO CÓ PHÂN TRANG (PAGINATION)
export const getInventoryAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const status = req.query.status; 
        
        const skip = (page - 1) * limit;

        const whereClause = {
            isActive: status !== 'archived',
        };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { nameVn: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                skip: skip,
                take: limit,
                include: {
                    category: true,
                    variants: {
                        include: { inventories: true, images: true }
                    }
                },
                orderBy: { id: 'desc' }
            }),
            prisma.product.count({ where: whereClause })
        ]);

        res.json({
            data: products,
            meta: {
                total: totalCount,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error("Lỗi getInventoryAdmin:", error);
        res.status(500).json({ error: "Lỗi Server" });
    }
};

// 🟢 2. LẤY THỐNG KÊ (STATS) - TRUY VẤN SIÊU NHẸ
export const getInventoryStats = async (req, res) => {
    try {
        // Đếm tổng sản phẩm đang bán (isActive: true)
        const totalActive = await prisma.product.count({ where: { isActive: true } });

        // Đếm số lượng Variant (Sản phẩm cụ thể) có tồn kho = 0
        const outOfStockCount = await prisma.productVariant.count({
            where: {
                product: { isActive: true }, // Phải thuộc sản phẩm đang bán
                inventories: {
                    some: { quantity: { equals: 0 } }
                }
            }
        });

        // Đếm số lượng Variant có tồn kho từ 1 đến 9
        const lowStockCount = await prisma.productVariant.count({
            where: {
                product: { isActive: true },
                inventories: {
                    some: { quantity: { gt: 0, lt: 10 } }
                }
            }
        });

        res.json({
            total: totalActive,
            outOfStock: outOfStockCount,
            lowStock: lowStockCount
        });
    } catch (error) {
        console.error("Lỗi getInventoryStats:", error);
        res.status(500).json({ error: "Lỗi Server khi tải thống kê" });
    }
};