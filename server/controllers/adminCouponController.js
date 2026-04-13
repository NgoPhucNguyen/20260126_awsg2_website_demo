// server/controllers/adminCouponController.js
import prisma from '../prismaClient.js';

export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { CouponUsage: true } } }
    });

    const couponsWithStats = await Promise.all(coupons.map(async (coupon) => {
        const realUsedCount = await prisma.cart.count({
            where: {
                OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }],
                status: { notIn: ['DRAFT', 'CANCELLED'] }
            }
        });
        return {
            ...coupon,
            assignedCount: coupon._count.CouponUsage, 
            usedCount: realUsedCount                  
        };
    }));
    res.json(couponsWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, category, type, value, description, usageLimit, createdAt, expireAt, rule } = req.body;

    const existingCoupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existingCoupon) return res.status(400).json({ message: 'Mã coupon này đã tồn tại.' });

    // Đảm bảo rule không chứa isFirstOrder để tránh rác dữ liệu
    const cleanRule = {
        minOrderValue: parseInt(rule?.minOrderValue) || 0,
        maxDiscountValue: parseInt(rule?.maxDiscountValue) || 0,
        usagePerUser: parseInt(rule?.usagePerUser) || 1
    };

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        category,
        type,
        value: parseFloat(value),
        description,
        usageLimit: parseInt(usageLimit),
        createdAt: new Date(createdAt), 
        expireAt: new Date(expireAt),
        rule: cleanRule
      }
    });
    res.status(201).json({ message: 'Tạo coupon thành công', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 3. LẤY CHI TIẾT MỘT MÃ (Kèm số liệu thống kê)
export const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await prisma.coupon.findUnique({
            where: { id },
            include: {
                _count: { select: { CouponUsage: true } }
            }
        });

        if (!coupon) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });

        // Đếm số lượt thực tế đã dùng trong đơn hàng
        const realUsedCount = await prisma.cart.count({
            where: {
                OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }],
                status: { notIn: ['DRAFT', 'CANCELLED'] }
            }
        });

        res.json({
            ...coupon,
            usedCount: realUsedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. CẬP NHẬT MÃ GIẢM GIÁ
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, category, type, value, description, usageLimit, createdAt, expireAt, rule } = req.body;

        // 1. Kiểm tra tồn tại
        const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
        if (!existingCoupon) return res.status(404).json({ message: 'Mã không tồn tại để cập nhật.' });

        // 2. Nếu đổi Code, phải kiểm tra xem Code mới có bị trùng với mã khác không
        if (code && code.toUpperCase() !== existingCoupon.code) {
            const codeDuplicate = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
            if (codeDuplicate) return res.status(400).json({ message: 'Mã coupon mới này đã tồn tại.' });
        }

        // 3. Làm sạch Rule (Xóa sạch dấu vết isFirstOrder)
        const cleanRule = rule ? {
            minOrderValue: parseInt(rule.minOrderValue) || 0,
            maxDiscountValue: parseInt(rule.maxDiscountValue) || 0,
            usagePerUser: parseInt(rule.usagePerUser) || 1
        } : existingCoupon.rule;

        const updated = await prisma.coupon.update({
            where: { id },
            data: {
                code: code?.toUpperCase(),
                category,
                type,
                value: value !== undefined ? parseFloat(value) : undefined,
                description,
                usageLimit: usageLimit !== undefined ? parseInt(usageLimit) : undefined,
                createdAt: createdAt ? new Date(createdAt) : undefined,
                expireAt: expireAt ? new Date(expireAt) : undefined,
                rule: cleanRule
            }
        });

        res.json({ message: 'Cập nhật thành công!', coupon: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. XÓA MÃ GIẢM GIÁ
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        // 🚨 CHỐT CHẶN BẢO MẬT: Kiểm tra xem mã đã được dùng trong Đơn hàng nào chưa
        const usedInOrders = await prisma.cart.count({
            where: {
                OR: [{ couponId: id }, { shippingCouponId: id }]
            }
        });

        if (usedInOrders > 0) {
            return res.status(400).json({ 
                message: 'Không thể xóa! Mã này đã có dữ liệu trong lịch sử đơn hàng. Bạn nên để nó hết hạn thay vì xóa.' 
            });
        }

        // Thực hiện xóa trong Transaction để đảm bảo sạch dữ liệu ở cả bảng CouponUsage
        await prisma.$transaction(async (tx) => {
            // Xóa các bản ghi khách đã lưu mã này vào ví
            await tx.couponUsage.deleteMany({ where: { couponId: id } });
            // Xóa mã chính
            await tx.coupon.delete({ where: { id } });
        });

        res.json({ message: 'Đã xóa mã giảm giá thành công!' });
    } catch (error) {
        console.error("Delete Coupon Error:", error);
        res.status(500).json({ message: 'Lỗi hệ thống khi xóa mã.' });
    }
};

export const assignCoupon = async (req, res) => {
    try {
        const { couponId, email } = req.body;

        if (!couponId || !email) return res.status(400).json({ message: 'Vui lòng cung cấp Coupon ID và Email khách hàng.' });

        const customer = await prisma.customer.findUnique({ where: { mail: email } });
        if (!customer) return res.status(404).json({ message: `Không tìm thấy khách hàng với email: ${email}` });

        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (!coupon) return res.status(404).json({ message: 'Không tìm thấy Coupon.' });

        const existingWalletItem = await prisma.couponUsage.findFirst({
            where: { couponId: coupon.id, customerId: customer.id }
        });

        if (existingWalletItem) return res.status(400).json({ message: 'Khách hàng này đã có mã giảm giá này trong ví rồi.' });

        // 🚀 CHỈ CHẶN TẶNG MÃ NẾU SỐ LƯỢT DÙNG THỰC TẾ ĐÃ HẾT
        const realUsedCount = await prisma.cart.count({
            where: {
                OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }],
                status: { notIn: ['DRAFT', 'CANCELLED'] }
            }
        });

        if (realUsedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Mã giảm giá này đã hết lượt sử dụng trên hệ thống, không thể tặng thêm.' });
        }

        await prisma.couponUsage.create({
            data: {
                couponId: coupon.id,
                customerId: customer.id,
                status: 'ACTIVE',
                remaining: coupon.rule?.usagePerUser > 0 ? coupon.rule.usagePerUser : 1 
            }
        });

        res.json({ message: `Tặng mã ${coupon.code} cho ${customer.accountName} (${email}) thành công!` });

    } catch (error) {
        console.error("Error assigning coupon:", error);
        res.status(500).json({ message: 'Lỗi hệ thống khi tặng mã.' });
    }
};
