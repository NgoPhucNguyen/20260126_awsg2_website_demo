// server/controllers/productController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// Get product from DB 
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
      sort,
      status
    } = req.query;
    
    // 2. Build the dynamic 'where' object
    // Cái này mình có thể điều chỉnh thay vì sử dụng DB không cần thiết.
    // VD : xóa 1 sản phẩm
    const whereClause = {};

    if (status === 'archived') {
        whereClause.isActive = false; 
    } else {
        whereClause.isActive = true; // Default behavior for the main store
    }

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
            gte: minPrice ? Number(minPrice) : 1000,  
            lte: maxPrice ? Number(maxPrice) : 1000000, // 1 trieu em oi
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
            images: true, // Get images to show thumbnail
            inventories: true
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
// This func build for Filter
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
            images: true // Important: Get images for each variant
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
// GET /api/products/:id/related
export const getRelatedProducts = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // 1. Get current product's category
    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { categoryId: true }
    });

    if (!currentProduct) return res.json([]);

    // 2. Find 4 other products in same category
    const related = await prisma.product.findMany({
      where: {
        categoryId: currentProduct.categoryId,
        NOT: { id: id } // Don't show the current product again
      },
      take: 4,
      include: {
        variants: {
          include: { images: true },
          take: 1 // We only need 1 variant for the card
        },
        brand: true
      }
    });

    res.json(related);
  } catch (error) {
    console.error(error);
    res.json([]); // Return empty array on error, don't crash
  }
};
// NOT USING DB .Delete using the whereClause. 
// server/controllers/productController.js

export const deleteProduct = async (req, res) => {
  try {
    // 1️⃣ Get the ID from the URL (e.g., /api/products/5)
    const { id } = req.params;

    // 2️⃣ Double-check the product actually exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 3️⃣ 🛡️ THE SOFT DELETE: Update isActive to false
    await prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: false } // 👈 The magic switch!
    });

    // 4️⃣ Send success message back to React
    res.json({ message: "Product successfully hidden from the store!" });

  } catch (error) {
    console.error("Soft delete error:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};


// ♻️ RESTORE PRODUCT (UNDO)
export const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: true } // 👈 Flips it back on!
    });

    res.json({ message: "Product restored to the store!" });
  } catch (error) {
    console.error("Restore error:", error);
    res.status(500).json({ error: "Failed to restore product" });
  }
};


// server/controllers/productController.js

export const createProduct = async (req, res) => {
    try {
        // 1. Get all the simple data from the React form
        const { 
            name, nameVn, brandId, categoryId, description, 
            ingredient, skinType, sku, unitPrice, stock, imageUrls 
        } = req.body;

        // 2. 🏢 THE WAREHOUSE TRICK
        // Find the first warehouse. If the DB is empty, create a dummy one!
        let warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) {
            warehouse = await prisma.warehouse.create({
                data: {
                    name: "Main Warehouse",
                    fullAddress: "System Default",
                    province: "Default", district: "Default", ward: "Default", streetAddress: "Default"
                }
            });
        }

        const imageRecords = imageUrls.map((url, index) => ({
            imageUrl: url,
            displayOrder: index + 1, // 1st image is 1, 2nd is 2...
            altText: `${name} image ${index + 1}`
        }));

        // 3. 🛡️ THE MASSIVE SINGLE QUERY (Nested Writes)
        // This safely creates the Product, Variant, Image, and Inventory all at once!
        const newProduct = await prisma.product.create({
            data: {
                name,
                nameVn: nameVn || name, 
                brandId,
                categoryId: Number(categoryId),
                description,
                ingredient,
                skinType,
                isActive: true, 
                
                // Nest the Variant creation
                variants: {
                    create: [{
                        sku: sku || `SKU-${Date.now()}`, 
                        unitPrice: Number(unitPrice),
                        thumbnailUrl: imageUrls[0] || "",
                        specification: { packaging: "Standard" }, 
                        
                        // Nest the High-Res Image creation
                        images: {
                            create: imageRecords
                        },
                        
                        // Nest the Inventory creation
                        inventories: {
                            create: [{
                                warehouseId: warehouse.id,
                                quantity: Number(stock)
                            }]
                        }
                    }]
                }
            }, // 👈 THE FIX: Close the 'data' object right here with a comma!

            // 🌟 NOW include is a sibling to data
            include: {
                category: true,
                variants: {
                    include: {
                        images: true,
                        inventories: true
                    }
                }
            }
        });

        res.status(201).json({ message: "Product created successfully!", product: newProduct });
        
    } catch (error) {
        console.error("❌ Error creating product:", error);
        res.status(500).json({ error: "Failed to create product in database." });
    }
};