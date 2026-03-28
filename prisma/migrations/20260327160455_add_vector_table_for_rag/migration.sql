CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "product_vectors" (
    "product_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_vectors_pkey" PRIMARY KEY ("product_id")
);

-- AddForeignKey
ALTER TABLE "product_vectors" ADD CONSTRAINT "product_vectors_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
