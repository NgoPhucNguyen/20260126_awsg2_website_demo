import prisma from '../prismaClient.js';

const extractVariantIdsFromBody = (body = {}) => {
  const candidate =
    body.applicableVariants ??
    body.applicableVariantIds ??
    body.selectedVariantIds ??
    body.productIds ??
    [];

  if (!Array.isArray(candidate)) return [];

  return [...new Set(candidate.map(id => parseInt(id, 10)).filter(Number.isInteger))];
};

const withApplicableVariantIds = (promotion) => ({
  ...promotion,
  applicableVariantIds: (promotion.products || []).map(item => item.productVariantId)
});

// Lấy danh sách tất cả khuyến mãi
export const getPromotions = async (req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      include: {
        products: {
          include: {
            variant: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
    res.json(promotions.map(withApplicableVariantIds));
  } catch (error) {
    console.error("[GET_PROMOTIONS_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách khuyến mãi' });
  }
};

// Lấy chi tiết khuyến mãi theo ID
export const getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            variant: true
          }
        }
      }
    });
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    }
    res.json(withApplicableVariantIds(promotion));
  } catch (error) {
    console.error("[GET_PROMOTION_BY_ID_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết khuyến mãi' });
  }
};

// Tạo khuyến mãi mới
export const createPromotion = async (req, res) => {
  try {
    const { type, value, description, startTime, endTime, rule } = req.body;
    const variantIds = extractVariantIdsFromBody(req.body);

    if (!type || value === undefined || !startTime || !endTime) {
      return res.status(400).json({
        message: 'Thiếu thông tin bắt buộc: Loại, Giá trị, Thời gian bắt đầu và kết thúc'
      });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      return res.status(400).json({
        message: 'Loại khuyến mãi không hợp lệ. Chỉ chấp nhận PERCENTAGE (Phần trăm) hoặc FIXED (Giá cố định)'
      });
    }

    const parsedValue = parseFloat(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return res.status(400).json({ message: 'Giá trị khuyến mãi phải là số lớn hơn 0' });
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);
    if (Number.isNaN(parsedStartTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Thời gian bắt đầu hoặc kết thúc không đúng định dạng' });
    }
    if (parsedEndTime <= parsedStartTime) {
      return res.status(400).json({ message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu' });
    }

    if (variantIds.length > 0) {
      const foundVariants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true }
      });
      const foundVariantIdSet = new Set(foundVariants.map(item => item.id));
      const invalidVariantIds = variantIds.filter(id => !foundVariantIdSet.has(id));

      if (invalidVariantIds.length > 0) {
        return res.status(400).json({
          message: 'Một số sản phẩm áp dụng không tồn tại trong hệ thống',
          invalidVariantIds
        });
      }
    }

    const promotion = await prisma.promotion.create({
      data: {
        type,
        value: parsedValue,
        description,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        rule: rule && typeof rule === 'object' ? rule : {},
        products: {
          create: variantIds.map(productVariantId => ({
            productVariantId: parseInt(productVariantId)
          }))
        }
      },
      include: {
        products: {
          include: {
            variant: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Tạo khuyến mãi thành công',
      promotion: withApplicableVariantIds(promotion)
    });
  } catch (error) {
    console.error("[CREATE_PROMOTION_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo khuyến mãi' });
  }
};

// Cập nhật khuyến mãi
export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, description, startTime, endTime, rule } = req.body;
    const variantIds = extractVariantIdsFromBody(req.body);
    const shouldReplaceVariants =
      req.body.applicableVariants !== undefined ||
      req.body.applicableVariantIds !== undefined ||
      req.body.selectedVariantIds !== undefined ||
      req.body.productIds !== undefined;

    if (type !== undefined && !['PERCENTAGE', 'FIXED'].includes(type)) {
      return res.status(400).json({
        message: 'Loại khuyến mãi không hợp lệ. Chỉ chấp nhận PERCENTAGE (Phần trăm) hoặc FIXED (Giá cố định)'
      });
    }

    const parsedValue = value !== undefined ? parseFloat(value) : undefined;
    if (value !== undefined && (!Number.isFinite(parsedValue) || parsedValue <= 0)) {
      return res.status(400).json({ message: 'Giá trị khuyến mãi phải là số lớn hơn 0' });
    }

    const parsedStartTime = startTime !== undefined ? new Date(startTime) : undefined;
    const parsedEndTime = endTime !== undefined ? new Date(endTime) : undefined;

    if (startTime !== undefined && Number.isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ message: 'Thời gian bắt đầu không đúng định dạng' });
    }
    if (endTime !== undefined && Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Thời gian kết thúc không đúng định dạng' });
    }

    const existingPromotion = await prisma.promotion.findUnique({
      where: { id },
      select: { startTime: true, endTime: true }
    });

    if (!existingPromotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    }

    const effectiveStartTime = parsedStartTime ?? existingPromotion.startTime;
    const effectiveEndTime = parsedEndTime ?? existingPromotion.endTime;
    if (effectiveEndTime <= effectiveStartTime) {
      return res.status(400).json({ message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu' });
    }

    if (rule !== undefined && (!rule || typeof rule !== 'object' || Array.isArray(rule))) {
      return res.status(400).json({ message: 'Điều kiện khuyến mãi (rule) không hợp lệ' });
    }

    if (shouldReplaceVariants && variantIds.length > 0) {
      const foundVariants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true }
      });
      const foundVariantIdSet = new Set(foundVariants.map(item => item.id));
      const invalidVariantIds = variantIds.filter(item => !foundVariantIdSet.has(item));

      if (invalidVariantIds.length > 0) {
        return res.status(400).json({
          message: 'Một số sản phẩm áp dụng không tồn tại trong hệ thống',
          invalidVariantIds
        });
      }
    }

    if (shouldReplaceVariants) {
      await prisma.productPromotion.deleteMany({
        where: { promotionId: id }
      });
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(value !== undefined && { value: parsedValue }),
        ...(description !== undefined && { description }),
        ...(startTime !== undefined && { startTime: parsedStartTime }),
        ...(endTime !== undefined && { endTime: parsedEndTime }),
        ...(rule !== undefined && { rule }),
        ...(shouldReplaceVariants && {
          products: {
            create: variantIds.map(productVariantId => ({
              productVariantId: parseInt(productVariantId)
            }))
          }
        })
      },
      include: {
        products: {
          include: {
            variant: true
          }
        }
      }
    });

    res.json({
      message: 'Cập nhật khuyến mãi thành công',
      promotion: withApplicableVariantIds(promotion)
    });
  } catch (error) {
    console.error("[UPDATE_PROMOTION_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật khuyến mãi' });
  }
};

