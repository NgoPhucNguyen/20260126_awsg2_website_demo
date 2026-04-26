import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import crypto from 'crypto';
import qs from 'qs';

const prisma = new PrismaClient();

// Hàm hỗ trợ cho VNPAY
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// 1. ĐẶT HÀNG (CHECKOUT)
export const checkoutOrder = async (req, res) => {
    const customerId = req.user?.id; 
    const { shippingAddress, paymentMethod, note, couponCode, cartItems } = req.body;

    if (!customerId) return res.status(401).json({ message: "Vui lòng đăng nhập để thanh toán." });
    if (!cartItems || cartItems.length === 0) return res.status(400).json({ message: "Giỏ hàng của bạn đang trống!" });

    try {
        const variantIds = cartItems.map(item => item.variantId);
        const dbVariants = await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            include: { promotions: { include: { promotion: true } } }
        });

        if (dbVariants.length !== variantIds.length) {
            return res.status(400).json({ message: "Có sản phẩm không tồn tại hoặc đã ngừng bán." });
        }

        let totalPrice = 0;
        const orderDetailsData = [];
        const now = new Date();

        for (const item of cartItems) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 10) {
                return res.status(400).json({ message: "Phát hiện số lượng sản phẩm không hợp lệ! Vui lòng kiểm tra lại giỏ hàng." });
            }

            const realVariant = dbVariants.find(v => v.id === item.variantId);
            let currentUnitPrice = realVariant.unitPrice;
            let appliedPromotionId = null;

            if (realVariant.promotions && Array.isArray(realVariant.promotions)) {
                const activePromoLink = realVariant.promotions.find(p => {
                    if (!p.promotion) return false;
                    const start = new Date(p.promotion.startTime);
                    const end = new Date(p.promotion.endTime);
                    return start <= now && end >= now;
                });

                if (activePromoLink) {
                    const promo = activePromoLink.promotion;
                    appliedPromotionId = promo.id; 
                    if (promo.type === 'PERCENTAGE') {
                        currentUnitPrice = currentUnitPrice * (1 - promo.value / 100);
                    } else if (promo.type === 'FIXED') {
                        currentUnitPrice = Math.max(0, currentUnitPrice - promo.value);
                    }
                }
            }

            totalPrice += (currentUnitPrice * item.quantity);
            orderDetailsData.push({
                productVariantId: realVariant.id,
                promotionId: appliedPromotionId,
                quantity: item.quantity,
                originalPrice: realVariant.unitPrice, 
                unitPrice: currentUnitPrice, 
            });
        }

        // TÍNH MÃ GIẢM GIÁ
        let baseShippingFee = 30000; 
        let orderDiscount = 0;
        let shippingDiscount = 0;
        let appliedOrderCouponId = null;
        let appliedShippingCouponId = null;
        let couponUsageIdToUpdate = null;
        let isPublicCoupon = false;

        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
            if (coupon) {
                const now = new Date();
                if (now >= coupon.createdAt && now <= coupon.expireAt) {
                    const globalUsedCount = await prisma.cart.count({
                        where: { OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }], status: { notIn: ['DRAFT', 'CANCELLED'] } }
                    });
                    
                    if (globalUsedCount < coupon.usageLimit) {
                        const walletItem = await prisma.couponUsage.findFirst({
                            where: { couponId: coupon.id, customerId: customerId, status: 'ACTIVE', remaining: { gt: 0 } }
                        }); 
                        
                        let canApply = false;
                        
                        if (walletItem) {
                            couponUsageIdToUpdate = walletItem.id; 
                            canApply = true;
                        } else {
                            const personalUsedCount = await prisma.couponUsage.count({
                                where: { couponId: coupon.id, customerId: customerId }
                            });
                            const limitPerUser = coupon.rule?.usagePerUser || 1;
                            
                            if (limitPerUser === 0 || personalUsedCount < limitPerUser) {
                                isPublicCoupon = true;
                                canApply = true;
                            }
                        }

                        if (canApply) {
                            const rule = coupon.rule || {};
                            const minOrderValue = rule.minOrderValue || 0;
                            
                            if (totalPrice >= minOrderValue) {
                                if (coupon.category === 'ORDER') {
                                    appliedOrderCouponId = coupon.id; 
                                    let calc = coupon.type === 'PERCENTAGE' ? (totalPrice * coupon.value) / 100 : coupon.value;
                                    if (rule.maxDiscountValue && rule.maxDiscountValue > 0) calc = Math.min(calc, rule.maxDiscountValue);
                                    orderDiscount = Math.min(calc, totalPrice);
                                } else if (coupon.category === 'SHIPPING') {
                                    appliedShippingCouponId = coupon.id;
                                    let calc = coupon.type === 'PERCENTAGE' ? (baseShippingFee * coupon.value) / 100 : coupon.value;
                                    if (rule.maxDiscountValue && rule.maxDiscountValue > 0) calc = Math.min(calc, rule.maxDiscountValue);
                                    shippingDiscount = Math.min(calc, baseShippingFee); 
                                }
                            }
                        }
                    }
                }
            }
        }

        const finalShippingFee = baseShippingFee - shippingDiscount;
        const finalPrice = Math.max(0, (totalPrice - orderDiscount)) + finalShippingFee;

        let currentCart = await prisma.cart.findFirst({
            where: { customerId: customerId, status: 'DRAFT' }
        });

        if (!currentCart) {
            currentCart = await prisma.cart.create({
                data: { customerId: customerId, status: 'DRAFT' }
            });
        }

        await prisma.$transaction(async (tx) => {
            for (const item of orderDetailsData) {
                const inventories = await tx.inventory.findMany({
                    where: { productVariantId: item.productVariantId, quantity: { gt: 0 } },
                    orderBy: { quantity: 'desc' }
                });
                let remainingToDeduct = item.quantity; 
                for (const inv of inventories) {
                    if (remainingToDeduct <= 0) break;
                    const deductAmount = Math.min(inv.quantity, remainingToDeduct);
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: deductAmount } }
                    });
                    remainingToDeduct -= deductAmount;
                }
                if (remainingToDeduct > 0) {
                    throw new Error(`SẢN PHẨM_HẾT_HÀNG|Rất tiếc, sản phẩm trong giỏ đã hết hàng ngay lúc bạn thanh toán!`);
                }
            }

            await tx.orderDetail.deleteMany({ where: { orderId: currentCart.id } });
            await tx.orderDetail.createMany({
                data: orderDetailsData.map(detail => ({
                    ...detail,
                    orderId: currentCart.id
                }))
            });

            await tx.cart.update({
                where: { id: currentCart.id },
                data: {
                    status: 'PENDING',
                    createdAt: new Date(), // Cập nhật lại thời gian tạo đơn để tính hạn sử dụng khi hủy
                    shippingAddress: shippingAddress,
                    paymentMethod: paymentMethod,
                    paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING',
                    note: note,
                    finalPrice: finalPrice,
                    couponId: appliedOrderCouponId,
                    shippingCouponId: appliedShippingCouponId,
                    couponDiscount: orderDiscount,
                    shippingDiscount: shippingDiscount
                }
            });

            if (couponUsageIdToUpdate) {
                const updatedUsage = await tx.couponUsage.update({
                    where: { id: couponUsageIdToUpdate },
                    data: { remaining: { decrement: 1 }, usedAt: new Date() }
                });
                if (updatedUsage.remaining <= 0) {
                    await tx.couponUsage.update({
                        where: { id: couponUsageIdToUpdate },
                        data: { status: 'USED_UP' }
                    });
                }
            } else if (isPublicCoupon && (appliedOrderCouponId || appliedShippingCouponId)) {
                await tx.couponUsage.create({
                    data: {
                        couponId: appliedOrderCouponId || appliedShippingCouponId,
                        customerId: customerId,
                        status: 'USED_UP',
                        remaining: 0,
                        usedAt: new Date()
                    }
                });
            }
            await tx.cart.create({
                data: { customerId: customerId, status: 'DRAFT' }
            });
        });

        if (paymentMethod === 'VNPAY') {
            let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";
            let tmnCode = process.env.VNP_TMN_CODE;
            let secretKey = process.env.VNP_HASH_SECRET;
            let vnpUrl = process.env.VNP_URL;
            let returnUrl = process.env.VNP_RETURN_URL;

            let createDate = moment(new Date()).format('YYYYMMDDHHmmss');
            let orderIdStr = currentCart.id.replace(/-/g, ''); 
            
            let vnp_Params = {};
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = tmnCode;
            vnp_Params['vnp_Locale'] = 'vn';
            vnp_Params['vnp_CurrCode'] = 'VND';
            vnp_Params['vnp_TxnRef'] = orderIdStr;
            vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderIdStr;
            vnp_Params['vnp_OrderType'] = 'other';
            vnp_Params['vnp_Amount'] = finalPrice * 100; 
            vnp_Params['vnp_ReturnUrl'] = returnUrl;
            vnp_Params['vnp_IpAddr'] = ipAddr;
            vnp_Params['vnp_CreateDate'] = createDate;

            vnp_Params = sortObject(vnp_Params);
            let signData = qs.stringify(vnp_Params, { encode: false });
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
            vnp_Params['vnp_SecureHash'] = signed;
            vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

            return res.status(200).json({ message: "Đang chuyển hướng sang cổng thanh toán VNPAY...", paymentUrl: vnpUrl });
        } else {
            return res.status(200).json({ message: "Đặt hàng thành công!", orderId: currentCart.id });
        }

    } catch (error) {
        console.error("[CHECKOUT_ERROR]:", error);
        if (error.message && error.message.includes("SẢN PHẨM_HẾT_HÀNG")) {
            const userMsg = error.message.split('|')[1];
            return res.status(400).json({ message: userMsg });
        }
        res.status(500).json({ message: "Lỗi hệ thống khi xử lý thanh toán. Vui lòng thử lại sau!" });
    }
};

