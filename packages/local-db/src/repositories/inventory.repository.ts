import { Database } from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { generateUUID } from '../utils/converters';
import type {
  InventoryMovement,
  CreateInventoryMovementDTO,
  UpdateInventoryMovementDTO,
} from '../models';

export class InventoryRepository extends BaseRepository<
  InventoryMovement,
  CreateInventoryMovementDTO,
  UpdateInventoryMovementDTO
> {
  constructor(db: Database) {
    super(db, 'inventory_movements');
  }

  /**
   * Override create to handle snake_case field mapping for inventory movements
   */
  public override create(data: CreateInventoryMovementDTO): InventoryMovement {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();
      
      // Map camelCase DTO to snake_case database columns
      const insertData = {
        id,
        product_id: data.productId,
        type: data.type,
        quantity: data.quantity,
        previous_stock: data.previous_stock ?? 0,
        new_stock: data.new_stock ?? 0,
        reason: data.reason ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        user_id: data.userId ?? null,
        device_id: data.device_id ?? null,
        is_dirty: 1,
        version: 1,
        is_deleted: 0,
        created_at: now,
        updated_at: now,
      };

      const stmt = this.db.prepare(`
        INSERT INTO ${this.tableName} (
          id, product_id, type, quantity, previous_stock, new_stock,
          reason, reference, notes, user_id, device_id,
          is_dirty, version, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        insertData.id,
        insertData.product_id,
        insertData.type,
        insertData.quantity,
        insertData.previous_stock,
        insertData.new_stock,
        insertData.reason,
        insertData.reference,
        insertData.notes,
        insertData.user_id,
        insertData.device_id,
        insertData.is_dirty,
        insertData.version,
        insertData.is_deleted,
        insertData.created_at,
        insertData.updated_at
      );

      const created = this.findById(id);
      if (!created) {
        throw new Error(`Failed to retrieve created ${this.tableName}`);
      }

      return created;
    } catch (error) {
      throw new Error(`Failed to create ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Find movements by product
   */
  findByProductId(productId: string, limit?: number): InventoryMovement[] {
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE product_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `;

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(productId) as InventoryMovement[];
  }

  /**
   * Find movements by type (IN, OUT, ADJUSTMENT)
   */
  findByType(
    type: string,
    startDate?: string,
    endDate?: string
  ): InventoryMovement[] {
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE type = ? AND is_deleted = 0
    `;

    const params: any[] = [type];

    if (startDate) {
      sql += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as InventoryMovement[];
  }

  /**
   * Find movements by user
   */
  findByUserId(userId: string): InventoryMovement[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `);

    return stmt.all(userId) as InventoryMovement[];
  }

  /**
   * Get movements in a date range
   */
  findByDateRange(startDate: string, endDate: string): InventoryMovement[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
      ORDER BY created_at DESC
    `);

    return stmt.all(startDate, endDate) as InventoryMovement[];
  }

  /**
   * Get total quantity moved for a product by type
   */
  getTotalQuantityByType(
    productId: string,
    type: string,
    startDate?: string,
    endDate?: string
  ): number {
    let sql = `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM ${this.tableName}
      WHERE product_id = ? AND type = ? AND is_deleted = 0
    `;

    const params: any[] = [productId, type];

    if (startDate) {
      sql += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= ?`;
      params.push(endDate);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { total: number };
    return result.total;
  }

  /**
   * Get inventory summary by product for reporting
   */
  getInventorySummary(
    startDate: string,
    endDate: string
  ): Array<{
    productId: string;
    totalIn: number;
    totalOut: number;
    totalAdjustment: number;
    netChange: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        product_id as productId,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) as totalIn,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) as totalOut,
        COALESCE(SUM(CASE WHEN type = 'ADJUSTMENT' THEN quantity ELSE 0 END), 0) as totalAdjustment,
        COALESCE(SUM(
          CASE
            WHEN type = 'IN' THEN quantity
            WHEN type = 'OUT' THEN -quantity
            ELSE quantity
          END
        ), 0) as netChange
      FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
      GROUP BY product_id
    `);

    return stmt.all(startDate, endDate) as Array<{
      productId: string;
      totalIn: number;
      totalOut: number;
      totalAdjustment: number;
      netChange: number;
    }>;
  }

  /**
   * Get recent movements across all products
   */
  getRecentMovements(limit: number = 50): InventoryMovement[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE is_deleted = 0
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as InventoryMovement[];
  }

  /**
   * Count movements by type in date range
   */
  countByType(
    type: string,
    startDate: string,
    endDate: string
  ): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE type = ? AND created_at >= ? AND created_at <= ?
      AND is_deleted = 0
    `);

    const result = stmt.get(type, startDate, endDate) as { count: number };
    return result.count;
  }

  /**
   * Get movements with product details (for detailed reports)
   */
  getMovementsWithProductDetails(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Array<
    InventoryMovement & {
      productName: string;
      productBarcode?: string;
      userName?: string;
    }
  > {
    let sql = `
      SELECT
        im.*,
        p.name as productName,
        p.barcode as productBarcode,
        u.name as userName
      FROM ${this.tableName} im
      JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.user_id = u.id
      WHERE im.is_deleted = 0
    `;

    const params: any[] = [];

    if (startDate) {
      sql += ` AND im.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND im.created_at <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY im.created_at DESC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Array<
      InventoryMovement & {
        productName: string;
        productBarcode?: string;
        userName?: string;
      }
    >;
  }
}
