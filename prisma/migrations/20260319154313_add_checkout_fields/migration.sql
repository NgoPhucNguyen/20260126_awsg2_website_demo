-- AlterTable
ALTER TABLE "cart" ADD COLUMN     "note" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_status" TEXT,
ADD COLUMN     "shipping_address" TEXT,
ALTER COLUMN "coupon_discount" SET DEFAULT 0,
ALTER COLUMN "final_price" SET DEFAULT 0;