// 2. KẾT QUẢ VNPAY TRẢ VỀ
export const verifyVnpayReturn = async (req, res) => {
    try {
        let vnp_Params = req.query;
        let secureHash = vnp_Params['vnp_SecureHash'];
        let signDataParams = Object.assign({}, vnp_Params);
        delete signDataParams['vnp_SecureHash'];
        delete signDataParams['vnp_SecureHashType']; 
        signDataParams = sortObject(signDataParams);
        let secretKey = process.env.VNP_HASH_SECRET;
        
        let signData = qs.stringify(signDataParams, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            const responseCode = vnp_Params['vnp_ResponseCode'];
            const orderIdStr = vnp_Params['vnp_TxnRef']; 

            if (!orderIdStr || orderIdStr.length < 32) return res.status(400).json({ message: "Mã đơn hàng không hợp lệ!" });
            const orderId = `${orderIdStr.slice(0,8)}-${orderIdStr.slice(8,12)}-${orderIdStr.slice(12,16)}-${orderIdStr.slice(16,20)}-${orderIdStr.slice(20)}`;

            if (responseCode === '00') {
                await prisma.cart.update({
                    where: { id: orderId },
                    data: { paymentStatus: 'PAID' }
                });
                return res.status(200).json({ message: "Thanh toán thành công", code: "00" });
            } else {
                const failedOrder = await prisma.cart.findUnique({
                    where: { id: orderId },
                    include: { orderDetails: true }
                });
                if (failedOrder && failedOrder.status !== 'CANCELLED') {
                    await prisma.$transaction(async (tx) => {
                        // Trả lại hàng vào kho
                        for (const item of failedOrder.orderDetails) {
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
                        // Trả lại mã giảm giá
                        if (failedOrder.couponId) {
                            const usage = await tx.couponUsage.findFirst({
                                where: { couponId: failedOrder.couponId, customerId: failedOrder.customerId }
                            });
                            if (usage) {
                                await tx.couponUsage.update({
                                    where: { id: usage.id },
                                    data: { remaining: { increment: 1 }, status: 'ACTIVE' }
                                });
                            }
                        }
                        await tx.cart.update({
                            where: { id: orderId },
                            data: { paymentStatus: 'FAILED', status: 'CANCELLED' } 
                        });
                    });
                }
                return res.status(200).json({ message: "Giao dịch bị hủy hoặc thất bại", code: responseCode });
            }
        } else {
            console.error("[VNPAY_SIGNATURE_ERROR]: Chữ ký không hợp lệ.");
            return res.status(400).json({ message: "Chữ ký không hợp lệ (Nghi ngờ giả mạo)!" });
        }
    } catch (error) {
        console.error("[VNPAY_VERIFY_ERROR]:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xác thực thanh toán VNPAY" });
    }
};