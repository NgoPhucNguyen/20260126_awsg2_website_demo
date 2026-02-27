// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import { products } from './data/edit_product_data.js'; // Or your edit file
import { brands } from './data/brand_data.js';
import { categories } from './data/category_data.js';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 🧹 1. Clearing old data from the bottom up...
  console.log('🧹 Clearing old data...');
  await prisma.productPromotion.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.importationDetail.deleteMany({});
  await prisma.shipmentDetail.deleteMany({});
  await prisma.orderDetail.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({}); // Add this to clear old categories
  await prisma.brand.deleteMany({});
  console.log('✅ Old products and all related data safely cleared.');

  // 2. SEED BRANDS (The Loop)
  console.log('🏗️ Seeding Brands...');
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: {},
      create: brand // This injects { id: '...', name: '...' } automatically
    });
  }
  console.log(`✅ ${brands.length} Brands created.`);

  // 3. SEED CATEGORIES (The Loop)
  console.log('🏗️ Seeding Categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat 
    });
  }
  console.log(`✅ ${categories.length} Categories created.`);

  // 🚀 3. Loop through the data file and create the products
  for (const prod of products) {
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

    await prisma.product.create({
      data: {
        name: prod.name,
        nameVn: prod.nameVn,
        brandId: prod.brandId,
        categoryId: prod.categoryId,
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