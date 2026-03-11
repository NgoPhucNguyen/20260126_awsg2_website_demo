// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import { products } from './data/edit_product_data.js'; 
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
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.warehouse.deleteMany({}); // 🌟 NEW: Clear warehouses too!
  console.log('✅ Old products and all related data safely cleared.');

  // 2. SEED BRANDS (The Loop)
  console.log('🏗️ Seeding Brands...');
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: {},
      create: brand 
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

  // 🏭 4. CREATE A DEFAULT WAREHOUSE
  // (We must have a warehouse to hold our 10,000 inventory items!)
  console.log('🏭 Creating Default Warehouse...');
  const defaultWarehouse = await prisma.warehouse.create({
    data: {
      name: "Main Warehouse (Default)",
      fullAddress: "123 Default Street, Default District, Default City",
      province: "Default City",
      district: "Default District",
      ward: "Default Ward",
      streetAddress: "123 Default Street"
    }
  });
  console.log(`✅ Warehouse created with ID: ${defaultWarehouse.id}`);

  // 🚀 5. Loop through the data file and create the products
  console.log('📦 Seeding Products and Inventory...');
  for (const prod of products) {
    const formattedVariants = prod.variants.map((variant) => ({
      sku: variant.sku,
      specification: variant.specification,
      unitPrice: variant.unitPrice,
      thumbnailUrl: variant.thumbnailUrl,
      slug: variant.slug,
      images: {
        create: variant.images
      },
      // 🌟 NEW: Inject 10,000 stock directly into the default warehouse
      inventories: {
        create: [
          {
            warehouseId: defaultWarehouse.id,
            quantity: 10000
          }
        ]
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