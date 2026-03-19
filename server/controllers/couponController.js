import prisma from '../prismaClient.js';

// GET LIST OF COUPONS
export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            CouponUsage: true // Đếm xem mã này đã nằm trong ví của bao nhiêu người (bao gồm cả chưa dùng và đã dùng)
          }
        }
      }
    });

    // Tính toán thêm số lượt THỰC SỰ ĐÃ DÙNG (USED_UP)
    const couponsWithStats = await Promise.all(coupons.map(async (coupon) => {
        const usedCount = await prisma.couponUsage.count({
            where: {
                couponId: coupon.id,
                status: 'USED_UP'
            }
        });

        return {
            ...coupon,
            assignedCount: coupon._count.CouponUsage,
            usedCount: usedCount
        };
    }));

    res.json(couponsWithStats);
  } catch (error) {
    console.error("❌ Prisma fetch error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const assignCoupon = async (req, res) => {
    try {
        const { couponId, email } = req.body;

        if (!couponId || !email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp Coupon ID và Email khách hàng.' });
        }

        // 1. Tìm Khách hàng qua Email
        const customer = await prisma.customer.findUnique({ where: { mail: email } });
        if (!customer) {
            return res.status(404).json({ message: `Không tìm thấy khách hàng với email: ${email}` });
        }

        // 2. Tìm Coupon
        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (!coupon) {
            return res.status(404).json({ message: 'Không tìm thấy Coupon.' });
        }

        // 3. Kiểm tra xem khách hàng này đã có mã này chưa (Tránh tặng 2 lần)
        const existingWalletItem = await prisma.couponUsage.findFirst({
            where: {
                couponId: coupon.id,
                customerId: customer.id
            }
        });

        if (existingWalletItem) {
            return res.status(400).json({ message: 'Khách hàng này đã có mã giảm giá này trong ví rồi.' });
        }

        // 4. Kiểm tra giới hạn tổng phát hành (Global Usage Limit)
        const currentAssigned = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
        if (currentAssigned >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Mã giảm giá này đã phát hành hết giới hạn cho phép.' });
        }

        // 5. Phát hành mã (Bỏ vào ví khách hàng)
        await prisma.couponUsage.create({
            data: {
                couponId: coupon.id,
                customerId: customer.id,
                status: 'ACTIVE',
                remaining: coupon.rule?.usagePerUser > 0 ? coupon.rule.usagePerUser : 1 // Mặc định cho phép dùng 1 lần nếu không set
            }
        });

        res.json({ message: `Tặng mã ${coupon.code} cho ${customer.accountName} (${email}) thành công!` });

    } catch (error) {
        console.error("Error assigning coupon:", error);
        res.status(500).json({ message: 'Lỗi hệ thống khi tặng mã.' });
    }
};


// get coupon by id
export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });
    console.log("Fetched Coupon:", coupon);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon không tìm thấy' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE COUPON
export const createCoupon = async (req, res) => {
  try {
    const { code, category , type, value, description, usageLimit, expireAt, rule } = req.body;

    // check if code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code }
    });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Mã coupon đã tồn tại' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        category,
        type,
        value: parseFloat(value),
        description,
        usageLimit: parseInt(usageLimit),
        expireAt: new Date(expireAt),
        rule: rule || { minOrderValue: 0 }
      }
    });

    res.status(201).json({
      message: 'Tạo coupon thành công',
      coupon
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE COUPON
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, category, type, value, description, usageLimit, expireAt, rule } = req.body;

    // Kiểm tra code có trùng với coupon khác không
    if (code) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code }
      });
      if (existingCoupon && existingCoupon.id !== id) {
        return res.status(400).json({ message: 'Mã coupon đã tồn tại' });
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(type && { type }),
        ...(category && { category }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(description !== undefined && { description }),
        ...(usageLimit !== undefined && { usageLimit: parseInt(usageLimit) }),
        ...(expireAt && { expireAt: new Date(expireAt) }),
        ...(rule && { rule })
      }
    });

    res.json({
      message: 'Cập nhật coupon thành công',
      coupon
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE COUPON
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({
      where: { id }
    });

    res.json({ message: 'Xóa coupon thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CHECK VALIDITY OF COUPON
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const customerId = req.user?.id;

    if (!customerId) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập để sử dụng mã giảm giá.' });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { 
        _count: { select: { CouponUsage: true } } 
      }
    });

    // 1. Mã không tồn tại
    if (!coupon) {
      return res.status(404).json({ message: 'Mã coupon không tồn tại' });
    }

    // 2. Mã đã quá hạn (Expire)
    if (new Date() > coupon.expireAt) {
      return res.status(400).json({ message: 'Mã coupon đã hết hạn' });
    }

    // 3. KIỂM TRA QUYỀN SỞ HỮU (VÍ VOUCHER)
    const userWalletItem = await prisma.couponUsage.findFirst({
        where: {
            couponId: coupon.id,
            customerId: customerId,
            status: 'ACTIVE',
            remaining: { gt: 0 } // Vẫn còn lượt sử dụng
        }
    });

    // Nếu người dùng KHÔNG có mã này trong ví (tức là họ tự gõ tay một mã public)
    if (!userWalletItem) {
        // Phải kiểm tra xem mã public này đã cạn kiệt số lượng phát hành chưa
        if (coupon._count.CouponUsage >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Mã giảm giá này đã hết lượt sử dụng trên hệ thống.' });
        }
        
        // (Tuỳ chọn: Nếu bạn không muốn cho khách tự gõ mã mà chỉ được xài mã trong ví, 
        // bạn có thể return lỗi luôn ở đây: "Bạn không sở hữu mã này")
    }

    // 4. Kiểm tra điều kiện đơn hàng tối thiểu
    const rule = coupon.rule || { minOrderValue: 0 };
    if (orderTotal < rule.minOrderValue) {
      return res.status(400).json({
        message: `Hóa đơn tối thiểu phải từ ${new Intl.NumberFormat('vi-VN').format(rule.minOrderValue)}đ`
      });
    }

    // 5. Nếu mọi thứ OK, trả về thông tin mã cho Frontend tính toán
    res.json({ 
        valid: true, 
        coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            category: coupon.category,
            maxDiscountValue: rule.maxDiscountValue // Gửi kèm max discount để FE giới hạn (nếu có)
        }
    });
  } catch (error) {
    console.error("[ERROR] validateCoupon:", error);
    res.status(500).json({ message: 'Lỗi hệ thống khi kiểm tra mã.' });
  }
};