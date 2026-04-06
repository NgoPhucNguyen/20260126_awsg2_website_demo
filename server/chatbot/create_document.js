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

function buildProductDocument(product) {
	const name = product.name?.trim() || "Không có tên tieng Anh";
	const nameVn = product.nameVn?.trim() || "Không có tên tieng Việt";
	const description = product.description?.trim() || "Không có mô tả";
	const ingredient = product.ingredient?.trim() || "Không có thành phần";

	return [
		`Product ID: ${product.id}`,
		`English Name: ${name}`,
		`Vietnamese Name: ${nameVn}`,
		`Description: ${description}`,
		`Ingredients: ${ingredient}`,
	].join("\n");
}

async function loadProducts() {
	return prisma.product.findMany({
		select: {
			id: true,
			name: true,
			nameVn: true,
			description: true,
			ingredient: true,
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

async function upsertProductVector(product, content, vectorLiteral) {
	const metadata = {
		name: product.name ?? "",
		nameVn: product.nameVn ?? "",
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
		console.log("[INFO] No products found. Nothing to index.");
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
			console.log(`[INDEXED] ${product.id} - ${product.nameVn ?? product.name ?? "Unknown"}`);
		}

		console.log(`[BATCH] Indexed ${Math.min(i + BATCH_SIZE, products.length)}/${products.length}`);
	}

	console.log(`[DONE] Indexed ${products.length} products into product_vectors.`);
}

try {
	await main();
} catch (error) {
	console.error("[FATAL] create_document failed:", error?.message ?? error);
	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}
