import { Database } from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import type {
  Sale,
  CreateSaleDTO,
  SaleItem,
  SalesSearchOptions,
} from '../models';
import { generateUUID, decimalToText } from '../utils/converters';
import { QueryBuilder } from '../utils/query-builder';

export class SalesRepository extends BaseRepository<Sale, CreateSaleDTO, {}> {
  constructor(db: Database) {
    super(db, 'sales');
  }

  /**
   * Create a sale with its items in a transaction
   */
  createSaleWithItems(
    saleData: CreateSaleDTO
  ): { sale: Sale; items: SaleItem[] } {
    const createSale = this.db.transaction(() => {
      // Create the sale
      const saleId = generateUUID();
      const now = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO sales (
          id, total, payment_method, cashier_id, customer_name, notes,
          synced_at, is_dirty, version, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 1, 1, 0, ?, ?)
      `);

      stmt.run(
        saleId,
        saleData.total,
        saleData.paymentMethod,
        saleData.cashierId || null,
        saleData.customerName || null,
        saleData.notes || null,
        now,
        now
      );

      // Create sale items
      const itemStmt = this.db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, product_id, product_name, quantity, unit_price, subtotal,
          is_deleted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `);

      const items: SaleItem[] = [];
      for (const item of saleData.items) {
        const itemId = generateUUID();
        itemStmt.run(
          itemId,
          saleId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.subtotal,
          now
        );

        items.push({
          id: itemId,
          saleId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          isDeleted: 0,
          createdAt: now,
        });
      }

      const sale = this.findById(saleId);
      if (!sale) {
        throw new Error('Failed to create sale');
      }

      return { sale, items };
    });

    return createSale();
  }

  /**
   * Find sales by date range
   */
  findByDateRange(startDate: string, endDate: string): Sale[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
      ORDER BY created_at DESC
    `);

    return stmt.all(startDate, endDate) as Sale[];
  }

  /**
   * Find sales by cashier
   */
  findByCashier(cashierId: string): Sale[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE cashier_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `);

    return stmt.all(cashierId) as Sale[];
  }

  /**
   * Search sales with filters
   */
  search(options: SalesSearchOptions): Sale[] {
    const qb = new QueryBuilder(this.tableName);
    qb.where('is_deleted', '=', 0);

    if (options.startDate) {
      qb.where('created_at', '>=', options.startDate);
    }

    if (options.endDate) {
      qb.where('created_at', '<=', options.endDate);
    }

    if (options.cashierId) {
      qb.where('cashier_id', '=', options.cashierId);
    }

    if (options.paymentMethod) {
      qb.where('payment_method', '=', options.paymentMethod);
    }

    if (options.minTotal) {
      qb.where('total', '>=', options.minTotal);
    }

    if (options.maxTotal) {
      qb.where('total', '<=', options.maxTotal);
    }

    qb.orderBy('created_at', 'DESC');

    const { sql, params } = qb.build();
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Sale[];
  }

  /**
   * Get total sales for a date range
   */
  getTotalSales(startDate: string, endDate: string): string {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as total
      FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
    `);

    const result = stmt.get(startDate, endDate) as { total: number };
    return decimalToText(result.total);
  }

  /**
   * Get sales count for a date range
   */
  countSales(startDate: string, endDate: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
    `);

    const result = stmt.get(startDate, endDate) as { count: number };
    return result.count;
  }

  /**
   * Get sales by payment method for reporting
   */
  getSalesByPaymentMethod(
    startDate: string,
    endDate: string
  ): Array<{ paymentMethod: string; total: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT
        payment_method as paymentMethod,
        SUM(CAST(total AS REAL)) as totalAmount,
        COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
      GROUP BY payment_method
      ORDER BY totalAmount DESC
    `);

    const results = stmt.all(startDate, endDate) as Array<{
      paymentMethod: string;
      totalAmount: number;
      count: number;
    }>;

    return results.map((r) => ({
      paymentMethod: r.paymentMethod,
      total: decimalToText(r.totalAmount),
      count: r.count,
    }));
  }

  /**
   * Get top selling days
   */
  getTopSellingDays(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Array<{ date: string; total: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(CAST(total AS REAL)) as totalAmount,
        COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
      GROUP BY DATE(created_at)
      ORDER BY totalAmount DESC
      LIMIT ?
    `);

    const results = stmt.all(startDate, endDate, limit) as Array<{
      date: string;
      totalAmount: number;
      count: number;
    }>;

    return results.map((r) => ({
      date: r.date,
      total: decimalToText(r.totalAmount),
      count: r.count,
    }));
  }
}
