// controllers/analyticsController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export const getDashboardSummary = async (req, res) => {
    try {
        const { timeRange } = req.query; // Nhận '7days', '30days' hoặc 'all'
        
        let startDate;
        const now = new Date();

        if (timeRange === '7days') startDate = new Date(now.setDate(now.getDate() - 7));
        else if (timeRange === '30days') startDate = new Date(now.setDate(now.getDate() - 30));
        else startDate = new Date(0); // Lấy từ khởi tạo (All time)

        // 1. Doanh thu trong khoảng thời gian đã chọn
        const currentRevenue = await prisma.cart.aggregate({
            _sum: { finalPrice: true },
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: startDate }
            }
        });

        // 2. TỔNG DOANH THU TỪ TRƯỚC ĐẾN NAY (Để so sánh tổng quát)
        const allTimeRevenue = await prisma.cart.aggregate({
            _sum: { finalPrice: true },
            where: { paymentStatus: 'PAID' }
        });

        // 3. Đơn hàng trong khoảng thời gian
        const orderCount = await prisma.cart.count({
            where: {
                status: { notIn: ['DRAFT', 'CANCELLED'] },
                createdAt: { gte: startDate }
            }
        });

        // 4. Khách hàng mới trong khoảng thời gian
        const customersCount = await prisma.customer.count({
            where: { createdAt: { gte: startDate } }
        });

        res.json({
            periodRevenue: currentRevenue._sum.finalPrice || 0,
            allTimeRevenue: allTimeRevenue._sum.finalPrice || 0,
            totalOrders: orderCount,
            newCustomers: customersCount,
            label: timeRange === 'all' ? 'Toàn thời gian' : `Trong ${timeRange.replace('days', ' ngày')} qua`
        });

    } catch (error) {
        res.status(500).json({ error: "Lỗi tính toán thống kê" });
    }
};


export const getChartData = async (req, res) => {
    try {
        const { timeRange } = req.query; // Nhận biến timeRange từ Frontend (VD: '7days', '30days')

        // Mặc định lấy 30 ngày nếu không truyền
        const days = timeRange === '7days' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // --------------------------------------------------------
        // 1. BIỂU ĐỒ DOANH THU (Line Chart)
        // Gom nhóm doanh thu theo từng ngày
        // --------------------------------------------------------
        const revenueRaw = await prisma.cart.groupBy({
            by: ['createdAt'], // Cần xử lý lại ngày ở Frontend vì Prisma groupBy theo Date+Time chuẩn xác
            _sum: {
                finalPrice: true
            },
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: startDate }
            }
        });

        // Xử lý lại dữ liệu: Cộng dồn doanh thu của các đơn hàng TRONG CÙNG 1 NGÀY
        const revenueMap = {};
        revenueRaw.forEach(item => {
            // Cắt chuỗi lấy phần ngày (YYYY-MM-DD)
            const dateStr = item.createdAt.toISOString().split('T')[0]; 
            if (!revenueMap[dateStr]) {
                revenueMap[dateStr] = 0;
            }
            revenueMap[dateStr] += item._sum.finalPrice || 0;
        });

        // Sắp xếp lại mảng theo thứ tự ngày tăng dần
        const revenueData = Object.keys(revenueMap).sort().map(date => ({
            date: date, // VD: "2026-04-01"
            revenue: revenueMap[date]
        }));

        // --------------------------------------------------------
        // 2. BIỂU ĐỒ TRẠNG THÁI ĐƠN HÀNG (Pie Chart)
        // --------------------------------------------------------
        const orderStatusRaw = await prisma.cart.groupBy({
            by: ['status'],
            _count: {
                id: true
            },
            where: {
                createdAt: { gte: startDate },
                status: { notIn: ['DRAFT', 'CART'] } // Bỏ qua giỏ hàng đang chọn dở
            }
        });

        const orderStatusData = orderStatusRaw.map(item => ({
            name: item.status,
            value: item._count.id
        }));

        // --------------------------------------------------------
        // 3. BIỂU ĐỒ TOP SẢN PHẨM BÁN CHẠY (Bar Chart)
        // --------------------------------------------------------
        const topProductsRaw = await prisma.orderDetail.groupBy({
            by: ['productVariantId'],
            _sum: { quantity: true },
            where: {
                cart: {
                    paymentStatus: 'PAID', // Chỉ tính sản phẩm của đơn đã trả tiền
                    createdAt: { gte: startDate }
                }
            },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5 // Lấy Top 5
        });

        // Lấy tên sản phẩm thật dựa trên ID vừa tìm được
        const topProductsData = [];
        for (const item of topProductsRaw) {
            const variant = await prisma.productVariant.findUnique({
                where: { id: item.productVariantId },
                include: { product: true } // Lấy tên VN ra
            });
            if (variant) {
                topProductsData.push({
                    name: variant.product.nameVn,
                    sold: item._sum.quantity
                });
            }
        }

        // Trả toàn bộ dữ liệu 3 biểu đồ về Frontend
        res.json({
            revenueData,
            orderStatusData,
            topProductsData
        });

    } catch (error) {
        console.error("❌ Lỗi lấy dữ liệu Chart:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tải biểu đồ." });
    }
};