// Xóa khuyến mãi
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.productPromotion.deleteMany({
      where: { promotionId: id }
    });

    await prisma.promotion.delete({
      where: { id }
    });

    res.json({ message: 'Xóa khuyến mãi thành công' });
  } catch (error) {
    console.error("[DELETE_PROMOTION_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa khuyến mãi' });
  }
};

// Thêm sản phẩm vào khuyến mãi
export const addProductToPromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { productVariantId } = req.body;

    const existing = await prisma.productPromotion.findFirst({
      where: {
        promotionId,
        productVariantId: parseInt(productVariantId)
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Sản phẩm này đã được thêm vào khuyến mãi' });
    }

    const productPromo = await prisma.productPromotion.create({
      data: {
        promotionId,
        productVariantId: parseInt(productVariantId)
      },
      include: {
        variant: true
      }
    });

    res.json({
      message: 'Thêm sản phẩm vào khuyến mãi thành công',
      productPromo
    });
  } catch (error) {
    console.error("[ADD_PRODUCT_PROMOTION_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi thêm sản phẩm vào khuyến mãi' });
  }
};

// Xóa sản phẩm khỏi khuyến mãi
export const removeProductFromPromotion = async (req, res) => {
  try {
    const { productPromotionId } = req.params;

    await prisma.productPromotion.delete({
      where: { id: productPromotionId }
    });

    res.json({ message: 'Xóa sản phẩm khỏi khuyến mãi thành công' });
  } catch (error) {
    console.error("[REMOVE_PRODUCT_PROMOTION_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa sản phẩm khỏi khuyến mãi' });
  }
};

// Lấy danh sách khuyến mãi đang diễn ra
export const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        startTime: {
          lte: now
        },
        endTime: {
          gte: now
        }
      },
      include: {
        products: {
          include: {
            variant: true
          }
        }
      }
    });
    res.json(promotions.map(withApplicableVariantIds));
  } catch (error) {
    console.error("[GET_ACTIVE_PROMOTIONS_ERROR]:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách khuyến mãi đang diễn ra' });
  }
};