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

// get list promotions
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
    res.status(500).json({ error: error.message });
  }
};

// promotion by id
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
      return res.status(404).json({ message: 'Promotion không tìm thấy' });
    }
    res.json(withApplicableVariantIds(promotion));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// create promotion
export const createPromotion = async (req, res) => {
  try {
    const { type, value, description, startTime, endTime, rule } = req.body;
    const variantIds = extractVariantIdsFromBody(req.body);

    if (!type || value === undefined || !startTime || !endTime) {
      return res.status(400).json({
        message: 'Thiếu thông tin bắt buộc: type, value, startTime, endTime'
      });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      return res.status(400).json({
        message: 'type không hợp lệ. Chỉ chấp nhận PERCENTAGE hoặc FIXED'
      });
    }

    const parsedValue = parseFloat(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return res.status(400).json({ message: 'value phải là số lớn hơn 0' });
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);
    if (Number.isNaN(parsedStartTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'startTime hoặc endTime không đúng định dạng' });
    }
    if (parsedEndTime <= parsedStartTime) {
      return res.status(400).json({ message: 'endTime phải lớn hơn startTime' });
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
          message: 'Một số productVariantId không tồn tại',
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
      message: 'Tạo promotion thành công',
      promotion: withApplicableVariantIds(promotion)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo promotion', error: error.message });
  }
};

// update promotion
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
        message: 'type không hợp lệ. Chỉ chấp nhận PERCENTAGE hoặc FIXED'
      });
    }

    const parsedValue = value !== undefined ? parseFloat(value) : undefined;
    if (value !== undefined && (!Number.isFinite(parsedValue) || parsedValue <= 0)) {
      return res.status(400).json({ message: 'value phải là số lớn hơn 0' });
    }

    const parsedStartTime = startTime !== undefined ? new Date(startTime) : undefined;
    const parsedEndTime = endTime !== undefined ? new Date(endTime) : undefined;

    if (startTime !== undefined && Number.isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ message: 'startTime không đúng định dạng' });
    }
    if (endTime !== undefined && Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'endTime không đúng định dạng' });
    }

    const existingPromotion = await prisma.promotion.findUnique({
      where: { id },
      select: { startTime: true, endTime: true }
    });

    if (!existingPromotion) {
      return res.status(404).json({ message: 'Promotion không tìm thấy' });
    }

    const effectiveStartTime = parsedStartTime ?? existingPromotion.startTime;
    const effectiveEndTime = parsedEndTime ?? existingPromotion.endTime;
    if (effectiveEndTime <= effectiveStartTime) {
      return res.status(400).json({ message: 'endTime phải lớn hơn startTime' });
    }

    if (rule !== undefined && (!rule || typeof rule !== 'object' || Array.isArray(rule))) {
      return res.status(400).json({ message: 'rule phải là object JSON hợp lệ' });
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
          message: 'Một số productVariantId không tồn tại',
          invalidVariantIds
        });
      }
    }

    // Replace variant links only when the request explicitly provides variant ids.
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
      message: 'Cập nhật promotion thành công',
      promotion: withApplicableVariantIds(promotion)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật promotion', error: error.message });
  }
};

// delete promotion
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    // delete all product promotions before deleting the promotion
    await prisma.productPromotion.deleteMany({
      where: { promotionId: id }
    });

    await prisma.promotion.delete({
      where: { id }
    });

    res.json({ message: 'Xóa promotion thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// add product to promotion
export const addProductToPromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { productVariantId } = req.body;

    // check if product already in promotion
    const existing = await prisma.productPromotion.findFirst({
      where: {
        promotionId,
        productVariantId: parseInt(productVariantId)
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Sản phẩm đã có trong promotion' });
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
      message: 'Thêm sản phẩm vào promotion thành công',
      productPromo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// remove product from promotion
export const removeProductFromPromotion = async (req, res) => {
  try {
    const { promotionId, productPromotionId } = req.params;

    await prisma.productPromotion.delete({
      where: { id: productPromotionId }
    });

    res.json({ message: 'Xóa sản phẩm khỏi promotion thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get active promotions
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
    res.status(500).json({ error: error.message });
  }
};
