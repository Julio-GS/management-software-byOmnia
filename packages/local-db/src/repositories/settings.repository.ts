import Database from 'better-sqlite3';
import { generateUUID } from '../utils/converters';

export interface Setting {
  id: string;
  key: string;
  value: string; // JSON string
  updated_at: string;
}

export class SettingsRepository {
  private db: Database.Database;
  private tableName = 'settings';

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get setting by key
   */
  public getByKey(key: string): Setting | null {
    try {
      const stmt = this.db.prepare(
        `SELECT * FROM ${this.tableName} WHERE key = ? LIMIT 1`
      );
      const result = stmt.get(key) as Setting | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Failed to get setting by key: ${(error as Error).message}`);
    }
  }

  /**
   * Get parsed value by key (returns parsed JSON)
   */
  public getValue<T = any>(key: string): T | null {
    const setting = this.getByKey(key);
    if (!setting) {
      return null;
    }

    try {
      return JSON.parse(setting.value) as T;
    } catch {
      // If not JSON, return as-is
      return setting.value as any;
    }
  }

  /**
   * Get all settings
   */
  public getAll(): Setting[] {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY key ASC`);
      return stmt.all() as Setting[];
    } catch (error) {
      throw new Error(`Failed to get all settings: ${(error as Error).message}`);
    }
  }

  /**
   * Set a setting value (upsert)
   */
  public set(key: string, value: any): Setting {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const now = new Date().toISOString();

      // Check if setting exists
      const existing = this.getByKey(key);

      if (existing) {
        // Update existing
        const stmt = this.db.prepare(
          `UPDATE ${this.tableName} SET value = ?, updated_at = ? WHERE key = ?`
        );
        stmt.run(stringValue, now, key);
      } else {
        // Create new
        const id = generateUUID();
        const stmt = this.db.prepare(
          `INSERT INTO ${this.tableName} (id, key, value, updated_at) VALUES (?, ?, ?, ?)`
        );
        stmt.run(id, key, stringValue, now);
      }

      const updated = this.getByKey(key);
      if (!updated) {
        throw new Error('Failed to retrieve setting after upsert');
      }

      return updated;
    } catch (error) {
      throw new Error(`Failed to set setting: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a setting
   */
  public delete(key: string): boolean {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE key = ?`);
      const result = stmt.run(key);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete setting: ${(error as Error).message}`);
    }
  }

  /**
   * Check if setting exists
   */
  public exists(key: string): boolean {
    try {
      const stmt = this.db.prepare(
        `SELECT 1 FROM ${this.tableName} WHERE key = ? LIMIT 1`
      );
      const result = stmt.get(key);
      return result !== undefined;
    } catch (error) {
      throw new Error(`Failed to check setting existence: ${(error as Error).message}`);
    }
  }
}
