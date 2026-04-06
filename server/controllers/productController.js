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
  const name = product.name?.trim() || 'Không có tên tiếng Anh';
  const nameVn = product.nameVn?.trim() || 'Không có tên tiếng Việt';
  const description = product.description?.trim() || 'Không có mô tả';
  const ingredient = product.ingredient?.trim() || 'Không có thành phần';

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
    throw new Error(`Kích thước embedding không hợp lệ: ${dimensions}`);
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
    const targetSkinTypes = ["da thường", "da nhạy cảm", "da khô", "da dầu", "da mụn"];

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

    const targetKeywords = ["da thường", "da nhạy cảm", "da khô", "da dầu", "da mụn"];
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

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    await prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: false } 
    });

    res.json({ message: "Đã ẩn sản phẩm khỏi cửa hàng!" });

  } catch (error) {
    console.error("[SOFT_DELETE_ERROR]:", error);
    res.status(500).json({ error: "Xóa sản phẩm thất bại" });
  }
};

export const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: true } 
    });

    res.json({ message: "Đã khôi phục sản phẩm trên cửa hàng!" });
  } catch (error) {
    console.error("[RESTORE_PRODUCT_ERROR]:", error);
    res.status(500).json({ error: "Khôi phục sản phẩm thất bại" });
  }
};

export const createProduct = async (req, res) => {
    try {
        const { 
            name, nameVn, brandId, categoryId, description, 
            ingredient, skinType, sku, unitPrice, stock, imageUrls 
        } = req.body;

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
                
                variants: {
                    create: [{
                        sku: sku || `SKU-${Date.now()}`, 
                        unitPrice: Number(unitPrice),
                        thumbnailUrl: safeImageUrls[0] || "",
                        specification: { packaging: "Standard" }, 
                        
                        images: {
                            create: imageRecords
                        },
                        
                        inventories: {
                            create: [{
                                warehouseId: warehouse.id,
                                quantity: Number(stock)
                            }]
                        }
                    }]
                }
            }, 

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

        res.status(201).json({ message: "Tạo sản phẩm thành công!", product: newProduct });
        
    } catch (error) {
        console.error("[CREATE_PRODUCT_ERROR]:", error);
        res.status(500).json({ error: "Lưu sản phẩm vào cơ sở dữ liệu thất bại." });
    }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: 'Mã sản phẩm không hợp lệ' });
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
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
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

    return res.json({ message: 'Cập nhật sản phẩm thành công!', product: updatedProduct });
  } catch (error) {
    console.error('[UPDATE_PRODUCT_ERROR]:', error);
    return res.status(500).json({ error: 'Cập nhật sản phẩm thất bại.' });
  }
};