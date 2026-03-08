import { Database } from 'better-sqlite3';
import type { SaleItem } from '../models';

export class SaleItemsRepository {
  constructor(private db: Database) {}

  /**
   * Find all items for a sale
   */
  findBySaleId(saleId: string): SaleItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sale_items
      WHERE sale_id = ? AND is_deleted = 0
      ORDER BY created_at ASC
    `);

    return stmt.all(saleId) as SaleItem[];
  }

  /**
   * Find a specific item by ID
   */
  findById(id: string): SaleItem | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM sale_items
      WHERE id = ? AND is_deleted = 0
    `);

    return stmt.get(id) as SaleItem | undefined;
  }

  /**
   * Get all items for multiple sales (for batch operations)
   */
  findByMultipleSales(saleIds: string[]): SaleItem[] {
    if (saleIds.length === 0) return [];

    const placeholders = saleIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT * FROM sale_items
      WHERE sale_id IN (${placeholders})
      AND is_deleted = 0
      ORDER BY sale_id, created_at ASC
    `);

    return stmt.all(...saleIds) as SaleItem[];
  }

  /**
   * Get items by product (for product sales history)
   */
  findByProductId(productId: string, limit?: number): SaleItem[] {
    let sql = `
      SELECT si.* FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id = ? AND si.is_deleted = 0 AND s.is_deleted = 0
      ORDER BY si.created_at DESC
    `;

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(productId) as SaleItem[];
  }

  /**
   * Get total quantity sold for a product in a date range
   */
  getTotalQuantitySold(
    productId: string,
    startDate: string,
    endDate: string
  ): number {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(si.quantity), 0) as total
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id = ?
      AND s.created_at >= ? AND s.created_at <= ?
      AND si.is_deleted = 0 AND s.is_deleted = 0
    `);

    const result = stmt.get(productId, startDate, endDate) as { total: number };
    return result.total;
  }

  /**
   * Get top selling products for a date range
   */
  getTopSellingProducts(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: string;
    salesCount: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        si.product_id as productId,
        si.product_name as productName,
        SUM(si.quantity) as totalQuantity,
        SUM(CAST(si.subtotal AS REAL)) as totalRevenue,
        COUNT(DISTINCT si.sale_id) as salesCount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ? AND s.created_at <= ?
      AND si.is_deleted = 0 AND s.is_deleted = 0
      GROUP BY si.product_id, si.product_name
      ORDER BY totalQuantity DESC
      LIMIT ?
    `);

    const results = stmt.all(startDate, endDate, limit) as Array<{
      productId: string;
      productName: string;
      totalQuantity: number;
      totalRevenue: number;
      salesCount: number;
    }>;

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalQuantity: r.totalQuantity,
      totalRevenue: r.totalRevenue.toFixed(2),
      salesCount: r.salesCount,
    }));
  }

  /**
   * Get revenue by product for a date range
   */
  getRevenueByProduct(
    startDate: string,
    endDate: string
  ): Array<{
    productId: string;
    productName: string;
    revenue: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        si.product_id as productId,
        si.product_name as productName,
        SUM(CAST(si.subtotal AS REAL)) as totalRevenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ? AND s.created_at <= ?
      AND si.is_deleted = 0 AND s.is_deleted = 0
      GROUP BY si.product_id, si.product_name
      ORDER BY totalRevenue DESC
    `);

    const results = stmt.all(startDate, endDate) as Array<{
      productId: string;
      productName: string;
      totalRevenue: number;
    }>;

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      revenue: r.totalRevenue.toFixed(2),
    }));
  }

  /**
   * Count total items sold in date range
   */
  countItemsSold(startDate: string, endDate: string): number {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(si.quantity), 0) as total
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ? AND s.created_at <= ?
      AND si.is_deleted = 0 AND s.is_deleted = 0
    `);

    const result = stmt.get(startDate, endDate) as { total: number };
    return result.total;
  }

  /**
   * Soft delete all items for a sale (used when deleting a sale)
   */
  deleteBySaleId(saleId: string): void {
    const stmt = this.db.prepare(`
      UPDATE sale_items
      SET is_deleted = 1
      WHERE sale_id = ?
    `);

    stmt.run(saleId);
  }
}
