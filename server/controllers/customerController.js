// server/controllers/customerController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Lấy danh sách khách hàng cho trang Admin Customer
export const getAllCustomers = async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            // 🛡️ SECURITY: Only select safe fields! No passwords!
            select: {
                id: true,
                accountName: true,
                mail: true,
                tier: true,
                isActive: true,
                createdAt: true,
                
                // 🚀 BẢN NÂNG CẤP: Đếm số lượng đơn hàng (LOẠI BỎ ĐƠN NHÁP VÀ HẾT HẠN)
                _count: {
                    select: { 
                        carts: {
                            where: {
                                status: { notIn: ['DRAFT', 'EXPIRED'] }
                            }
                        } 
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' // Newest users first
            }
        });
        
        res.json(customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
};