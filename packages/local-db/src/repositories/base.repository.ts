import Database from 'better-sqlite3';
import { QueryBuilder, WhereClause } from '../utils/query-builder';
import { generateUUID } from '../utils/converters';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export abstract class BaseRepository<T extends BaseEntity, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  protected db: Database.Database;
  protected tableName: string;

  constructor(db: Database.Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Find a single entity by ID
   */
  public findById(id: string): T | null {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`);
      const result = stmt.get(id) as T | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Failed to find ${this.tableName} by id: ${(error as Error).message}`);
    }
  }

  /**
   * Find all entities
   */
  public findAll(options: PaginationOptions = {}): T[] {
    try {
      const builder = new QueryBuilder(this.tableName)
        .where('is_deleted', '=', 0);

      if (options.limit) {
        builder.limit(options.limit);
      }

      if (options.offset) {
        builder.offset(options.offset);
      }

      const { sql, params } = builder.build();
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(`Failed to find all ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Find one entity by conditions
   */
  public findOne(where: WhereClause[]): T | null {
    try {
      const builder = new QueryBuilder(this.tableName);
      
      where.forEach(clause => {
        builder.where(clause.field, clause.operator, clause.value);
      });
      
      builder.where('is_deleted', '=', 0);
      builder.limit(1);

      const { sql, params } = builder.build();
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as T | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Failed to find one ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new entity
   */
  public create(data: CreateDTO): T {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();
      
      const insertData = {
        id,
        ...data,
        is_dirty: 1,
        version: 1,
        is_deleted: 0,
        created_at: now,
        updated_at: now,
      };

      const { sql, params } = QueryBuilder.buildInsert(this.tableName, insertData);
      const stmt = this.db.prepare(sql);
      stmt.run(...params);

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
   * Update an entity by ID
   */
  public update(id: string, data: UpdateDTO): T | null {
    try {
      const existing = this.findById(id);
      if (!existing) {
        return null;
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { sql, params } = QueryBuilder.buildUpdate(
        this.tableName,
        updateData,
        { field: 'id', operator: '=', value: id }
      );

      const stmt = this.db.prepare(sql);
      stmt.run(...params);

      return this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Soft delete an entity by ID
   */
  public delete(id: string): boolean {
    try {
      const stmt = this.db.prepare(
        `UPDATE ${this.tableName} SET is_deleted = 1, updated_at = ? WHERE id = ?`
      );
      const result = stmt.run(new Date().toISOString(), id);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Hard delete an entity by ID (permanent removal)
   */
  public hardDelete(id: string): boolean {
    try {
      const { sql, params } = QueryBuilder.buildDelete(
        this.tableName,
        { field: 'id', operator: '=', value: id }
      );
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to hard delete ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Count entities
   */
  public count(where: WhereClause[] = []): number {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params: any[] = [];

      const allWhere = [...where, { field: 'is_deleted', operator: '=' as const, value: 0 }];

      if (allWhere.length > 0) {
        const whereStrings = allWhere.map(clause => {
          params.push(clause.value);
          return `${clause.field} ${clause.operator} ?`;
        });
        sql += ` WHERE ${whereStrings.join(' AND ')}`;
      }

      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      throw new Error(`Failed to count ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if entity exists
   */
  public exists(id: string): boolean {
    try {
      const stmt = this.db.prepare(
        `SELECT 1 FROM ${this.tableName} WHERE id = ? AND is_deleted = 0 LIMIT 1`
      );
      const result = stmt.get(id);
      return result !== undefined;
    } catch (error) {
      throw new Error(`Failed to check existence in ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Get paginated results
   */
  public paginate(options: PaginationOptions & { where?: WhereClause[] } = {}): PaginatedResult<T> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const where = options.where || [];

    const total = this.count(where);
    const data = this.findAll({ limit, offset });

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Mark entity as synced
   */
  public markSynced(id: string): boolean {
    try {
      const stmt = this.db.prepare(
        `UPDATE ${this.tableName} SET is_dirty = 0, synced_at = ? WHERE id = ?`
      );
      const result = stmt.run(new Date().toISOString(), id);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to mark ${this.tableName} as synced: ${(error as Error).message}`);
    }
  }

  /**
   * Get dirty (unsynced) entities
   */
  public getDirty(): T[] {
    try {
      const stmt = this.db.prepare(
        `SELECT * FROM ${this.tableName} WHERE is_dirty = 1 AND is_deleted = 0`
      );
      return stmt.all() as T[];
    } catch (error) {
      throw new Error(`Failed to get dirty ${this.tableName}: ${(error as Error).message}`);
    }
  }
}
