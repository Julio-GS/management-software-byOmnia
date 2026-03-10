import Database from 'better-sqlite3';
import { DatabaseManager } from '@omnia/local-db';
import { LocalPricingService } from '../local-pricing.service';

// Mock logger
jest.mock('../../utils/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('LocalPricingService', () => {
  let db: Database.Database;
  let service: LocalPricingService;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    // Create in-memory database for testing
    dbManager = DatabaseManager.getInstance();
    dbManager.initialize({ filePath: ':memory:' });
    db = dbManager.getDatabase();

    // Insert test data
    setupTestData();

    service = new LocalPricingService(db);
  });

  afterEach(() => {
    dbManager.close();
  });

  function setupTestData() {
    // Create test category
    db.exec(`
      INSERT INTO categories (id, name, created_at, updated_at, is_deleted)
      VALUES ('cat-1', 'Electronics', datetime('now'), datetime('now'), 0);
    `);

    // Create test products
    db.exec(`
      INSERT INTO products (
        id, name, barcode, price, cost, stock, category_id,
        created_at, updated_at, is_dirty, version, is_deleted
      ) VALUES
      ('prod-1', 'Product 1', 'BAR001', '100', '50', 10, 'cat-1',
       datetime('now'), datetime('now'), 0, 1, 0),
      ('prod-2', 'Product 2', 'BAR002', '200', '100', 5, 'cat-1',
       datetime('now'), datetime('now'), 0, 1, 0),
      ('prod-3', 'Product 3', 'BAR003', '150', '75', 15, NULL,
       datetime('now'), datetime('now'), 0, 1, 0);
    `);

    // Set up markups in settings
    db.exec(`
      INSERT INTO settings (id, key, value, updated_at)
      VALUES
        ('set-1', 'global_markup', '30', datetime('now')),
        ('set-2', 'category_markup:cat-1', '50', datetime('now')),
        ('set-3', 'product_markup:prod-1', '100', datetime('now'));
    `);
  }

  describe('calculatePrice', () => {
    it('should calculate price with product-specific markup (highest priority)', async () => {
      // Product markup = 100%
      const result = await service.calculatePrice({
        cost: 100,
        productId: 'prod-1',
        categoryId: 'cat-1',
      });

      expect(result.calculatedPrice).toBe(200); // 100 * (1 + 100/100)
      expect(result.suggestedPrice).toBe(200); // Rounded to nearest 50
      expect(result.markupPercentage).toBe(100);
      expect(result.markupSource).toBe('product');
    });

    it('should calculate price with category markup when product has no markup', async () => {
      // Category markup = 50%
      const result = await service.calculatePrice({
        cost: 100,
        productId: 'prod-2', // No product markup
        categoryId: 'cat-1',
      });

      expect(result.calculatedPrice).toBe(150); // 100 * (1 + 50/100)
      expect(result.suggestedPrice).toBe(150); // Rounded to nearest 50
      expect(result.markupPercentage).toBe(50);
      expect(result.markupSource).toBe('category');
    });

    it('should calculate price with global markup when no product/category markup', async () => {
      // Global markup = 30%
      const result = await service.calculatePrice({
        cost: 100,
        productId: 'prod-3', // No product markup, no category
      });

      expect(result.calculatedPrice).toBe(130); // 100 * (1 + 30/100)
      expect(result.suggestedPrice).toBe(130); // Rounded to nearest 50
      expect(result.markupPercentage).toBe(30);
      expect(result.markupSource).toBe('global');
    });

    it('should use category from product if not provided', async () => {
      const result = await service.calculatePrice({
        cost: 100,
        productId: 'prod-2', // Has category_id = 'cat-1'
        // categoryId not provided
      });

      expect(result.markupPercentage).toBe(50); // Category markup
      expect(result.markupSource).toBe('category');
    });

    it('should handle zero cost', async () => {
      const result = await service.calculatePrice({
        cost: 0,
        productId: 'prod-1',
      });

      expect(result.calculatedPrice).toBe(0);
      expect(result.suggestedPrice).toBe(0);
    });

    it('should handle missing global markup (defaults to 0)', async () => {
      // Delete global markup
      db.exec(`DELETE FROM settings WHERE key = 'global_markup'`);

      const result = await service.calculatePrice({
        cost: 100,
        productId: 'prod-3',
      });

      expect(result.calculatedPrice).toBe(100); // No markup
      expect(result.markupPercentage).toBe(0);
      expect(result.markupSource).toBe('global');
    });
  });

  describe('suggestRoundedPrice', () => {
    it('should round to nearest 10 for prices < 100', () => {
      expect(service.suggestRoundedPrice(87)).toBe(90);
      expect(service.suggestRoundedPrice(93)).toBe(90);
      expect(service.suggestRoundedPrice(95)).toBe(100);
      expect(service.suggestRoundedPrice(44)).toBe(40);
    });

    it('should round to nearest 50 for prices 100-1000', () => {
      expect(service.suggestRoundedPrice(847)).toBe(850);
      expect(service.suggestRoundedPrice(870)).toBe(900);
      expect(service.suggestRoundedPrice(125)).toBe(150);
      expect(service.suggestRoundedPrice(149)).toBe(150);
    });

    it('should round to nearest 100 for prices > 1000', () => {
      expect(service.suggestRoundedPrice(1847)).toBe(1900);
      expect(service.suggestRoundedPrice(1950)).toBe(2000);
      expect(service.suggestRoundedPrice(2049)).toBe(2000);
      expect(service.suggestRoundedPrice(2051)).toBe(2100);
    });

    it('should handle exact boundaries', () => {
      expect(service.suggestRoundedPrice(100)).toBe(100);
      expect(service.suggestRoundedPrice(1000)).toBe(1000);
    });
  });

  describe('getApplicableMarkup', () => {
    it('should return product markup if available', async () => {
      const markup = await service.getApplicableMarkup('prod-1');

      expect(markup.percentage).toBe(100);
      expect(markup.source).toBe('product');
    });

    it('should return category markup if product has no markup', async () => {
      const markup = await service.getApplicableMarkup('prod-2', 'cat-1');

      expect(markup.percentage).toBe(50);
      expect(markup.source).toBe('category');
    });

    it('should return global markup as fallback', async () => {
      const markup = await service.getApplicableMarkup('prod-3');

      expect(markup.percentage).toBe(30);
      expect(markup.source).toBe('global');
    });

    it('should handle missing product', async () => {
      const markup = await service.getApplicableMarkup('non-existent');

      expect(markup.percentage).toBe(30); // Falls back to global
      expect(markup.source).toBe('global');
    });
  });

  describe('recalculateCategoryPrices', () => {
    it('should recalculate prices for products without product markup', async () => {
      const updated = await service.recalculateCategoryPrices('cat-1');

      expect(updated).toBe(1); // Only prod-2 (prod-1 has product markup)

      // Verify prod-2 price was updated
      const product = db
        .prepare('SELECT price FROM products WHERE id = ?')
        .get('prod-2') as { price: string };
      
      expect(parseFloat(product.price)).toBe(150); // 100 * 1.5, rounded
    });

    it('should not update products with product-specific markup', async () => {
      const originalPrice = db
        .prepare('SELECT price FROM products WHERE id = ?')
        .get('prod-1') as { price: string };

      await service.recalculateCategoryPrices('cat-1');

      const newPrice = db
        .prepare('SELECT price FROM products WHERE id = ?')
        .get('prod-1') as { price: string };

      expect(newPrice.price).toBe(originalPrice.price);
    });

    it('should handle empty category', async () => {
      const updated = await service.recalculateCategoryPrices('non-existent-cat');

      expect(updated).toBe(0);
    });
  });

  describe('updateProductMarkup', () => {
    it('should set product markup', async () => {
      await service.updateProductMarkup('prod-2', 75);

      const markup = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('product_markup:prod-2') as { value: string };

      expect(JSON.parse(markup.value)).toBe(75);
    });

    it('should remove product markup when set to null', async () => {
      await service.updateProductMarkup('prod-1', null);

      const markup = db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get('product_markup:prod-1');

      expect(markup).toBeUndefined();
    });

    it('should update existing markup', async () => {
      await service.updateProductMarkup('prod-1', 150);

      const markup = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('product_markup:prod-1') as { value: string };

      expect(JSON.parse(markup.value)).toBe(150);
    });
  });
});
