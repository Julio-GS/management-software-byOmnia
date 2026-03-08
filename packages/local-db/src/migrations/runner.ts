import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface Migration {
  id: number;
  name: string;
  appliedAt: string;
}

export class MigrationRunner {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initMigrationTable();
  }

  private initMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  private getAppliedMigrations(): Migration[] {
    const stmt = this.db.prepare('SELECT id, name, applied_at as appliedAt FROM migrations ORDER BY id');
    return stmt.all() as Migration[];
  }

  private getMigrationFiles(): Array<{ id: number; name: string; path: string }> {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        if (!match) {
          throw new Error(`Invalid migration filename: ${file}`);
        }
        return {
          id: parseInt(match[1], 10),
          name: match[2],
          path: path.join(migrationsDir, file)
        };
      })
      .sort((a, b) => a.id - b.id);

    return files;
  }

  public runMigrations(): void {
    const appliedMigrations = this.getAppliedMigrations();
    const migrationFiles = this.getMigrationFiles();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));

    console.log(`Found ${migrationFiles.length} migration files, ${appliedMigrations.length} already applied`);

    for (const migration of migrationFiles) {
      if (appliedIds.has(migration.id)) {
        continue;
      }

      console.log(`Applying migration ${migration.id}: ${migration.name}`);

      try {
        const sql = fs.readFileSync(migration.path, 'utf-8');
        
        this.db.exec('BEGIN TRANSACTION');
        
        this.db.exec(sql);
        
        this.db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
          migration.id,
          migration.name
        );
        
        this.db.exec('COMMIT');
        
        console.log(`Successfully applied migration ${migration.id}`);
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw new Error(`Failed to apply migration ${migration.id}: ${(error as Error).message}`);
      }
    }

    console.log('All migrations applied successfully');
  }

  public getStatus(): { applied: Migration[]; pending: string[] } {
    const appliedMigrations = this.getAppliedMigrations();
    const migrationFiles = this.getMigrationFiles();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));

    const pending = migrationFiles
      .filter(m => !appliedIds.has(m.id))
      .map(m => `${m.id}_${m.name}`);

    return {
      applied: appliedMigrations,
      pending
    };
  }
}
