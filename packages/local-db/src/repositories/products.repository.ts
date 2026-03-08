import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { Product, CreateProductDTO, UpdateProductDTO, ProductSearchOptions } from '../models';
import { nonEmptyString, nonNegativeNumber } from '../utils/validators';

export class ProductsRepository extends BaseRepository<Product, CreateProductDTO, UpdateProductDTO> {
  constructor(db: Database.Database) {
    super(db, 'products');
  }

  /**
   * Find product by barcode
   */
  public findByBarcode(barcode: string): Product | null {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM products WHERE barcode = ? AND is_deleted = 0 LIMIT 1'
      );
      const result = stmt.get(barcode) as Product | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Failed to find product by barcode: ${(error as Error).message}`);
    }
  }

  /**
   * Search products by name or barcode
   */
  public search(options: ProductSearchOptions): Product[] {
    try {
      let sql = 'SELECT * FROM products WHERE is_deleted = 0';
      const params: any[] = [];

      if (options.search) {
        sql += ' AND (name LIKE ? OR barcode LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (options.categoryId) {
        sql += ' AND category_id = ?';
        params.push(options.categoryId);
      }

      if (options.minPrice) {
        sql += ' AND CAST(price AS REAL) >= CAST(? AS REAL)';
        params.push(options.minPrice);
      }

      if (options.maxPrice) {
        sql += ' AND CAST(price AS REAL) <= CAST(? AS REAL)';
        params.push(options.maxPrice);
      }

      if (options.inStock !== undefined) {
        if (options.inStock) {
          sql += ' AND stock > 0';
        } else {
          sql += ' AND stock = 0';
        }
      }

      sql += ' ORDER BY name ASC';

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Product[];
    } catch (error) {
      throw new Error(`Failed to search products: ${(error as Error).message}`);
    }
  }

  /**
   * Get products by category
   */
  public findByCategory(categoryId: string): Product[] {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM products WHERE category_id = ? AND is_deleted = 0 ORDER BY name ASC'
      );
      return stmt.all(categoryId) as Product[];
    } catch (error) {
      throw new Error(`Failed to find products by category: ${(error as Error).message}`);
    }
  }

  /**
   * Update product stock
   */
  public updateStock(id: string, quantity: number): Product | null {
    try {
      nonNegativeNumber(quantity, 'Stock quantity');

      const stmt = this.db.prepare(
        'UPDATE products SET stock = ?, updated_at = ? WHERE id = ? AND is_deleted = 0'
      );
      stmt.run(quantity, new Date().toISOString(), id);

      return this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update product stock: ${(error as Error).message}`);
    }
  }

  /**
   * Adjust product stock (add or subtract)
   */
  public adjustStock(id: string, delta: number): Product | null {
    try {
      const product = this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      const newStock = Math.max(0, product.stock + delta);
      return this.updateStock(id, newStock);
    } catch (error) {
      throw new Error(`Failed to adjust product stock: ${(error as Error).message}`);
    }
  }

  /**
   * Get low stock products
   */
  public getLowStock(threshold: number = 10): Product[] {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM products WHERE stock <= ? AND is_deleted = 0 ORDER BY stock ASC, name ASC'
      );
      return stmt.all(threshold) as Product[];
    } catch (error) {
      throw new Error(`Failed to get low stock products: ${(error as Error).message}`);
    }
  }

  /**
   * Validate product data before create/update
   */
  protected validateProductData(data: CreateProductDTO | UpdateProductDTO): void {
    if ('name' in data && data.name) {
      nonEmptyString(data.name, 'Product name');
    }

    if ('price' in data && data.price) {
      nonNegativeNumber(parseFloat(data.price), 'Price');
    }

    if ('cost' in data && data.cost) {
      nonNegativeNumber(parseFloat(data.cost), 'Cost');
    }

    if ('stock' in data && data.stock !== undefined) {
      nonNegativeNumber(data.stock, 'Stock');
    }
  }

  public override create(data: CreateProductDTO): Product {
    this.validateProductData(data);
    return super.create(data);
  }

  public override update(id: string, data: UpdateProductDTO): Product | null {
    this.validateProductData(data);
    return super.update(id, data);
  }
}
