import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";
import "dotenv/config";

const isAdmin = (authRole) => Number(authRole) === parseInt(process.env.ADMIN_ROLE);
const isEmployee = (authRole) => Number(authRole) === parseInt(process.env.EMPLOYEE_ROLE);
const isCustomer = (authRole) => Number(authRole) === parseInt(process.env.CUSTOMER_ROLE);

// Get coupon info (customer-specific)
export const getCouponInfoTool = tool(
    async ({ couponCode, customerId, authId, authRole }) => {
        try {
            if (!couponCode) {
                return JSON.stringify({ error: "couponCode is required" });
            }

            if (isAdmin(authRole)) {
                const adminTargetCustomerId = customerId;

                if (adminTargetCustomerId) {
                    const usage = await prisma.couponUsage.findFirst({
                        where: {
                            customerId: adminTargetCustomerId,
                            coupon: { code: couponCode },
                        },
                        include: { coupon: true },
                    });

                    if (!usage) {
                        return JSON.stringify({ error: "Coupon không tồn tại cho customer được chỉ định" });
                    }

                    return JSON.stringify({
                        ...usage.coupon,
                        status: usage.status,
                        remaining: usage.remaining,
                        customerId: usage.customerId,
                    });
                }

                const coupon = await prisma.coupon.findUnique({
                    where: { code: couponCode },
                });

                if (!coupon) {
                    return JSON.stringify({ error: "Mã giảm giá không tìm thấy" });
                }

                return JSON.stringify(coupon);
            }

            if (!authId) {
                return JSON.stringify({ error: "Unauthorized: thiếu thông tin customer" });
            }

            // Non-admin: must own the coupon.
            const couponUsage = await prisma.couponUsage.findFirst({
                where: {
                    customerId: authId,
                    coupon: { code: couponCode },
                },
                include: { coupon: true },
            });

            if (!couponUsage) {
                return JSON.stringify({ error: "Bạn không sở hữu mã giảm giá này" });
            }

            return JSON.stringify({
                ...couponUsage.coupon,
                status: couponUsage.status,
                remaining: couponUsage.remaining,
            });
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getCouponInfo",
        description: "Lấy thông tin mã giảm giá của khách hàng (chỉ coupon họ sở hữu)",
        schema: z.object({
            couponCode: z.string().describe("Mã giảm giá"),
        }).passthrough(),
    }
);

// Get available coupons for a specific customer
export const getAvailableCouponsTool = tool(
    async ({ authId, authRole, limit = 20 }) => {
        try {
            // 🚀 TRƯỜNG HỢP 1: ADMIN HOẶC NHÂN VIÊN (Xem toàn bộ kho coupon)
            if (authRole && (isAdmin(authRole) || isEmployee(authRole))) {
                const coupons = await prisma.coupon.findMany({
                    where: {
                        expireAt: { gt: new Date() },
                    },
                    take: limit,
                    orderBy: { createdAt: "desc" }, // Lấy mã mới nhất trước
                });

                if (coupons.length === 0) return "Hiện hệ thống không có mã giảm giá nào đang khả dụng.";

                const adminList = coupons.map(c => 
                    `- Mã: ${c.code} | Loại: ${c.category} | Giảm: ${c.type === 'PERCENTAGE' ? c.value + '%' : c.value.toLocaleString() + 'đ'} | Hạn: ${c.expireAt.toLocaleDateString('vi-VN')}`
                ).join('\n');

                // 🚀 BƠM THẲNG SỐ LƯỢNG THỰC TẾ VÀO ĐÂY ĐỂ AI KHÔNG BỊA RA SỐ 10 HAY 20 NỮA
                return `BÁO CÁO: TÌM THẤY TỔNG CỘNG ${coupons.length} MÃ GIẢM GIÁ ĐANG CHẠY TRÊN HỆ THỐNG:\n${adminList}\n\nLệnh cho AI: Hãy in chính xác danh sách ${coupons.length} mã này ra màn hình, không được tóm tắt.`;
            }

            // 🚀 TRƯỜNG HỢP 2: GUEST (Khách chưa đăng nhập)
            if (!authId) {
                return "ERROR_UNAUTHORIZED: Khách hàng chưa đăng nhập nên không thể kiểm tra ví voucher cá nhân.";
            }

            // 🚀 TRƯỜNG HỢP 3: CUSTOMER (Khách đã đăng nhập - Xem ví cá nhân)
            const couponUsages = await prisma.couponUsage.findMany({
                where: {
                    customerId: authId,
                    status: "ACTIVE",
                    remaining: { gt: 0 },
                    coupon: {
                        expireAt: { gt: new Date() },
                    },
                    // 🚀 Lấy những mã SẮP HẾT HẠN nhất để hối thúc khách dùng
                },
                include: { coupon: true },
                take: limit,
                orderBy: { coupon: { expireAt: 'asc' } },
            });

            if (couponUsages.length === 0) {
                return "Bạn hiện chưa có mã giảm giá nào trong ví. Hãy tham gia các chương trình của Aphrodite để nhận ưu đãi nhé!";
            }

            const customerList = couponUsages.map(usage => {
                const c = usage.coupon;
                const valueTxt = c.type === 'PERCENTAGE' ? `${c.value}%` : `${c.value.toLocaleString()}đ`;
                return `- Mã: ${c.code} (Giảm ${valueTxt}) - Hạn dùng: ${c.expireAt.toLocaleDateString('vi-VN')} - Còn lại: ${usage.remaining} lần sử dụng.`;
            }).join('\n');

            return `DANH SÁCH MÃ GIẢM GIÁ TRONG VÍ CỦA BẠN:\n${customerList}\n\nLưu ý: Bạn có thể nhập các mã này ở bước thanh toán để được áp dụng ưu đãi.`;

        } catch (error) {
            return `Lỗi hệ thống khi kiểm tra mã giảm giá: ${error.message}`;
        }
    },
    {
        name: "getAvailableCoupons",
        description: "BẮT BUỘC SỬ DỤNG công cụ này khi Sếp hoặc Khách hỏi về 'mã giảm giá', 'coupon', 'voucher'. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA RA các mã (như SUMMER22, FREESHIP, v.v.). CHỈ ĐƯỢC trả lời dựa trên kết quả tool này trả về. Lấy danh sách mã giảm giá (SHIPPING hoặc ORDER). Nếu là Admin, tool này trả về toàn bộ mã của hệ thống. Nếu là Khách, trả về ví mã cá nhân của họ.",
        schema: z.object({
            limit: z.number().int().positive().default(20).describe("Số lượng mã"),
        }).passthrough(),
    }
);
// Validate coupon
export const validateCouponTool = tool(
    async ({ couponCode, customerId, authId, authRole, orderAmount = null }) => {
        try {
            const targetCustomerId = isAdmin(authRole) ? (customerId ?? authId) : authId;

            if (!targetCustomerId) {
                return JSON.stringify({ valid: false, message: "Unauthorized: thiếu thông tin customer" });
            }

            const couponUsage = await prisma.couponUsage.findFirst({
                where: {
                    customerId: targetCustomerId,
                    coupon: { code: couponCode },
                },
                include: { coupon: true },
            });

            if (!couponUsage) {
                return JSON.stringify({ valid: false, message: "Bạn không sở hữu mã giảm giá này" });
            }

            const coupon = couponUsage.coupon;

            if (!coupon) {
                return JSON.stringify({ valid: false, message: "Mã giảm giá không tìm thấy" });
            }

            if (coupon.expireAt < new Date()) {
                return JSON.stringify({ valid: false, message: "Mã giảm giá đã hết hạn" });
            }

            if (couponUsage.status !== "ACTIVE") {
                return JSON.stringify({ valid: false, message: "Mã giảm giá không ở trạng thái có thể sử dụng" });
            }

            if (couponUsage.remaining <= 0) {
                return JSON.stringify({ valid: false, message: "Bạn đã sử dụng mã này rồi" });
            }

            // Calculate discount
            let discountAmount = 0;
            if (coupon.type === "PERCENTAGE") {
                discountAmount = orderAmount ? (orderAmount * coupon.value) / 100 : 0;
            } else {
                discountAmount = coupon.value;
            }

            return JSON.stringify({
                valid: true,
                message: "Mã giảm giá hợp lệ",
                coupon,
                discountAmount,
                customerId: targetCustomerId,
            });
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "validateCoupon",
        description: "Kiểm tra tính hợp lệ của mã giảm giá (hạn sử dụng, đã dùng chưa, tính chiết khấu)",
        schema: z.object({
            couponCode: z.string().describe("Mã giảm giá"),
            orderAmount: z.number().optional().describe("Tổng tiền đơn hàng (để tính % giảm)"),
        }).passthrough(),
    }
);

// Get promotions
export const getPromotionsTool = tool(
    async ({ limit = 20 }) => {
        try {
            const now = new Date();
            const promotions = await prisma.promotion.findMany({
                where: {
                    startTime: { lte: now },
                    endTime: { gte: now },
                },
                include: {
                    products: {
                        include: {
                            variant: { include: { product: true } },
                        },
                    },
                },
                take: limit,
            });

            if (!promotions || promotions.length === 0) {
                return "Hiện tại cửa hàng không có chương trình khuyến mãi nào.";
            }

            const formattedPromos = promotions.map(promo => {
                const promoDesc = promo.description || "Chương trình khuyến mãi đặc biệt";
                const promoValue = promo.type === "PERCENTAGE" 
                    ? `${promo.value}%` 
                    : `${promo.value.toLocaleString('vi-VN')} VND`;
                
                let productListText = "";

                // Kiểm tra xem khuyến mãi có link trực tiếp tới sản phẩm không
                if (promo.products && promo.products.length > 0) {
                    const sampleProducts = promo.products.slice(0, 3).map(pp => {
                        const prod = pp.variant?.product;
                        return prod ? `- ${prod.nameVn} [ID: ${prod.id}]` : null;
                    }).filter(Boolean);

                    if (sampleProducts.length > 0) {
                        productListText = `\n  * Sản phẩm tiêu biểu:\n  ${sampleProducts.join('\n  ')}`;
                        if (promo.products.length > 3) {
                            productListText += `\n  ...và nhiều sản phẩm khác.`;
                        }
                    }
                } else {
                    // 🚀 NẾU ÁP DỤNG THEO CATEGORY MÀ RỖNG, GIẢI VÂY CHO AI BẰNG CÂU NÀY
                    productListText = `\n  * (Áp dụng cho toàn bộ danh mục/thương hiệu liên quan. Khách hàng vui lòng hỏi tên sản phẩm cụ thể để kiểm tra giá ưu đãi).`;
                }

                return `🎁 ${promoDesc} (GIẢM ${promoValue})${productListText}`;
            });

            // 🚀 BƠM CAMERA VÀO ĐÂY ĐỂ DEBUG
            console.log("=== GET PROMOTIONS TOOL OUTPUT ===");
            console.log(formattedPromos.join('\n\n'));

            return `DANH SÁCH KHUYẾN MÃI ĐANG DIỄN RA:\n\n${formattedPromos.join('\n\n')}\n\nLƯU Ý ĐẶC BIỆT CHO AI: TUYỆT ĐỐI KHÔNG SỬ DỤNG mã ID dài (như 524cd0e9...) trong câu trả lời. Nếu chương trình không liệt kê sẵn [ID: X], CHỈ CẦN thông báo tên chương trình và không cần chèn thẻ [ID].`;

        } catch (error) {
            return `Lỗi hệ thống khi lấy khuyến mãi: ${error.message}`;
        }
    },
    {
        name: "getPromotions",
        description: "BẮT BUỘC SỬ DỤNG công cụ này khi Sếp hoặc Khách hỏi về 'khuyến mãi', 'chương trình giảm giá'. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA RA dữ liệu. Phải gọi tool để lấy dữ liệu thực tế từ Database cửa hàng. Lấy danh sách các chương trình khuyến mãi đang diễn ra, bao gồm mô tả, giá trị giảm và sản phẩm áp dụng (nếu có).",
        schema: z.object({
            limit: z.number().int().positive().default(20).describe("Số lượng CTKM"),
        }).passthrough(),
    }
);