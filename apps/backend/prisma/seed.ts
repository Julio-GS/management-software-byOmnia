import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminPassword = await bcrypt.hash(
    process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!',
    10,
  );

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@omnia.com' },
    update: {},
    create: {
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@omnia.com',
      password: adminPassword,
      firstName: process.env.DEFAULT_ADMIN_FIRSTNAME || 'System',
      lastName: process.env.DEFAULT_ADMIN_LASTNAME || 'Administrator',
      role: 'admin',
      isActive: true,
    },
  });

  console.log('✅ Created default admin user:', adminUser.email);

  // Create global settings
  const globalMarkupSetting = await prisma.settings.upsert({
    where: { key: 'globalMarkup' },
    update: {},
    create: {
      key: 'globalMarkup',
      value: 30, // 30% default markup
    },
  });

  console.log('✅ Created global settings:', globalMarkupSetting.key);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Bebidas' },
      update: {},
      create: {
        name: 'Bebidas',
        description: 'Bebidas y refrescos',
        defaultMarkup: 35.00, // 35% markup for beverages
        color: '#3B82F6',
        icon: 'droplet',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Alimentos' },
      update: {},
      create: {
        name: 'Alimentos',
        description: 'Productos alimenticios',
        defaultMarkup: 40.00, // 40% markup for groceries
        color: '#10B981',
        icon: 'utensils',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Limpieza' },
      update: {},
      create: {
        name: 'Limpieza',
        description: 'Productos de limpieza',
        defaultMarkup: 30.00, // 30% markup for cleaning products
        color: '#F59E0B',
        icon: 'spray-can',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Higiene Personal' },
      update: {},
      create: {
        name: 'Higiene Personal',
        description: 'Productos de higiene y cuidado personal',
        defaultMarkup: 45.00, // 45% markup for personal care
        color: '#EC4899',
        icon: 'hand-heart',
      },
    }),
  ]);

  console.log('✅ Created', categories.length, 'categories');

  // Create products
  const products = await Promise.all([
    // Bebidas
    prisma.product.upsert({
      where: { sku: 'BEB-001' },
      update: {},
      create: {
        name: 'Coca Cola 2.25L',
        description: 'Gaseosa Coca Cola 2.25 litros',
        sku: 'BEB-001',
        barcode: '7790895001567',
        price: 850.00,
        cost: 550.00,
        stock: 48,
        minStock: 12,
        maxStock: 100,
        categoryId: categories[0].id,
        taxRate: 21.00,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BEB-002' },
      update: {},
      create: {
        name: 'Agua Mineral Villavicencio 2L',
        description: 'Agua mineral sin gas',
        sku: 'BEB-002',
        barcode: '7790070251015',
        price: 450.00,
        cost: 280.00,
        stock: 72,
        minStock: 24,
        maxStock: 150,
        categoryId: categories[0].id,
        taxRate: 21.00,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BEB-003' },
      update: {},
      create: {
        name: 'Cerveza Quilmes 1L',
        description: 'Cerveza Quilmes Clásica 1 litro',
        sku: 'BEB-003',
        barcode: '7790070230836',
        price: 950.00,
        cost: 620.00,
        stock: 36,
        minStock: 12,
        maxStock: 80,
        categoryId: categories[0].id,
        taxRate: 21.00,
      },
    }),
    // Alimentos
    prisma.product.upsert({
      where: { sku: 'ALI-001' },
      update: {},
      create: {
        name: 'Arroz Gallo Oro 1kg',
        description: 'Arroz largo fino',
        sku: 'ALI-001',
        barcode: '7791234001234',
        price: 1200.00,
        cost: 850.00,
        stock: 60,
        minStock: 20,
        maxStock: 120,
        categoryId: categories[1].id,
        taxRate: 10.50,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'ALI-002' },
      update: {},
      create: {
        name: 'Aceite Cocinero 900ml',
        description: 'Aceite de girasol',
        sku: 'ALI-002',
        barcode: '7798085930012',
        price: 1850.00,
        cost: 1300.00,
        stock: 42,
        minStock: 15,
        maxStock: 90,
        categoryId: categories[1].id,
        taxRate: 10.50,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'ALI-003' },
      update: {},
      create: {
        name: 'Fideos Matarazzo 500g',
        description: 'Fideos moñitos',
        sku: 'ALI-003',
        barcode: '7790040002011',
        price: 780.00,
        cost: 520.00,
        stock: 90,
        minStock: 30,
        maxStock: 180,
        categoryId: categories[1].id,
        taxRate: 10.50,
      },
    }),
    // Limpieza
    prisma.product.upsert({
      where: { sku: 'LIM-001' },
      update: {},
      create: {
        name: 'Lavandina Ayudín 2L',
        description: 'Lavandina concentrada',
        sku: 'LIM-001',
        barcode: '7793640001567',
        price: 620.00,
        cost: 380.00,
        stock: 54,
        minStock: 18,
        maxStock: 120,
        categoryId: categories[2].id,
        taxRate: 21.00,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'LIM-002' },
      update: {},
      create: {
        name: 'Detergente Magistral 500ml',
        description: 'Detergente concentrado',
        sku: 'LIM-002',
        barcode: '7791234567890',
        price: 850.00,
        cost: 550.00,
        stock: 48,
        minStock: 15,
        maxStock: 100,
        categoryId: categories[2].id,
        taxRate: 21.00,
      },
    }),
    // Higiene Personal
    prisma.product.upsert({
      where: { sku: 'HIG-001' },
      update: {},
      create: {
        name: 'Jabón Dove 90g',
        description: 'Jabón de tocador',
        sku: 'HIG-001',
        barcode: '7790011000567',
        price: 380.00,
        cost: 240.00,
        stock: 120,
        minStock: 40,
        maxStock: 200,
        categoryId: categories[3].id,
        taxRate: 21.00,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'HIG-002' },
      update: {},
      create: {
        name: 'Shampoo Sedal 350ml',
        description: 'Shampoo hidratación instantánea',
        sku: 'HIG-002',
        barcode: '7791234098765',
        price: 1450.00,
        cost: 980.00,
        stock: 36,
        minStock: 12,
        maxStock: 80,
        categoryId: categories[3].id,
        taxRate: 21.00,
      },
    }),
  ]);

  console.log('✅ Created', products.length, 'products');
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
