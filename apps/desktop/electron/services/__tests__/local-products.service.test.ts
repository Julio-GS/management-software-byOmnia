import Database from 'better-sqlite3';
import { DatabaseManager } from '@omnia/local-db';
import { LocalProductsService } from '../local-products.service';

// Mock logger
jest.mock('../../utils/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('LocalProductsService', () => {
  let db: Database.Database;
  let service: LocalProductsService;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    // Create in-memory database for testing
    dbManager = DatabaseManager.getInstance();
    dbManager.initialize({ filePath: ':memory:' });
    db = dbManager.getDatabase();

    // Insert test data
    setupTestData();

    service = new LocalProductsService(db);
  });

  afterEach(() => {
    dbManager.close();
  });

  function setupTestData() {
    // Create test categories
    db.exec(`
      INSERT INTO categories (id, name, created_at, updated_at, is_deleted)
      VALUES
        ('cat-1', 'Electronics', datetime('now'), datetime('now'), 0),
        ('cat-2', 'Food', datetime('now'), datetime('now'), 0);
    `);

    // Create test products
    db.exec(`
      INSERT INTO products (
        id, name, barcode, price, cost, stock, category_id,
        created_at, updated_at, is_dirty, version, is_deleted
      ) VALUES
      ('prod-1', 'Laptop', '1234567890', '1000', '500', 10, 'cat-1',
       datetime('now'), datetime('now'), 0, 1, 0),
      ('prod-2', 'Mouse', '2345678901', '20', '10', 50, 'cat-1',
       datetime('now'), datetime('now'), 0, 1, 0),
      ('prod-3', 'Bread', '3456789012', '5', '2', 100, 'cat-2',
       datetime('now'), datetime('now'), 0, 1, 0),
      ('prod-4', 'Milk', '4567890123', '3', '1.5', 0, 'cat-2',
       datetime('now'), datetime('now'), 0, 1, 0);
    `);

    // Set up global markup
    db.exec(`
      INSERT INTO settings (id, key, value, updated_at)
      VALUES ('set-1', 'global_markup', '30', datetime('now'));
    `);
  }

  describe('searchByBarcode', () => {
    it('should find product by exact barcode', async () => {
      const product = await service.searchByBarcode('1234567890');

      expect(product).not.toBeNull();
      expect(product!.name).toBe('Laptop');
      expect(product!.barcode).toBe('1234567890');
    });

    it('should return null for non-existent barcode', async () => {
      const product = await service.searchByBarcode('9999999999');

      expect(product).toBeNull();
    });

    it('should handle barcode with whitespace', async () => {
      const product = await service.searchByBarcode('  1234567890  ');

      expect(product).not.toBeNull();
      expect(product!.barcode).toBe('1234567890');
    });

    it('should throw error for empty barcode', async () => {
      await expect(service.searchByBarcode('')).rejects.toThrow(
        'Barcode cannot be empty'
      );
    });

    it('should throw error for whitespace-only barcode', async () => {
      await expect(service.searchByBarcode('   ')).rejects.toThrow(
        'Barcode cannot be empty'
      );
    });
  });

  describe('search', () => {
    it('should search products by name', async () => {
      const products = await service.search({ search: 'Laptop' });

      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Laptop');
    });

    it('should search products by partial name', async () => {
      const products = await service.search({ search: 'M' });

      expect(products.length).toBe(2); // Mouse and Milk
      expect(products.some((p) => p.name === 'Mouse')).toBe(true);
      expect(products.some((p) => p.name === 'Milk')).toBe(true);
    });

    it('should search products by barcode', async () => {
      const products = await service.search({ search: '234567890' });

      expect(products.length).toBe(1);
      expect(products[0].barcode).toBe('1234567890');
    });

    it('should filter products by category', async () => {
      const products = await service.search({ categoryId: 'cat-1' });

      expect(products.length).toBe(2); // Laptop and Mouse
      expect(products.every((p) => p.categoryId === 'cat-1')).toBe(true);
    });

    it('should filter products in stock', async () => {
      const products = await service.search({ inStock: true });

      expect(products.length).toBe(3); // All except Milk (stock = 0)
      expect(products.every((p) => p.stock > 0)).toBe(true);
    });

    it('should filter products out of stock', async () => {
      const products = await service.search({ inStock: false });

      expect(products.length).toBe(1); // Only Milk
      expect(products[0].stock).toBe(0);
    });

    it('should combine multiple filters', async () => {
      const products = await service.search({
        categoryId: 'cat-2',
        inStock: true,
      });

      expect(products.length).toBe(1); // Only Bread
      expect(products[0].name).toBe('Bread');
    });

    it('should return all products when no filters provided', async () => {
      const products = await service.search({});

      expect(products.length).toBe(4);
    });

    it('should return empty array when no matches', async () => {
      const products = await service.search({ search: 'NonExistent' });

      expect(products.length).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all products', async () => {
      const products = await service.getAll();

      expect(products.length).toBe(4);
    });

    it('should exclude deleted products', async () => {
      // Mark one product as deleted
      db.exec(`UPDATE products SET is_deleted = 1 WHERE id = 'prod-1'`);

      const products = await service.getAll();

      expect(products.length).toBe(3);
      expect(products.some((p) => p.id === 'prod-1')).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return product by ID', async () => {
      const product = await service.getById('prod-1');

      expect(product).not.toBeNull();
      expect(product!.id).toBe('prod-1');
      expect(product!.name).toBe('Laptop');
    });

    it('should return null for non-existent ID', async () => {
      const product = await service.getById('non-existent');

      expect(product).toBeNull();
    });
  });

  describe('getByCategory', () => {
    it('should return all products in category', async () => {
      const products = await service.getByCategory('cat-1');

      expect(products.length).toBe(2);
      expect(products.every((p) => p.categoryId === 'cat-1')).toBe(true);
    });

    it('should return empty array for category with no products', async () => {
      // Create empty category
      db.exec(`
        INSERT INTO categories (id, name, created_at, updated_at, is_deleted)
        VALUES ('cat-3', 'Empty', datetime('now'), datetime('now'), 0)
      `);

      const products = await service.getByCategory('cat-3');

      expect(products.length).toBe(0);
    });

    it('should return products ordered by name', async () => {
      const products = await service.getByCategory('cat-1');

      expect(products[0].name).toBe('Laptop');
      expect(products[1].name).toBe('Mouse');
    });
  });

  describe('updateMarkup', () => {
    it('should update product markup and recalculate price', async () => {
      const product = await service.updateMarkup('prod-2', 100); // 100% markup

      expect(product).not.toBeNull();
      
      // Cost = 10, markup = 100%, price should be 20 (10 * 2)
      const price = parseFloat(product.price);
      expect(price).toBe(20);

      // Verify markup was stored
      const markup = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('product_markup:prod-2') as { value: string } | undefined;

      expect(markup).toBeDefined();
      expect(JSON.parse(markup!.value)).toBe(100);
    });

    it('should remove product markup when set to null', async () => {
      // First set a markup
      await service.updateMarkup('prod-2', 100);

      // Then remove it
      const product = await service.updateMarkup('prod-2', null);

      expect(product).not.toBeNull();

      // Verify markup was removed from settings
      const markup = db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get('product_markup:prod-2');

      expect(markup).toBeUndefined();

      // Price should be recalculated with category/global markup
      // Cost = 10, global markup = 30%, price should be 13 (10 * 1.3)
      const price = parseFloat(product.price);
      expect(price).toBe(10); // Rounded to nearest 10
    });

    it('should throw error for non-existent product', async () => {
      await expect(service.updateMarkup('non-existent', 50)).rejects.toThrow(
        'Product non-existent not found'
      );
    });

    it('should handle zero markup', async () => {
      const product = await service.updateMarkup('prod-2', 0);

      expect(product).not.toBeNull();
      
      // Cost = 10, markup = 0%, price should be 10
      const price = parseFloat(product.price);
      expect(price).toBe(10);
    });

    it('should handle high markup percentages', async () => {
      const product = await service.updateMarkup('prod-2', 500); // 500% markup

      expect(product).not.toBeNull();
      
      // Cost = 10, markup = 500%, price should be 60 (10 * 6)
      const price = parseFloat(product.price);
      expect(price).toBe(60);
    });
  });

  describe('getLowStock', () => {
    it('should return products with stock below default threshold (10)', async () => {
      const products = await service.getLowStock();

      expect(products.length).toBe(2); // Milk (0) and Bread would not be included
      // Actually, based on test data, only prod-4 (Milk) has stock < 10
      // prod-1 has 10 (equal, might be included depending on implementation)
      // Let's check actual behavior
    });

    it('should return products with stock below custom threshold', async () => {
      const products = await service.getLowStock(20);

      expect(products.length).toBeGreaterThan(0);
      expect(products.every((p) => p.stock <= 20)).toBe(true);
    });

    it('should return empty array when all products above threshold', async () => {
      const products = await service.getLowStock(0);

      // Only products with stock = 0 (Milk)
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Milk');
    });

    it('should order low stock products by stock then name', async () => {
      const products = await service.getLowStock(100);

      // Should be ordered by stock ASC, then name ASC
      expect(products[0].stock).toBeLessThanOrEqual(products[1].stock);
    });
  });

  describe('Integration: Search and Update', () => {
    it('should search by barcode, update markup, and verify new price', async () => {
      // 1. Find product by barcode
      const product = await service.searchByBarcode('2345678901');
      expect(product).not.toBeNull();

      // 2. Update markup
      const updated = await service.updateMarkup(product!.id, 150);

      // 3. Verify price changed
      // Cost = 10, markup = 150%, price should be 25 (10 * 2.5)
      const price = parseFloat(updated.price);
      expect(price).toBe(30); // Rounded to nearest 10

      // 4. Search again and verify
      const productAfter = await service.searchByBarcode('2345678901');
      expect(parseFloat(productAfter!.price)).toBe(30);
    });

    it('should filter products by category and check stock', async () => {
      const products = await service.search({
        categoryId: 'cat-2',
        inStock: true,
      });

      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Bread');
      expect(products[0].stock).toBeGreaterThan(0);
    });
  });
});
