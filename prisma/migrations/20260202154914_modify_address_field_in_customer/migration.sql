-- DropForeignKey
ALTER TABLE "customer" DROP CONSTRAINT "customer_address_id_fkey";

-- AlterTable
ALTER TABLE "customer" ALTER COLUMN "address_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
