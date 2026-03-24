-- AlterTable
ALTER TABLE "order_detail" ADD COLUMN     "promotion_id" TEXT;

-- AddForeignKey
ALTER TABLE "order_detail" ADD CONSTRAINT "order_detail_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
