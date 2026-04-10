// server/controllers/productController.js
import prisma from '../prismaClient.js';

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Lấy danh sách sản phẩm
export const getProducts = async (req, res) => {
  try {
    const { 
      search, 
      brandId, 
      categoryId, 
      skinType, 
      minPrice, 
      maxPrice,
      sort,
      status
    } = req.query;
    
    const whereClause = {};

    if (status === 'archived') {
        whereClause.isActive = false; 
    } else {
        whereClause.isActive = true; 
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } }, 
        { nameVn: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (brandId) {
      whereClause.brandId = { in: brandId.split(',') };
    }
    if (categoryId) {
      whereClause.categoryId = { in: categoryId.split(',').map(Number) }; 
    }  
    if (skinType) {
        const selectedSkins = skinType.split(','); 
        whereClause.AND = whereClause.AND || [];
        whereClause.AND.push({
            OR: selectedSkins.map(skin => ({
                skinType: {
                    contains: skin.trim(),
                    mode: 'insensitive' 
                }
            }))
        });
    } 

    if (minPrice || maxPrice) {
      whereClause.variants = {
        some: {
          unitPrice: {
            gte: minPrice ? Number(minPrice) : 1000,  
            lte: maxPrice ? Number(maxPrice) : 1000000, 
          },
        },
      };
    }

    let orderBy = {};
    if (sort === 'price_asc') {
      orderBy = { id: 'desc' }; 
    } else if (sort === 'name_asc') {
      orderBy = { name: 'asc' };
    } else {
      orderBy = { id: 'desc' }; 
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: orderBy,
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            images: true, 
            inventories: true,
            promotions: {
                include: {
                    promotion: true
                }
            }
          }
        }
      }
    });

    const formattedProducts = products.map(product => {
        const formattedVariants = product.variants.map(variant => {
            const totalStock = variant.inventories?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            return {
                ...variant,
                stock: totalStock 
            };
        });
        return {
            ...product,
            variants: formattedVariants
        };
    });

    res.json(formattedProducts); 
  } catch (error) {
    console.error("[GET_PRODUCTS_ERROR]:", error);
    res.status(500).json({ error: 'Không thể lấy danh sách sản phẩm' });
  }
};


export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            images: true, 
            inventories: true, 
            promotions: {
                include: {
                    promotion: true
                }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }
    const formattedVariants = product.variants.map(variant => {
        const totalStock = variant.inventories?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return { ...variant, stock: totalStock };
    });

    res.json({ ...product, variants: formattedVariants });
    } catch (error) {
      console.error("[GET_PRODUCT_BY_ID_ERROR]:", error);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
};

export const getFilterAttributes = async (req, res) => {
  try {
    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.category.findMany({ select: { id: true, name: true, nameVn: true } }),
    ]);
    const targetSkinTypes = ["da thường", "da nhạy cảm", "da khô", "da dầu"];

    res.json({
      brands,
      categories,
      skinTypes: targetSkinTypes
    });
  } catch (error) {
    console.error("[GET_FILTER_ATTR_ERROR]:", error);
    res.status(500).json({ error: 'Không thể lấy thuộc tính bộ lọc' });
  }
};

export const getRelatedProducts = async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
        return res.json([]); 
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, skinType: true } 
    });

    if (!currentProduct) return res.json([]);

    const targetKeywords = ["da thường", "da nhạy cảm", "da khô", "da dầu"];
    const currentSkinString = (currentProduct.skinType || "").toLowerCase();
    
    const matchedKeywords = targetKeywords.filter(keyword => 
      currentSkinString.includes(keyword)
    );

    let whereClause = {
      NOT: { id: productId }, 
      isActive: true  
    };

    if (matchedKeywords.length > 0) {
      whereClause.OR = matchedKeywords.map(keyword => ({
        skinType: {
          contains: keyword,
          mode: 'insensitive' 
        }
      }));
    } else {
      whereClause.categoryId = currentProduct.categoryId;
    }

    const related = await prisma.product.findMany({
      where: whereClause,
      take: 20,
      include: {
        brand: true,
        category: true,
        variants: {
          include: { 
            images: true,
            inventories: true,
            promotions: {
                include: {
                    promotion: true
                }
            }
          },
          take: 1 
        },
        brand: true
      }
    });
    const formattedRelated = related.map(prod => {
    const formattedVariants = prod.variants.map(variant => {
        const totalStock = variant.inventories?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return { ...variant, stock: totalStock };
    });
    return { ...prod, variants: formattedVariants };
    });

    const randomizedProducts = shuffleArray(formattedRelated).slice(0, 8);
    res.json(randomizedProducts);
  } catch (error) {
    console.error("[GET_RELATED_ERROR]:", error);
    res.json([]); 
  }
};


// server/controllers/productController.js

export const getQuickSearchResults = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search || search.trim().length < 2) {
      return res.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameVn: { contains: search, mode: 'insensitive' } }
        ],
      },
      take: 5, // 🚀 Giới hạn đúng 5 sản phẩm như bạn muốn
      select: {
        id: true,
        name: true,
        nameVn: true,
        // 🚀 Chỉ lấy biến thể đầu tiên để lấy giá và ảnh thumbnail, không lấy inventories
        variants: {
          take: 1,
          select: {
            unitPrice: true,
            thumbnailUrl: true,
          }
        }
      }
    });

    res.json(products);
  } catch (error) {
    console.error("[QUICK_SEARCH_ERROR]:", error);
    res.status(500).json({ error: 'Lỗi tìm kiếm nhanh' });
  }
};