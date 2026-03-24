import { tool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../prismaClient.js";
import "dotenv/config";

const isAdmin = (authRole) => Number(authRole) === parseInt(process.env.ADMIN_ROLE);

// Get coupon info (customer-specific)
export const getCouponInfoTool = tool(
    async ({ couponCode, customerId, authCustomerId, authRole }) => {
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

            if (!authCustomerId) {
                return JSON.stringify({ error: "Unauthorized: thiếu thông tin customer" });
            }

            // Non-admin: must own the coupon.
            const couponUsage = await prisma.couponUsage.findFirst({
                where: {
                    customerId: authCustomerId,
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
            // customerId: z.string().optional().describe("Admin only: customer ID cần xem coupon"),
            // authCustomerId: z.string().optional().describe("Injected by backend auth context"),
            // authRole: z.number().optional().describe("Injected by backend auth context"),
        }).passthrough(),
    }
);

// Get available coupons for a specific customer
export const getAvailableCouponsTool = tool(
    async ({ authCustomerId, authRole, limit = 20 }) => {
        console.log("[getAvailableCouponsTool] Called with:", { authCustomerId, authRole, limit });
        try {
            if (isAdmin(authRole)) {
                if (authCustomerId) {
                    const usages = await prisma.couponUsage.findMany({
                        where: {
                            customerId: authCustomerId,
                            status: "ACTIVE",
                            remaining: { gt: 0 },
                            coupon: {
                                expireAt: { gt: new Date() },
                            },
                        },
                        include: { coupon: true },
                        take: limit,
                    });

                    const customerCoupons = usages.map((usage) => ({
                        ...usage.coupon,
                        status: usage.status,
                        remaining: usage.remaining,
                        customerId: usage.customerId,
                    }));

                    return JSON.stringify(customerCoupons);
                }

                const coupons = await prisma.coupon.findMany({
                    where: {
                        expireAt: { gt: new Date() },
                    },
                    take: limit,
                });

                return JSON.stringify(coupons);
            }

            if (!authCustomerId) {
                return JSON.stringify({ error: "Unauthorized: thiếu thông tin customer" });
            }

            const couponUsages = await prisma.couponUsage.findMany({
                where: {
                    customerId: authCustomerId,
                    status: "ACTIVE",
                    remaining: { gt: 0 },
                    coupon: {
                        expireAt: { gt: new Date() },
                    },
                },
                include: {
                    coupon: true,
                },
                take: limit,
            });

            // Extract coupon data
            const coupons = couponUsages.map((usage) => ({
                ...usage.coupon,
                status: usage.status,
                remaining: usage.remaining,
            }));

            return JSON.stringify(coupons);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getAvailableCoupons",
        description: "Lấy danh sách mã giảm giá còn hiệu lực của khách hàng (SHIPPING hoặc ORDER)",
        schema: z.object({
            // customerId: z.string().optional().describe("Admin only: customer ID cần xem coupon"),
            // authCustomerId: z.string().optional().describe("Injected by backend auth context"),
            // authRole: z.number().optional().describe("Injected by backend auth context"),
            // category: z.enum(["SHIPPING", "ORDER"])
                    // .optional()
                    // .describe("QUAN TRỌNG: Chỉ truyền trường này nếu khách hàng nhắc ĐÍCH DANH là 'mã freeship' (vận chuyển) hoặc 'mã đơn hàng'. Nếu khách hỏi chung chung như 'mã giảm giá', TUYỆT ĐỐI KHÔNG truyền trường này (để trống)."),
            limit: z.number().int().positive().default(20).describe("Số lượng mã"),
        }).passthrough(),
    }
);

// Validate coupon
export const validateCouponTool = tool(
    async ({ couponCode, customerId, authCustomerId, authRole, orderAmount = null }) => {
        try {
            const targetCustomerId = isAdmin(authRole) ? (customerId ?? authCustomerId) : authCustomerId;

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
            // customerId: z.string().optional().describe("Admin only: customer ID cần validate"),
            // authCustomerId: z.string().optional().describe("Injected by backend auth context"),
            // authRole: z.number().optional().describe("Injected by backend auth context"),
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
            return JSON.stringify(promotions);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "getPromotions",
        description: "Lấy danh sách chương trình khuyến mãi đang diễn ra",
        schema: z.object({
            limit: z.number().int().positive().default(20).describe("Số lượng CTKM"),
        }),
    }
);
