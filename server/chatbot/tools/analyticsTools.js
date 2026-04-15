import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";

const isAdmin = (authRole) => Number(authRole) === Number(process.env.ADMIN_ROLE);

export const getSalesAnalyticsTool = tool(
    async ({ timeRange = '30days', authRole }) => {
        try {
            if (!isAdmin(authRole)) {
                return "ERROR_UNAUTHORIZED: Bạn không có quyền truy cập báo cáo tài chính.";
            }
            
            // 1. Tính toán mốc thời gian
            const days = timeRange === '7days' ? 7 : (timeRange === '30days' ? 30 : 3650);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            // 🚀 ĐỊNH NGHĨA BỘ LỌC CHUẨN: Đã thanh toán và không bị hủy
            const salesFilter = {
                paymentStatus: 'PAID',
                status: { notIn: ['CANCELLED', 'DRAFT'] }, // Đảm bảo đơn đã chốt
                createdAt: { gte: startDate }
            };

            // 2. Lấy Doanh thu tổng & Số đơn
            const summaryRevenue = await prisma.cart.aggregate({
                _sum: { finalPrice: true },
                where: { paymentStatus: 'PAID', createdAt: { gte: startDate } }
            });
            const totalRevenue = summaryRevenue._sum.finalPrice || 0;

            const totalOrders = await prisma.cart.count({
                where: salesFilter
            });

            // 3. Gom nhóm dữ liệu vẽ Biểu đồ Doanh Thu (Line Chart)
            const revenueRaw = await prisma.cart.groupBy({
                by: ['createdAt'],
                _sum: { finalPrice: true },
                where: salesFilter
            });

            const revenueMap = {};

            const chartDays = timeRange === 'all' ? 30 : days; 
            const now = new Date();
            for (let i = chartDays - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                revenueMap[dateStr] = 0; // Khởi tạo tất cả các ngày là 0 VND
            }

            // 🚀 ĐẮP DỮ LIỆU THẬT VÀO KHUNG
            revenueRaw.forEach(item => {
                const dateStr = item.createdAt.toISOString().split('T')[0];
                if (revenueMap[dateStr] !== undefined) {
                    revenueMap[dateStr] += (item._sum.finalPrice || 0);
                } else {
                    revenueMap[dateStr] = (item._sum.finalPrice || 0);
                }
            });
            
            const revenueData = Object.keys(revenueMap).sort().map(date => ({
                date, 
                revenue: revenueMap[date]
            }));

            // 4. Đóng gói JSON ẩn cho Frontend
            const chartPayload = JSON.stringify({
                revenueData,
                timeLabel: timeRange === 'all' ? 'Toàn thời gian' : `${days} ngày qua`
            });

            // 5. Trả về cho AI
            return [
                `BÁO CÁO THỐNG KÊ KINH DOANH (${timeRange}):`,
                `- Tổng doanh thu: ${totalRevenue.toLocaleString("vi-VN")} VND`,
                `- Tổng số đơn hàng: ${totalOrders} đơn`,
                // 🚀 ĐỔI DÒNG NÀY:
                `__CHART_DATA_START__${chartPayload}__CHART_DATA_END__`,
                "LƯU Ý CHO AI: Báo cáo ngắn gọn tổng doanh thu và đơn hàng. TUYỆT ĐỐI KHÔNG đọc hay giải thích đoạn dữ liệu biểu đồ."
            ].join("\n");

        } catch (error) {
            return `Lỗi trích xuất dữ liệu: ${error.message}`;
        }
    },
    {
        name: "getSalesAnalytics",
        description: "CHỈ SỬ DỤNG để lấy số liệu biểu đồ doanh thu (Revenue Analytics). TUYỆT ĐỐI KHÔNG dùng tool này để tìm mã giảm giá hay thông tin khuyến mãi. Xem báo cáo doanh thu, tổng đơn hàng và vẽ biểu đồ. Hỏi Sếp muốn xem mốc thời gian nào (7days, 30days, all) nếu Sếp chưa nói rõ.",
        schema: z.object({
            timeRange: z.enum(["7days", "30days", "all"]).describe("Khoảng thời gian thống kê"),
        }).passthrough(),
    }
);