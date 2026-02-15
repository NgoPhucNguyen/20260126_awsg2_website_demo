// server/controllers/productController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProducts = async (req, res) => {
  try {
    // 1. Destructure query params from the URL
    // Example URL: /api/products?search=turmeric&brandId=abc-123&minPrice=50000&sort=price_asc
    const { 
      search, 
      brandId, 
      categoryId, 
      skinType, 
      minPrice, 
      maxPrice,
      sort 
    } = req.query;

    // 2. Build the dynamic 'where' object
    const whereClause = {
      isActive: true, // Only show active products
    };

    // --- Search Logic (Name OR Vietnamese Name) ---
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } }, // Case insensitive
        { nameVn: { contains: search, mode: 'insensitive' } }
      ];
    }

    // --- Filter: Brand & Category ---
    // We split by comma to allow filtering multiple brands: ?brandId=id1,id2
    if (brandId) {
      whereClause.brandId = { in: brandId.split(',') };
    }
    if (categoryId) {
      whereClause.categoryId = { in: categoryId.split(',').map(Number) }; // Convert to Int
    }
    if (skinType) {
      whereClause.skinType = skinType;
    }

    // --- Filter: Price Range (The Tricky Part) ---
    // Find products where AT LEAST ONE variant fits the price range
    if (minPrice || maxPrice) {
      whereClause.variants = {
        some: {
          unitPrice: {
            gte: minPrice ? Number(minPrice) : 0,
            lte: maxPrice ? Number(maxPrice) : 999999999,
          },
        },
      };
    }

    // 3. Sorting Logic
    let orderBy = {};
    if (sort === 'price_asc') {
      // Sort by the price of the first variant (simplified)
      orderBy = { variants: { _count: 'desc' } }; // This is complex in Prisma, often easier to sort in JS or aggregate
      // Note: Sorting relations in Prisma is hard. For V1, let's sort by creation date
      orderBy = { id: 'desc' }; 
    } else if (sort === 'name_asc') {
      orderBy = { name: 'asc' };
    } else {
      orderBy = { id: 'desc' }; // Default: Newest first
    }

    // 4. Execute Query
    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: orderBy,
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            images: true // Get images to show thumbnail
          }
        }
      }
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};


// Get all available brands, categories, and skin types to build the Sidebar
export const getFilterAttributes = async (req, res) => {
  try {
    const [brands, categories, skinTypes] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.category.findMany({ select: { id: true, name: true, nameVn: true } }),
      // Group by skinType to get unique values
      prisma.product.groupBy({
        by: ['skinType'],
        where: { skinType: { not: null } }
      })
    ]);

    res.json({
      brands,
      categories,
      skinTypes: skinTypes.map(item => item.skinType)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attributes' });
  }
};