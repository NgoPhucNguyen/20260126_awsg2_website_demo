import prisma from '../prismaClient.js';

// 1. GET LIST OF COUPONS (Tối ưu lại cách đếm số lượt đã dùng thực tế)
export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { CouponUsage: true } // Đây là số người đã LƯU mã vào ví
        }
      }
    });

    // 🚀 TÍNH TOÁN LẠI SỐ LƯỢT ĐÃ DÙNG THỰC TẾ DỰA VÀO BẢNG CART
    const couponsWithStats = await Promise.all(coupons.map(async (coupon) => {
        // Đếm xem có bao nhiêu Đơn hàng Hợp lệ đã sử dụng mã này
        const realUsedCount = await prisma.cart.count({
            where: {
                OR: [
                    { couponId: coupon.id },
                    { shippingCouponId: coupon.id }
                ],
                // Bỏ qua các giỏ hàng nháp hoặc đơn đã hủy
                status: { notIn: ['DRAFT', 'CANCELLED'] }
            }
        });

        return {
            ...coupon,
            assignedCount: coupon._count.CouponUsage, // Số lượt đã lưu ví
            usedCount: realUsedCount                  // Số lượt đã chốt đơn thành công
        };
    }));

    res.json(couponsWithStats);
  } catch (error) {
    console.error("❌ Prisma fetch error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2. ASSIGN COUPON (Tặng mã)
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

export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return res.status(404).json({ message: 'Coupon không tìm thấy' });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, category , type, value, description, usageLimit, createdAt, expireAt, rule } = req.body;

    const existingCoupon = await prisma.coupon.findUnique({ where: { code } });
    if (existingCoupon) return res.status(400).json({ message: 'Mã coupon đã tồn tại' });

    const coupon = await prisma.coupon.create({
      data: {
        code,
        category,
        type,
        value: parseFloat(value),
        description,
        usageLimit: parseInt(usageLimit),
        createdAt: new Date(createdAt), 
        expireAt: new Date(expireAt),
        rule: rule || { minOrderValue: 0 }
      }
    });

    res.status(201).json({ message: 'Tạo coupon thành công', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, category, type, value, description, usageLimit, createdAt, expireAt, rule } = req.body;

    if (code) {
      const existingCoupon = await prisma.coupon.findUnique({ where: { code } });
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
        ...(createdAt && { createdAt: new Date(createdAt) }),
        ...(expireAt && { expireAt: new Date(expireAt) }),
        ...(rule && { rule })
      }
    });

    res.json({ message: 'Cập nhật coupon thành công', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const usedInOrders = await prisma.cart.count({
            where: { OR: [ { couponId: id }, { shippingCouponId: id } ] }
        });
        if (usedInOrders > 0) {
            return res.status(400).json({ message: 'Không thể xóa vĩnh viễn! Mã này đã tồn tại trong lịch sử Hóa đơn.' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.couponUsage.deleteMany({ where: { couponId: id } });
            await tx.coupon.delete({ where: { id } });
        });

        res.json({ message: 'Xóa coupon thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi hệ thống khi xóa mã giảm giá.' });
    }
};

// 3. VALIDATE COUPON (Chốt chặn lúc khách nhập mã)
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const customerId = req.user?.id;

    if (!customerId) return res.status(401).json({ message: 'Vui lòng đăng nhập để sử dụng mã giảm giá.' });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { _count: { select: { CouponUsage: true } } }
    });

    if (!coupon) return res.status(404).json({ message: 'Mã coupon không tồn tại' });
    
    const now = new Date()
    if (now < coupon.createdAt) return res.status(400).json({ message: 'Mã giảm giá này chưa đến thời gian áp dụng' });
    if (now > coupon.expireAt) return res.status(400).json({ message: 'Mã coupon đã hết hạn' });

    // 🚀 BƯỚC QUAN TRỌNG NHẤT: KIỂM TRA LƯỢT DÙNG TOÀN CỤC TRƯỚC
    const globalUsedCount = await prisma.cart.count({
        where: {
            OR: [{ couponId: coupon.id }, { shippingCouponId: coupon.id }],
            status: { notIn: ['DRAFT', 'CANCELLED'] }
        }
    });

    // Nếu hệ thống đã đạt max usageLimit -> Báo lỗi luôn, bất kể trong ví khách còn hay không!
    if (globalUsedCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Rất tiếc! Mã giảm giá này đã hết lượt sử dụng trên toàn hệ thống.' });
    }

    // Sau khi qua được ải Global, mới kiểm tra xem trong ví khách hàng còn lượt không (Personal Limit)
    const userWalletItem = await prisma.couponUsage.findFirst({
        where: { couponId: coupon.id, customerId: customerId, status: 'ACTIVE', remaining: { gt: 0 } }
    });

    if (!userWalletItem) {
        // Nếu là mã Public (khách tự gõ), ta đã check Global ở trên rồi, nên cho qua.
        // Tuy nhiên, nếu bạn muốn BẮT BUỘC khách phải lưu vào ví mới được xài thì return lỗi ở đây.
        // Hiện tại cứ cho phép khách xài mã Public nếu Global chưa hết.
    }

    const rule = coupon.rule || { minOrderValue: 0 };
    if (orderTotal < rule.minOrderValue) {
      return res.status(400).json({ message: `Hóa đơn tối thiểu phải từ ${new Intl.NumberFormat('vi-VN').format(rule.minOrderValue)}đ` });
    }

    res.json({ 
        valid: true, 
        coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            category: coupon.category,
            maxDiscountValue: rule.maxDiscountValue 
        }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống khi kiểm tra mã.' });
  }
};

