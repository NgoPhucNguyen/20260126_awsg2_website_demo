import prisma from '../prismaClient.js';
import EmbeddingClient from '#server/chatbot/core/embedding_model.js';

const embeddingClient = new EmbeddingClient();
let vectorInfraReady = false;

const toVectorLiteral = (values = []) => {
  const sanitized = values.map((v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  });
  return `[${sanitized.join(',')}]`;
};

const buildProductDocument = (product) => {
  const name = product.name?.trim() || 'Khong co ten tieng Anh';
  const nameVn = product.nameVn?.trim() || 'Khong co ten tieng Viet';
  const description = product.description?.trim() || 'Khong co mo ta';
  const ingredient = product.ingredient?.trim() || 'Khong co thanh phan';

  return [
    `Product ID: ${product.id}`,
    `English Name: ${name}`,
    `Vietnamese Name: ${nameVn}`,
    `Description: ${description}`,
    `Ingredients: ${ingredient}`,
  ].join('\n');
};

const ensureVectorInfra = async (dimensions) => {
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(`Invalid embedding dimensions: ${dimensions}`);
  }

  if (vectorInfraReady) {
    return;
  }

  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS product_vectors (
      product_id INTEGER PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      embedding VECTOR(${dimensions}) NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE product_vectors
    ALTER COLUMN embedding TYPE VECTOR(${dimensions});
  `);
  vectorInfraReady = true;
};

const syncProductVector = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(productId) },
    select: {
      id: true,
      name: true,
      nameVn: true,
      description: true,
      ingredient: true,
    },
  });

  if (!product) {
    return;
  }

  const content = buildProductDocument(product);
  const embedding = await embeddingClient.createEmbedding(content);
  const dimensions = embedding.length;

  await ensureVectorInfra(dimensions);

  const vectorLiteral = toVectorLiteral(embedding);
  const metadata = {
    name: product.name ?? '',
    nameVn: product.nameVn ?? '',
  };

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO product_vectors (product_id, content, embedding, metadata, updated_at)
      VALUES ($1, $2, $3::vector, $4::jsonb, NOW())
      ON CONFLICT (product_id)
      DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `,
    product.id,
    content,
    vectorLiteral,
    JSON.stringify(metadata)
  );
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

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
        // 1. Split the URL string into an array: ["da dầu", "da mụn"]
        const selectedSkins = skinType.split(','); 

        // 2. We use 'AND' here so we don't accidentally overwrite your 'search' logic!
        whereClause.AND = whereClause.AND || [];
        whereClause.AND.push({
            OR: selectedSkins.map(skin => ({
                skinType: {
                    contains: skin.trim(),
                    mode: 'insensitive' // Still ignores uppercase/lowercase!
                }
            }))
        });
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
            // 🧮 THE MATH: Sum up all inventory for this specific variant
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

    res.json(formattedProducts); // Send the calculated data!
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: 'Failed to fetch products' });
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
            images: true, // Important: Get images for each variant
            inventories: true, // Get inventory to check stock
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
      return res.status(404).json({ error: "Product not found" });
    }
    const formattedVariants = product.variants.map(variant => {
        const totalStock = variant.inventories?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return { ...variant, stock: totalStock };
    });

    res.json({ ...product, variants: formattedVariants });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
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
    ]);
    const targetSkinTypes = ["da thường", "da nhạy cảm", "da khô", "da dầu", "da mụn"];

    res.json({
      brands,
      categories,
      skinTypes: targetSkinTypes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attributes' });
  }
};


// GET /api/products/:id/related
export const getRelatedProducts = async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
        return res.json([]); // Return empty if invalid ID
    }

    // 1️⃣ Get current product's category AND skinType
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, skinType: true } // 👈 Added skinType here!
    });

    if (!currentProduct) return res.json([]);

    // 2️⃣ Define our target keywords and check for matches
    const targetKeywords = ["da thường", "da nhạy cảm", "da khô", "da dầu", "da mụn"];
    const currentSkinString = (currentProduct.skinType || "").toLowerCase();
    
    const matchedKeywords = targetKeywords.filter(keyword => 
      currentSkinString.includes(keyword)
    );

    // 3️⃣ Build the dynamic database query (The "Where" Clause)
    let whereClause = {
      NOT: { id: productId }, // Don't show the current product again
      isActive: true   // Safety check: only show active products
    };

    if (matchedKeywords.length > 0) {
      // ✅ If it has a specific skin type, find others with the SAME skin type
      whereClause.OR = matchedKeywords.map(keyword => ({
        skinType: {
          contains: keyword,
          mode: 'insensitive' // Ignore uppercase/lowercase typos from admins!
        }
      }));
    } else {
      // 🔄 Fallback: If no skin type matches, just use the category like you originally did!
      whereClause.categoryId = currentProduct.categoryId;
    }

    // 4️⃣ Fetch the actual products
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
          take: 1 // Perfect! Keep this.
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
    console.error(error);
    res.json([]); // Return empty array on error, don't crash
  }
};

// NOT USING DB .Delete using the whereClause. 
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
        const safeImageUrls = Array.isArray(imageUrls) ? imageUrls : [];
        const imageRecords = safeImageUrls.map((url, index) => ({
            imageUrl: url,
            displayOrder: index + 1,
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
                        thumbnailUrl: safeImageUrls[0] || "",
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

        await syncProductVector(newProduct.id);

        res.status(201).json({ message: "Product created successfully!", product: newProduct });
        
    } catch (error) {
        console.error("❌ Error creating product:", error);
        res.status(500).json({ error: "Failed to create product in database." });
    }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const {
      name,
      nameVn,
      brandId,
      categoryId,
      description,
      ingredient,
      skinType,
      isActive,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(nameVn !== undefined ? { nameVn } : {}),
        ...(brandId !== undefined ? { brandId } : {}),
        ...(categoryId !== undefined ? { categoryId: Number(categoryId) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(ingredient !== undefined ? { ingredient } : {}),
        ...(skinType !== undefined ? { skinType } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        brand: true,
        category: true,
      },
    });

    await syncProductVector(updatedProduct.id);

    return res.json({ message: 'Product updated successfully!', product: updatedProduct });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
};