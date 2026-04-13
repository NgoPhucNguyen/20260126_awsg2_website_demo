// server/chabot/create_document.js
import "dotenv/config";
import EmbeddingClient from "./core/embedding_model.js";
import prisma from "../prismaClient.js";

const embeddingClient = new EmbeddingClient();
const BATCH_SIZE = Number(process.env.VECTOR_BATCH_SIZE ?? 25);
const VECTOR_INDEX_LISTS = Number(process.env.VECTOR_INDEX_LISTS ?? 100);

function toVectorLiteral(values) {
	const sanitized = values.map((v) => {
		const num = Number(v);
		return Number.isFinite(num) ? num : 0;
	});
	return `[${sanitized.join(",")}]`;
}

// Cập nhật hàm buildProductDocument (Tối ưu Token)
function buildProductDocument(product) {
  const nameVn = product.nameVn?.trim() || "Không rõ tên";
  const brand = product.brand?.name || "Không rõ hãng";
  const category = product.category?.nameVn || "Không rõ danh mục";
  const skinType = product.skinType?.trim() || "Mọi loại da";
  
  // ✂️ TỐI ƯU TOKENS: Cắt ngắn mô tả (lấy 300 ký tự đầu)
  let description = product.description?.trim() || "";
  if (description.length > 300) description = description.substring(0, 300) + "...";

  // ✂️ TỐI ƯU TOKENS: Cắt ngắn thành phần (lấy 200 ký tự đầu - thường là các chất chính)
  let ingredient = product.ingredient?.trim() || "";
  if (ingredient.length > 200) ingredient = ingredient.substring(0, 200) + "...";

  // Đã bỏ English Name. Cấu trúc siêu nén, đủ từ khóa cho Semantic Search
  return [
    `Product ID: ${product.id}`,
    `Name: ${nameVn}`,
    `Brand: ${brand} | Category: ${category} | Skin Type: ${skinType}`,
    `Desc: ${description}`,
    `Ingredients: ${ingredient}`,
  ].join("\n");
}

// Cập nhật hàm loadProducts để lấy thêm Brand và Category
async function loadProducts() {
  return prisma.product.findMany({
    where: { isActive: true }, // Tối ưu: Chỉ nhúng các sản phẩm đang bán
    select: {
      id: true,
      nameVn: true,
      description: true,
      ingredient: true,
      skinType: true,
      brand: { select: { name: true } },
      category: { select: { nameVn: true } }
    },
    orderBy: { id: "asc" },
  });
}

async function ensureVectorTable(dimensions) {
	if (!Number.isInteger(dimensions) || dimensions <= 0) {
		throw new Error(`Invalid embedding dimensions: ${dimensions}`);
	}

	if (!Number.isInteger(VECTOR_INDEX_LISTS) || VECTOR_INDEX_LISTS <= 0) {
		throw new Error(`Invalid VECTOR_INDEX_LISTS value: ${VECTOR_INDEX_LISTS}`);
	}

	const availableExt = await prisma.$queryRawUnsafe(
		"SELECT name FROM pg_available_extensions WHERE name = 'vector' LIMIT 1;"
	);
	if (!Array.isArray(availableExt) || availableExt.length === 0) {
		throw new Error(
			"pgvector extension is not available on this PostgreSQL server. Use a pgvector-enabled image (for Docker: pgvector/pgvector:pg15) or install pgvector on the DB server."
		);
	}

	await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");

	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS product_vectors (
			product_id INTEGER PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
			content TEXT NOT NULL,
			embedding VECTOR(${dimensions}) NOT NULL,
			metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);

	// Existing tables from old migrations may define embedding as vector without fixed dimensions.
	await prisma.$executeRawUnsafe(
		`ALTER TABLE product_vectors ALTER COLUMN embedding TYPE VECTOR(${dimensions});`
	);

	await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS product_vectors_product_id_idx ON product_vectors(product_id);");

	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS product_vectors_embedding_idx ON product_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = ${VECTOR_INDEX_LISTS});`
	);
}

// Cập nhật hàm upsertProductVector
async function upsertProductVector(product, content, vectorLiteral) {
  // Gắn thêm Metadata để sau này làm bộ lọc nếu cần
  const metadata = {
    nameVn: product.nameVn ?? "",
    brand: product.brand?.name ?? "",
    category: product.category?.nameVn ?? "",
    skinType: product.skinType ?? "",
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
}

async function main() {
	const products = await loadProducts();

	if (products.length === 0) {
		return;
	}

	const firstDoc = buildProductDocument(products[0]);
	const firstEmbedding = await embeddingClient.createEmbedding(firstDoc);
	const dimensions = firstEmbedding.length;

	await ensureVectorTable(dimensions);

	for (let i = 0; i < products.length; i += BATCH_SIZE) {
		const batch = products.slice(i, i + BATCH_SIZE);
		const docs = batch.map(buildProductDocument);

		for (let j = 0; j < batch.length; j += 1) {
			const product = batch[j];
			const content = docs[j];
			const embedding = await embeddingClient.createEmbedding(content);
			const vectorLiteral = toVectorLiteral(embedding);
			await upsertProductVector(product, content, vectorLiteral);
		}

	}

}

try {
	await main();
} catch (error) {
	console.error("[FATAL] create_document failed:", error?.message ?? error);
	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}