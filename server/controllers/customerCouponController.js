// server/controllers/customerCouponController.js
import prisma from '../prismaClient.js';

export const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const customerId = req.user?.id;

    if (!customerId) return res.status(401).json({ message: 'Vui lòng đăng nhập để sử dụng mã.' });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) return res.status(404).json({ message: 'Mã coupon không tồn tại' });
    
    // 1. Kiểm tra thời gian hiệu lực
    const now = new Date();
    if (now < coupon.createdAt) return res.status(400).json({ message: 'Mã chưa đến thời gian áp dụng.' });
    if (now > coupon.expireAt) return res.status(400).json({ message: 'Mã coupon đã hết hạn.' });

    // 2. Kiểm tra giới hạn TOÀN HỆ THỐNG
    const globalUsedCount = await prisma.cart.count({
        where: {
            OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }],
            status: { notIn: ['DRAFT', 'CANCELLED'] } // Chỉ tính đơn thật
        }
    });

    if (globalUsedCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Mã giảm giá này đã hết lượt sử dụng trên hệ thống.' });
    }

    // 🚀 3. FIX BUG: KIỂM TRA GIỚI HẠN CỦA RIÊNG USER NÀY
    // Đếm xem User này đã có bao nhiêu đơn hàng (không tính nháp/hủy) dùng mã này rồi
    const userUsedCount = await prisma.cart.count({
        where: {
            customerId: customerId,
            OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }],
            status: { notIn: ['DRAFT', 'CANCELLED'] }
        }
    });

    // Lấy rule usagePerUser (mặc định là 1 nếu Admin không nhập)
    const rule = coupon.rule || {};
    const limitPerUser = parseInt(rule.usagePerUser) || 1;

    if (userUsedCount >= limitPerUser) {
        return res.status(400).json({ 
            message: `Bạn đã sử dụng mã này rồi (Giới hạn: ${limitPerUser} lần/khách hàng).` 
        });
    }

    // 4. Kiểm tra giá trị đơn hàng tối thiểu
    const minVal = parseInt(rule.minOrderValue) || 0;
    if (orderTotal < minVal) {
      return res.status(400).json({ 
          message: `Hóa đơn tối thiểu phải từ ${new Intl.NumberFormat('vi-VN').format(minVal)}đ` 
      });
    }

    // ✅ NẾU VƯỢT QUA TẤT CẢ -> HỢP LỆ
    res.json({ 
        valid: true, 
        coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            category: coupon.category,
            maxDiscountValue: parseInt(rule.maxDiscountValue) || 0 
        }
    });
  } catch (error) {
    console.error("Validate Coupon Error:", error);
    res.status(500).json({ message: 'Lỗi hệ thống khi kiểm tra mã.' });
  }
};