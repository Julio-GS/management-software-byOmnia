/**
 * Query builder utilities for constructing safe SQL queries
 */

export interface WhereClause {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN';
  value: any;
}

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export class QueryBuilder {
  private table: string;
  private selectFields: string[] = ['*'];
  private whereClauses: WhereClause[] = [];
  private orderByClause: string | null = null;
  private limitClause: number | null = null;
  private offsetClause: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  public select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  public where(field: string, operator: WhereClause['operator'], value: any): this {
    this.whereClauses.push({ field, operator, value });
    return this;
  }

  public orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `${field} ${direction}`;
    return this;
  }

  public limit(limit: number): this {
    this.limitClause = limit;
    return this;
  }

  public offset(offset: number): this {
    this.offsetClause = offset;
    return this;
  }

  public build(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;
    const params: any[] = [];

    if (this.whereClauses.length > 0) {
      const whereStrings = this.whereClauses.map(clause => {
        if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
          const placeholders = Array.isArray(clause.value)
            ? clause.value.map(() => '?').join(', ')
            : '?';
          if (Array.isArray(clause.value)) {
            params.push(...clause.value);
          } else {
            params.push(clause.value);
          }
          return `${clause.field} ${clause.operator} (${placeholders})`;
        } else {
          params.push(clause.value);
          return `${clause.field} ${clause.operator} ?`;
        }
      });
      sql += ` WHERE ${whereStrings.join(' AND ')}`;
    }

    if (this.orderByClause) {
      sql += ` ORDER BY ${this.orderByClause}`;
    }

    if (this.limitClause !== null) {
      sql += ` LIMIT ${this.limitClause}`;
    }

    if (this.offsetClause !== null) {
      sql += ` OFFSET ${this.offsetClause}`;
    }

    return { sql, params };
  }

  public static buildInsert(table: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const params = fields.map(field => data[field]);

    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    return { sql, params };
  }

  public static buildUpdate(
    table: string,
    data: Record<string, any>,
    whereClause: WhereClause
  ): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = [...fields.map(field => data[field]), whereClause.value];

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause.field} ${whereClause.operator} ?`;
    return { sql, params };
  }

  public static buildDelete(table: string, whereClause: WhereClause): { sql: string; params: any[] } {
    const sql = `DELETE FROM ${table} WHERE ${whereClause.field} ${whereClause.operator} ?`;
    const params = [whereClause.value];
    return { sql, params };
  }
}

export function buildSelectQuery(table: string, options: QueryOptions = {}): { sql: string; params: any[] } {
  const builder = new QueryBuilder(table);

  if (options.where) {
    options.where.forEach(clause => {
      builder.where(clause.field, clause.operator, clause.value);
    });
  }

  if (options.orderBy) {
    builder.orderBy(options.orderBy, options.orderDirection);
  }

  if (options.limit !== undefined) {
    builder.limit(options.limit);
  }

  if (options.offset !== undefined) {
    builder.offset(options.offset);
  }

  return builder.build();
}
