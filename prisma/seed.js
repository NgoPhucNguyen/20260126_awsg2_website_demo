// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // --- 1. Create the Brand (Cocoon) ---
  const cocoon = await prisma.brand.upsert({
    where: { id: 'brand-cocoon' },
    update: {},
    create: {
      id: 'brand-cocoon',
      name: 'Cocoon Vietnam',
    },
  });

  console.log(`✅ Brand created: ${cocoon.name}`);

  // --- 2. Create Categories ---
  
  // Parent: Skin Care
  const catSkinCare = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Skin Care',
      nameVn: 'Chăm sóc da',
      categoryLevel: 1,
    },
  });

  // Child: Cleanser
  const catCleanser = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Cleanser',
      nameVn: 'Làm sạch',
      categoryLevel: 2,
      parentId: catSkinCare.id, // Link to Parent
    },
  });

  // Child: Mask
  const catMask = await prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Face Mask',
      nameVn: 'Mặt nạ',
      categoryLevel: 2,
      parentId: catSkinCare.id, // Link to Parent
    },
  });

  console.log(`✅ Categories created`);

  // --- 3. Create Products ---

  // Product 1: Winter Melon Cleanser
  const productWinterMelon = await prisma.product.create({
    data: {
      name: 'Winter Melon Cleanser',
      nameVn: 'Gel bí đao rửa mặt',
      brandId: cocoon.id,
      categoryId: catCleanser.id,
      ingredient: 'Bí đao, Rau má, Tràm trà',
      skinType: 'Oily and Acne-prone skin',
      description: 'Cleanse dirt and excess oil, reduce blackheads.',
      variants: {
        create: [
          {
            sku: 'CC-BD-140',
            unitPrice: 195000,
            thumbnailUrl: '/images/products/winter-melon-140.jpg',
            specification: { volume: '140ml', packaging: 'Bottle' },
            images: {
              create: [
                { imageUrl: '/images/products/winter-melon-140-front.jpg', displayOrder: 1, altText: 'Front View' },
                { imageUrl: '/images/products/winter-melon-texture.jpg', displayOrder: 2, altText: 'Texture' }
              ]
            }
          },
          {
            sku: 'CC-BD-310',
            unitPrice: 295000,
            thumbnailUrl: '/images/products/winter-melon-310.jpg',
            specification: { volume: '310ml', packaging: 'Pump Bottle' },
            images: {
              create: [
                { imageUrl: '/images/products/winter-melon-310-front.jpg', displayOrder: 1, altText: 'Front View' }
              ]
            }
          }
        ]
      }
    }
  });

  // Product 2: Turmeric Mask
  const productTurmeric = await prisma.product.create({
    data: {
      name: 'Hung Yen Turmeric Face Mask',
      nameVn: 'Mặt nạ nghệ Hưng Yên',
      brandId: cocoon.id,
      categoryId: catMask.id,
      ingredient: 'Tinh bột nghệ, chiết xuất yến mạch, vitamin B3',
      skinType: 'All skin types',
      description: 'Brightens skin, fades dark spots.',
      variants: {
        create: [
          {
            sku: 'CC-TN-30',
            unitPrice: 145000,
            thumbnailUrl: '/images/products/turmeric-30.jpg',
            specification: { volume: '30ml', packaging: 'Small Jar' },
            images: {
              create: [
                { imageUrl: '/images/products/turmeric-30-front.jpg', displayOrder: 1, altText: 'Front View' }
              ]
            }
          },
          {
            sku: 'CC-TN-100',
            unitPrice: 345000,
            thumbnailUrl: '/images/products/turmeric-100.jpg',
            specification: { volume: '100ml', packaging: 'Large Jar' },
            images: {
              create: [
                { imageUrl: '/images/products/turmeric-100-front.jpg', displayOrder: 1, altText: 'Front View' }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Products created: ${productWinterMelon.name}, ${productTurmeric.name}`);
  console.log('🏁 Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });