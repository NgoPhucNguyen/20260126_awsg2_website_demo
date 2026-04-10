// controllers/orderAdminController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. ADMIN LẤY TẤT CẢ ĐƠN
export const getAllOrdersAdmin = async (req, res) => {
    try {
        const orders = await prisma.cart.findMany({
            where: { status: { notIn: ['DRAFT', 'EXPIRED'] } }, 
            include: {
                customer: { select: { firstName: true, lastName: true, mail: true, phoneNumber: true, accountName: true } },
                orderDetails: {
                    include: {
                        variant: { include: { product: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
    } catch (error) {
        console.error("Lỗi lấy danh sách đơn Admin:", error);
        res.status(500).json({ message: "Lỗi hệ thống." });
    }
};

// 2. ADMIN CẬP NHẬT TRẠNG THÁI (STATUS)
export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    try {
        const order = await prisma.cart.findUnique({ where: { id } });
        
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

        // 🚀 BỔ SUNG CHẶN DELIVERED
        if (order.status === 'DELIVERED') {
            return res.status(400).json({ message: "Đơn hàng đã giao thành công, không thể thay đổi trạng thái." });
        }
        
        if (order.status === 'CANCELLED') return res.status(400).json({ message: "Đơn hàng đã bị hủy, không thể cập nhật." });

        let updateData = { status };
        
        // Tự động chốt tiền nếu giao thành công đơn COD
        if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
            updateData.paymentStatus = 'PAID';
        }

        const updatedOrder = await prisma.cart.update({
            where: { id },
            data: updateData
        });

        res.json({ message: `Cập nhật trạng thái thành ${status} thành công.`, order: updatedOrder });

    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống." });
    }
};