/*
  Warnings:

  - Added the required column `category` to the `coupon` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CouponCategory" AS ENUM ('SHIPPING', 'ORDER');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'USED_UP', 'INACTIVE');

-- AlterTable
ALTER TABLE "coupon" ADD COLUMN     "category" "CouponCategory" NOT NULL;

-- CreateTable
CREATE TABLE "coupon_usage" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL,
    "status" "CouponStatus" NOT NULL,
    "remaning" INTEGER NOT NULL,

    CONSTRAINT "coupon_usage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
