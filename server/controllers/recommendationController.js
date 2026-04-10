import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRecommendedProducts = async (req, res) => {
  try {
    // 🚀 Nhận thêm tham số sortPrice ('asc' - Tăng dần, 'desc' - Giảm dần) từ Client
    const { skinType, conditionKeyword, stepKeywords, sortPrice } = req.body; 

    if (!stepKeywords || stepKeywords.length === 0) {
      return res.status(200).json({});
    }

    const categorizedProducts = {};
    const MAX_ITEMS = 4; // Lấy tối đa 4 sản phẩm, tối thiểu sẽ cố gắng đạt >= 2

    await Promise.all(stepKeywords.map(async (categoryNameEng) => {
      let matchedProducts = [];

      // Hàm query chung để tái sử dụng
      const fetchProducts = async (whereConditions, takeCount) => {
        return await prisma.product.findMany({
          where: { isActive: true, ...whereConditions },
          include: {
            brand: true, category: true,
            variants: { include: { images: true, inventories: true, promotions: { include: { promotion: true } } } }
          },
          take: takeCount
        });
      };

      // 🌊 TẦNG 1: Khắt khe nhất (Category + SkinType + ConditionKeyword)
      if (conditionKeyword && skinType) {
        const tier1 = await fetchProducts({
          category: { name: { equals: categoryNameEng, mode: 'insensitive' } },
          skinType: { contains: skinType, mode: 'insensitive' },
          nameVn: { contains: conditionKeyword, mode: 'insensitive' } // Tìm tính năng (VD: "Ngừa mụn") trong tên SP
        }, MAX_ITEMS);
        matchedProducts.push(...tier1);
      }

      // 🌊 TẦNG 2: Nới lỏng 1 (Category + SkinType)
      if (matchedProducts.length < MAX_ITEMS && skinType) {
        const existingIds = matchedProducts.map(p => p.id);
        const tier2 = await fetchProducts({
          id: { notIn: existingIds },
          category: { name: { equals: categoryNameEng, mode: 'insensitive' } },
          skinType: { contains: skinType, mode: 'insensitive' }
        }, MAX_ITEMS - matchedProducts.length);
        matchedProducts.push(...tier2);
      }

      // 🌊 TẦNG 3: Chữa cháy (Chỉ cần đúng Category)
      if (matchedProducts.length < MAX_ITEMS) {
        const existingIds = matchedProducts.map(p => p.id);
        const tier3 = await fetchProducts({
          id: { notIn: existingIds },
          category: { name: { equals: categoryNameEng, mode: 'insensitive' } }
        }, MAX_ITEMS - matchedProducts.length);
        matchedProducts.push(...tier3);
      }

      // BƯỚC FORMAT DATA (Tính giá Sale & Tồn kho)
      let formattedProducts = matchedProducts.map(product => {
        const formattedVariants = product.variants.map(variant => {
          const totalStock = variant.inventories?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          let finalPrice = variant.unitPrice;
          let isSale = false;
          let discountType = null;
          let discountValue = null;

          const activePromo = variant.promotions?.find(p => {
            const now = new Date();
            const promo = p.promotion;
            return promo.isActive && promo.startDate <= now && promo.endDate >= now;
          });

          if (activePromo) {
            isSale = true;
            discountType = activePromo.promotion.discountType;
            discountValue = activePromo.promotion.discountValue;
            if (discountType === 'PERCENTAGE') {
              finalPrice = variant.unitPrice * (1 - discountValue / 100);
            } else if (discountType === 'FIXED_AMOUNT') {
              finalPrice = Math.max(0, variant.unitPrice - discountValue);
            }
          }

          return {
            ...variant, stock: totalStock, image: variant.images?.[0]?.imageUrl || variant.thumbnailUrl,
            price: finalPrice, originalPrice: variant.unitPrice, isSale, discountType, discountValue
          };
        });

        return {
          ...product, variants: formattedVariants, brandName: product.brand?.name || "", categoryName: product.category?.nameVn || "", 
          price: formattedVariants[0]?.price, originalPrice: formattedVariants[0]?.originalPrice, isSale: formattedVariants[0]?.isSale,
          discountType: formattedVariants[0]?.discountType, discountValue: formattedVariants[0]?.discountValue,
          stock: formattedVariants[0]?.stock, image: formattedVariants[0]?.image, variantId: formattedVariants[0]?.id
        };
      });

      // 🚀 TÍNH NĂNG MỚI: SẮP XẾP THEO GIÁ (Dành cho Customer)
      if (sortPrice === 'asc') {
        formattedProducts.sort((a, b) => a.price - b.price); // Rẻ nhất lên đầu
      } else if (sortPrice === 'desc') {
        formattedProducts.sort((a, b) => b.price - a.price); // Đắt nhất lên đầu
      }

      categorizedProducts[categoryNameEng] = formattedProducts;
    }));

    return res.status(200).json(categorizedProducts);

  } catch (error) {
    console.error("Lỗi khi tìm kiếm sản phẩm gợi ý:", error);
    return res.status(500).json({ error: "Lỗi máy chủ khi lấy sản phẩm" });
  }
};