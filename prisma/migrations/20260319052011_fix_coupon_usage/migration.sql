/*
  Warnings:

  - You are about to drop the column `remaining` on the `coupon_usage` table. All the data in the column will be lost.
  - Added the required column `remaining` to the `coupon_usage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coupon_usage" DROP COLUMN "remaining",
ADD COLUMN     "remaining" INTEGER NOT NULL,
ALTER COLUMN "used_at" DROP NOT NULL;
