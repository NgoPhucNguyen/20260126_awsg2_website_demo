// server/controllers/adminProductController.js
import prisma from '../prismaClient.js';
import EmbeddingClient from '#server/chatbot/core/embedding_model.js';

const embeddingClient = new EmbeddingClient();

// Helper: Xây dựng văn bản để tạo embedding
const buildProductDocument = (product) => {
    return [
        `Product ID: ${product.id}`,
        `English Name: ${product.name || ''}`,
        `Vietnamese Name: ${product.nameVn || ''}`,
        `Description: ${product.description || ''}`,
        `Ingredients: ${product.ingredient || ''}`,
    ].join('\n');
};

// Helper: Đồng bộ Vector cho Chatbot
const syncProductVector = async (productId) => {
    const product = await prisma.product.findUnique({
        where: { id: Number(productId) },
    });
    if (!product) return;

    const content = buildProductDocument(product);
    const embedding = await embeddingClient.createEmbedding(content);
    const vectorLiteral = `[${embedding.join(',')}]`;

    await prisma.$executeRawUnsafe(
        `INSERT INTO product_vectors (product_id, content, embedding, metadata, updated_at)
         VALUES ($1, $2, $3::vector, $4::jsonb, NOW())
         ON CONFLICT (product_id) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, updated_at = NOW();`,
        product.id, content, vectorLiteral, JSON.stringify({ nameVn: product.nameVn })
    );
};

// 1. Lấy danh sách Inventory (Cho trang Inventory.jsx)
// server/controllers/adminProductController.js

export const getInventoryAdmin = async (req, res) => {
    try {
        const { page, limit, search, status, all } = req.query; // 🚀 Thêm tham số 'all'

        const whereClause = { isActive: status !== 'archived' };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { nameVn: { contains: search, mode: 'insensitive' } },
            ];
        }

        // 💡 TRƯỜNG HỢP 1: Nếu muốn lấy TOÀN BỘ (Dùng cho Modal chọn sản phẩm trong Khuyến mãi)
        if (all === 'true') {
            const products = await prisma.product.findMany({
                where: whereClause,
                include: { 
                    category: true, 
                    // Chỉ lấy những thông tin cần thiết để giảm tải dung lượng JSON trả về
                    variants: { 
                        include: { inventories: true } 
                    } 
                },
                orderBy: { nameVn: 'asc' } // Sắp xếp theo tên A-Z cho Admin dễ tìm
            });
            
            return res.json({ data: products }); // Không cần trả về 'meta' phân trang
        }

        // 💡 TRƯỜNG HỢP 2: Phân trang bình thường (Dùng cho trang Inventory chính)
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 10;
        const skip = (p - 1) * l;

        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                skip,
                take: l,
                include: { 
                    category: true, 
                    variants: { include: { inventories: true, images: true } } 
                },
                orderBy: { id: 'desc' }
            }),
            prisma.product.count({ where: whereClause })
        ]);

        res.json({
            data: products,
            meta: {
                total: totalCount,
                page: p,
                limit: l,
                totalPages: Math.ceil(totalCount / l)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Cập nhật thông tin / Bật tắt trạng thái (Giải quyết lỗi 404)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const product = await prisma.product.update({
            where: { id: Number(id) },
            data: updateData
        });

        // Tự động cập nhật Vector nếu thông tin quan trọng thay đổi
        await syncProductVector(product.id);

        res.json({ message: "Cập nhật thành công!", product });
    } catch (error) {
        res.status(500).json({ error: "Lỗi cập nhật sản phẩm" });
    }
};