// ... (Các code cũ ở orderController.js giữ nguyên)

// =========================================================================
// 🚀 TÍNH NĂNG MỚI: HỦY ĐƠN HÀNG (Dành cho Khách Hàng / Admin)
// =========================================================================
export const cancelOrder = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role; // Giả sử bạn có lưu role trong token (User: 2001, Admin: 5150)

    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập." });

    try {
        // 1. Tìm đơn hàng
        const order = await prisma.cart.findUnique({
            where: { id },
            include: { orderDetails: true }
        });

        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

        // 2. Kiểm tra quyền Hủy (Khách chỉ hủy được đơn của mình, Admin hủy được mọi đơn)
        const isAdmin = userRole === 5150 || userRole === 'Admin';
        if (!isAdmin && order.customerId !== userId) {
            return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này." });
        }

        // 3. Kiểm tra Trạng thái (Chỉ được hủy khi đang PENDING)
        if (order.status !== 'PENDING') {
            return res.status(400).json({ message: "Không thể hủy đơn hàng đã được xử lý hoặc đang giao." });
        }

        // 4. KIỂM TRA THỜI GIAN (Quy tắc 2 Giờ) - Bỏ qua nếu là Admin
        if (!isAdmin) {
            const now = new Date();
            const orderTime = new Date(order.createdAt);
            const diffInHours = (now - orderTime) / (1000 * 60 * 60);

            if (diffInHours > 2) {
                return res.status(400).json({ message: "Đã quá 2 tiếng kể từ lúc đặt hàng. Vui lòng liên hệ Admin để được hỗ trợ." });
            }
        }

        // 5. THỰC HIỆN HỦY VÀ HOÀN TRẢ (Dùng Transaction)
        await prisma.$transaction(async (tx) => {
            // A. Hoàn trả Tồn kho (Inventory)
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

            // B. Hoàn trả lượt dùng Mã giảm giá Đơn hàng (Nếu có)
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

            // C. Hoàn trả lượt dùng Mã giảm giá Vận chuyển (Nếu có)
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

            // D. Cập nhật trạng thái Đơn hàng
            await tx.cart.update({
                where: { id },
                data: { status: 'CANCELLED' }
            });
        });

        res.json({ message: "Hủy đơn hàng thành công. Tồn kho và Voucher đã được hoàn trả." });

    } catch (error) {
        console.error("Lỗi khi hủy đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi hủy đơn hàng." });
    }
};