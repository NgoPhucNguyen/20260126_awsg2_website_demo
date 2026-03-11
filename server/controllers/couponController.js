import prisma from '../prismaClient.js';

// GET LIST OF COUPONS
export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    const coupon = await prisma.coupon.findUnique({
      where: { code }
    });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Mã coupon không tồn tại' });
    }

    // check expiration date
    if (new Date() > coupon.expireAt) {
      return res.status(400).json({ valid: false, message: 'Mã coupon đã hết hạn' });
    }

    // check minimum order value
    const rule = coupon.rule || { minOrderValue: 0 };
    if (orderTotal < rule.minOrderValue) {
      return res.status(400).json({
        valid: false,
        message: `Hóa đơn tối thiểu là ${rule.minOrderValue * 1000}đ`
      });
    }

    res.json({ valid: true, coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
