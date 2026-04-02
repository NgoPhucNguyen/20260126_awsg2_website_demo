// controllers/recommendationController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRecommendedProducts = async (req, res) => {
  try {
    const { skinType, conditionKeyword, stepKeywords } = req.body; 

    if (!stepKeywords || stepKeywords.length === 0) {
      return res.status(200).json({});
    }

    // 1. LỌC THEO LOẠI DA 
    let whereClause = { isActive: true };
    if (skinType) {
      whereClause.skinType = { contains: skinType, mode: 'insensitive' };
    }

    // 2. GOM SẢN PHẨM DỰA VÀO BẢNG CATEGORY (Cực kỳ tối ưu)
    // Tìm keyword trong Tên Danh Mục (category.nameVn) HOẶC dự phòng tìm trong Tên SP (nameVn)
    const orConditions = stepKeywords.flatMap(kw => [
      { category: { nameVn: { contains: kw, mode: 'insensitive' } } },
      { nameVn: { contains: kw, mode: 'insensitive' } } // Giữ lại dự phòng lỡ Admin quên set category
    ]);
    
    if (orConditions.length > 0) {
        whereClause.OR = orConditions;
    }

    // 3. KÉO TẤT CẢ RA (NHỚ INCLUDE CATEGORY ĐỂ LỌC Ở BƯỚC DƯỚI)
    const rawProducts = await prisma.product.findMany({
      where: whereClause,
      include: {
        brand: true,
        category: true, // <--- BẮT BUỘC PHẢI INCLUDE CATEGORY
        variants: {
          include: {
            images: true,
            inventories: true,
            promotions: { include: { promotion: true } }
          }
        }
      },
      take: 50 
    });

    // 4. FORMAT LẠI DATA 
    const formattedProducts = rawProducts.map(product => {
      const formattedVariants = product.variants.map(variant => {
        const totalStock = variant.inventories?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        
        // Tính toán Sale
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
          ...variant,
          stock: totalStock,
          image: variant.images?.[0]?.imageUrl || variant.thumbnailUrl,
          price: finalPrice,
          originalPrice: variant.unitPrice,
          isSale, discountType, discountValue
        };
      });

      return {
        ...product,
        variants: formattedVariants,
        brandName: product.brand?.name || "",
        // Lấy tên category ra ngoài cho dễ dùng
        categoryName: product.category?.nameVn || "", 
        price: formattedVariants[0]?.price,
        originalPrice: formattedVariants[0]?.originalPrice,
        isSale: formattedVariants[0]?.isSale,
        discountType: formattedVariants[0]?.discountType,
        discountValue: formattedVariants[0]?.discountValue,
        stock: formattedVariants[0]?.stock,
        image: formattedVariants[0]?.image,
        variantId: formattedVariants[0]?.id
      };
    });

    // 5. PHÂN LOẠI VÀO RỔ (Ưu tiên check Category Name trước)
    const categorizedProducts = {};
    
    stepKeywords.forEach(keyword => {
       // Lọc: Ưu tiên khớp tên Danh mục, nếu không khớp thì xét tên Sản phẩm
       let matched = formattedProducts.filter(p => {
          const matchCategory = p.categoryName.toLowerCase().includes(keyword.toLowerCase());
          const matchProductName = p.nameVn?.toLowerCase().includes(keyword.toLowerCase());
          return matchCategory || matchProductName;
       });
       
       // Sắp xếp: Ai CÓ conditionKeyword (VD: "Kiềm dầu") trong tên thì được đẩy lên đầu
       if (conditionKeyword) {
          matched.sort((a, b) => {
              const aHasSpecial = a.nameVn?.toLowerCase().includes(conditionKeyword.toLowerCase());
              const bHasSpecial = b.nameVn?.toLowerCase().includes(conditionKeyword.toLowerCase());
              return (aHasSpecial === bHasSpecial) ? 0 : aHasSpecial ? -1 : 1;
          });
       }

       categorizedProducts[keyword] = matched.slice(0, 4); 
    });

    return res.status(200).json(categorizedProducts);

  } catch (error) {
    console.error("Lỗi khi tìm kiếm sản phẩm gợi ý:", error);
    return res.status(500).json({ error: "Lỗi máy chủ khi lấy sản phẩm" });
  }
};