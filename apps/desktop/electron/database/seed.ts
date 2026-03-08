import { dbManager } from './db-manager';
import { getLogger } from '../utils/logger';
import { generateUUID } from '@omnia/local-db';

const logger = getLogger();

/**
 * Seed the database with initial data
 * - 4 categories (Bebidas, Alimentos, Limpieza, Higiene Personal)
 * - 10 products across categories
 * - 1 admin user
 */
export async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Check if database already has data
    const existingCategories = dbManager.categories!.findAll();
    if (existingCategories.length > 0) {
      logger.info('Database already seeded, skipping...');
      return;
    }

    // ========================================================================
    // CATEGORIES
    // ========================================================================
    logger.info('Seeding categories...');

    const bebidasId = generateUUID();
    const alimentosId = generateUUID();
    const limpiezaId = generateUUID();
    const higieneId = generateUUID();

    const categories = [
      {
        id: bebidasId,
        name: 'Bebidas',
        description: 'Refrescos, jugos, agua y otras bebidas',
        defaultMarkup: 40.0, // 40% markup for beverages
      },
      {
        id: alimentosId,
        name: 'Alimentos',
        description: 'Productos alimenticios básicos',
        defaultMarkup: 35.0, // 35% markup for food items
      },
      {
        id: limpiezaId,
        name: 'Limpieza',
        description: 'Productos de limpieza para el hogar',
        defaultMarkup: 25.0, // 25% markup for cleaning products
      },
      {
        id: higieneId,
        name: 'Higiene Personal',
        description: 'Productos de cuidado e higiene personal',
        defaultMarkup: 45.0, // 45% markup for personal care
      },
    ];

    const db = dbManager.getDatabase();
    const insertCategory = db.prepare(`
      INSERT INTO categories (id, name, description, default_markup, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const cat of categories) {
      insertCategory.run(cat.id, cat.name, cat.description, cat.defaultMarkup, now, now);
    }

    logger.info(`Created ${categories.length} categories`);

    // ========================================================================
    // PRODUCTS
    // ========================================================================
    logger.info('Seeding products...');

    const products = [
      // Bebidas (2 products)
      {
        name: 'Coca-Cola 2L',
        barcode: '7501055300006',
        price: '35.00',
        cost: '25.00',
        stock: 50,
        categoryId: bebidasId,
        description: 'Refresco de cola 2 litros',
      },
      {
        name: 'Agua Bonafont 1L',
        barcode: '7501055310005',
        price: '12.00',
        cost: '8.00',
        stock: 100,
        categoryId: bebidasId,
        description: 'Agua purificada 1 litro',
      },
      // Alimentos (3 products)
      {
        name: 'Pan Bimbo Blanco',
        barcode: '7501000111111',
        price: '42.00',
        cost: '32.00',
        stock: 30,
        categoryId: alimentosId,
        description: 'Pan de caja blanco grande',
      },
      {
        name: 'Leche Lala Entera 1L',
        barcode: '7501055320004',
        price: '24.00',
        cost: '18.00',
        stock: 40,
        categoryId: alimentosId,
        description: 'Leche entera 1 litro',
      },
      {
        name: 'Huevo San Juan 12 pzas',
        barcode: '7501055330003',
        price: '58.00',
        cost: '45.00',
        stock: 25,
        categoryId: alimentosId,
        description: 'Caja con 12 huevos',
      },
      // Limpieza (3 products)
      {
        name: 'Fabuloso Lavanda 1L',
        barcode: '7501032900021',
        price: '28.00',
        cost: '20.00',
        stock: 35,
        categoryId: limpiezaId,
        description: 'Limpiador multiusos aroma lavanda',
      },
      {
        name: 'Cloro Cloralex 1L',
        barcode: '7501032900038',
        price: '22.00',
        cost: '16.00',
        stock: 40,
        categoryId: limpiezaId,
        description: 'Blanqueador con cloro',
      },
      {
        name: 'Salvo Lavatrastes 500ml',
        barcode: '7501032900045',
        price: '18.00',
        cost: '12.00',
        stock: 45,
        categoryId: limpiezaId,
        description: 'Jabón líquido para trastes',
      },
      // Higiene Personal (2 products)
      {
        name: 'Shampoo Pantene 400ml',
        barcode: '7500435108003',
        price: '65.00',
        cost: '48.00',
        stock: 20,
        categoryId: higieneId,
        description: 'Shampoo restauración',
      },
      {
        name: 'Jabón Palmolive 3 pzas',
        barcode: '7500435108010',
        price: '32.00',
        cost: '24.00',
        stock: 30,
        categoryId: higieneId,
        description: 'Jabón de tocador pack 3',
      },
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, name, barcode, price, cost, stock, category_id, description,
        synced_at, is_dirty, version, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 1, 0, ?, ?)
    `);

    for (const product of products) {
      const productId = generateUUID();
      insertProduct.run(
        productId,
        product.name,
        product.barcode,
        product.price,
        product.cost,
        product.stock,
        product.categoryId,
        product.description,
        now,
        now
      );
    }

    logger.info(`Created ${products.length} products`);

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}
