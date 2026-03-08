import Database from 'better-sqlite3';
import { MigrationRunner } from './migrations/runner';

export interface DatabaseConfig {
  filePath: string;
  verbose?: boolean;
  readonly?: boolean;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public initialize(config: DatabaseConfig): void {
    if (this.db) {
      throw new Error('Database already initialized');
    }

    try {
      this.db = new Database(config.filePath, {
        verbose: config.verbose ? console.log : undefined,
        readonly: config.readonly || false,
      });

      this.configurePragmas();
      
      if (!config.readonly) {
        this.runMigrations();
      }

      console.log(`Database initialized at ${config.filePath}`);
    } catch (error) {
      throw new Error(`Failed to initialize database: ${(error as Error).message}`);
    }
  }

  private configurePragmas(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('temp_store = MEMORY');
  }

  private runMigrations(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const runner = new MigrationRunner(this.db);
    runner.runMigrations();
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public isInitialized(): boolean {
    return this.db !== null;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  public vacuum(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.exec('VACUUM');
    console.log('Database vacuumed');
  }

  public getStats(): {
    pageSize: number;
    pageCount: number;
    schemaVersion: number;
    walCheckpoint: boolean;
  } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const pageSize = this.db.pragma('page_size', { simple: true }) as number;
    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const schemaVersion = this.db.pragma('schema_version', { simple: true }) as number;
    
    this.db.pragma('wal_checkpoint(PASSIVE)');
    const walCheckpoint = true;

    return {
      pageSize,
      pageCount,
      schemaVersion,
      walCheckpoint,
    };
  }

  public backup(destinationPath: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.backup(destinationPath);
      console.log(`Database backed up to ${destinationPath}`);
    } catch (error) {
      throw new Error(`Backup failed: ${(error as Error).message}`);
    }
  }
}

export const dbManager = DatabaseManager.getInstance();
