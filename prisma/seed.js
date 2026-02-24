// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import { products } from './product_data.js'; // Or edit_product_data.js

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 🧹 FIX 1: The Ultimate Bottom-Up Delete
  console.log('🧹 Clearing old data from the bottom up...');
  
  // A. Delete everything that relies on ProductVariant first
  await prisma.productPromotion.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.importationDetail.deleteMany({});
  await prisma.shipmentDetail.deleteMany({});
  await prisma.orderDetail.deleteMany({});
  await prisma.productImage.deleteMany({});
  
  // B. Now it is 100% safe to delete Variants and Products
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  
  console.log('✅ Old products and all related data safely cleared.');

  // 🚀 Loop through the data file and create the products
  for (const prod of products) {
    
    // Format the variants
    const formattedVariants = prod.variants.map((variant) => ({
      sku: variant.sku,
      specification: variant.specification,
      unitPrice: variant.unitPrice,
      thumbnailUrl: variant.thumbnailUrl,
      slug: variant.slug,
      images: {
        create: variant.images
      }
    }));

    // ⚠️ CRITICAL NOTE: If this fails here, it means the Brand or Category is missing!
    await prisma.product.create({
      data: {
        name: prod.name,
        nameVn: prod.nameVn,
        brandId: prod.brandId,       // 'brand-cocoon' MUST exist in the Brand table first!
        categoryId: prod.categoryId, // Category '2' MUST exist in the Category table first!
        description: prod.description,
        ingredient: prod.ingredient,
        skinType: prod.skinType,
        isActive: prod.isActive,
        variants: {
          create: formattedVariants 
        }
      }
    });

    console.log(`✅ Successfully seeded: ${prod.name}`);
  }

  console.log('🏁 Seeding completely finished!');
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });