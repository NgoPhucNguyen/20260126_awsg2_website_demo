// controllers/customerOrderController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. KHÁCH HÀNG XEM LỊCH SỬ ĐƠN
export const getMyOrders = async (req, res) => {
    const customerId = req.user?.id;

    if (!customerId) return res.status(401).json({ message: "Vui lòng đăng nhập để xem lịch sử." });

    try {
        const orders = await prisma.cart.findMany({
            where: {
                customerId: customerId,
                status: { notIn: ['DRAFT', 'EXPIRED'] } 
            },
            include: {
                mainCoupon: true,
                shippingCoupon: true,
                orderDetails: {
                    include: {
                        variant: { include: { product: true } },
                        promotion: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(orders);
    } catch (error) {
        console.error("[ERROR] getMyOrders:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tải lịch sử mua hàng." });
    }
};

// 2. KHÁCH HÀNG TỰ HỦY ĐƠN
export const cancelOrder = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user?.id || req.user?.userId; 
    const userRole = req.user?.role; 

    if (!currentUserId) return res.status(401).json({ message: "Vui lòng đăng nhập." });

    try {
        const order = await prisma.cart.findUnique({
            where: { id },
            include: { orderDetails: true }
        });

        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

        const isAdmin = userRole === 5150 || userRole === 'Admin' || userRole === 'ADMIN';

        // 🚀 FIX LỖI 403: So sánh chuỗi UUID trực tiếp
        if (!isAdmin && String(order.customerId).trim() !== String(currentUserId).trim()) {
            return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này." });
        }

        if (order.status !== 'PENDING') {
            return res.status(400).json({ message: "Không thể hủy đơn hàng đã được xử lý hoặc đang giao." });
        }

        if (!isAdmin) {
            const now = Date.now(); 
            const orderTime = new Date(order.createdAt).getTime();
            const diffInHours = (now - orderTime) / (1000 * 60 * 60);
            // 🚩 LOG THẦN THÁNH ĐỂ DEBUG
            console.log("=== DEBUG HỦY ĐƠN ===");
            console.log("Giờ Server hiện tại (VN):", new Date(now).toLocaleString("vi-VN"));
            console.log("Giờ Đơn hàng trong DB (UTC/VN):", order.createdAt);
            console.log("Giờ Đơn hàng sau khi parse Date:", new Date(orderTime).toLocaleString("vi-VN"));
            console.log("Chênh lệch (miliseconds):", now - orderTime);
            console.log("Chênh lệch (hours):", (now - orderTime) / (1000 * 60 * 60));
            console.log(`[DEBUG] Giờ hiện tại: ${now}, Giờ đơn: ${orderTime}, Diff: ${diffInHours}`);
            if (diffInHours > 2) {
                return res.status(400).json({ message: "Đã quá 2 tiếng. Vui lòng liên hệ Admin để được hỗ trợ." });
            }
        }

        await prisma.$transaction(async (tx) => {
            for (const item of order.orderDetails) {
                const inventory = await tx.inventory.findFirst({
                    where: { productVariantId: item.productVariantId }
                });
                if (inventory) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: { quantity: { increment: item.quantity } }
                    });
                }
            }

            if (order.couponId) {
                const usage = await tx.couponUsage.findFirst({
                    where: { couponId: order.couponId, customerId: order.customerId }
                });
                if (usage) {
                    await tx.couponUsage.update({
                        where: { id: usage.id },
                        data: { remaining: { increment: 1 }, status: 'ACTIVE' }
                    });
                }
            }

            if (order.shippingCouponId) {
                const shippingUsage = await tx.couponUsage.findFirst({
                    where: { couponId: order.shippingCouponId, customerId: order.customerId }
                });
                if (shippingUsage) {
                    await tx.couponUsage.update({
                        where: { id: shippingUsage.id },
                        data: { remaining: { increment: 1 }, status: 'ACTIVE' }
                    });
                }
            }

            let newPaymentStatus = 'FAILED'; 
            if (order.paymentStatus === 'PAID' && order.paymentMethod === 'VNPAY') {
                newPaymentStatus = 'REFUNDING'; 
            }

            await tx.cart.update({
                where: { id },
                data: { status: 'CANCELLED', paymentStatus: newPaymentStatus }
            });
        });

        if (order.paymentStatus === 'PAID' && order.paymentMethod === 'VNPAY') {
            res.json({ message: "Hủy đơn thành công. Yêu cầu hoàn tiền đang được xử lý (3-7 ngày).", paymentStatus: "REFUNDING" });
        } else {
            res.json({ message: "Hủy đơn hàng thành công. Tồn kho và Voucher đã được hoàn trả.", paymentStatus: "FAILED" });
        }

    } catch (error) {
        console.error("Lỗi khi hủy đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi hủy đơn hàng." });
    }
};