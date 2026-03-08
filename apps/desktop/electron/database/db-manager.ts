import path from 'path';
import { app } from 'electron';
import {
  DatabaseManager,
  CategoriesRepository,
  ProductsRepository,
  SalesRepository,
  SaleItemsRepository,
  InventoryRepository,
  UsersRepository,
} from '@omnia/local-db';
import { getLogger } from '../utils/logger';
import { getUserDataPath } from '../utils/paths';

const logger = getLogger();

class ElectronDatabaseManager {
  private dbManager: DatabaseManager | null = null;
  private dbPath: string = '';

  // Repositories
  public categories: CategoriesRepository | null = null;
  public products: ProductsRepository | null = null;
  public sales: SalesRepository | null = null;
  public saleItems: SaleItemsRepository | null = null;
  public inventory: InventoryRepository | null = null;
  public users: UsersRepository | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      // Get database path in user data directory
      const userDataPath = getUserDataPath();
      this.dbPath = path.join(userDataPath, 'omnia.db');

      logger.info(`Initializing database at: ${this.dbPath}`);

      // Create database manager instance
      this.dbManager = DatabaseManager.getInstance();

      // Initialize database (runs migrations)
      this.dbManager.initialize({ filePath: this.dbPath });

      // Initialize repositories
      const db = this.dbManager.getDatabase();
      this.categories = new CategoriesRepository(db);
      this.products = new ProductsRepository(db);
      this.sales = new SalesRepository(db);
      this.saleItems = new SaleItemsRepository(db);
      this.inventory = new InventoryRepository(db);
      this.users = new UsersRepository(db);

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.dbManager) {
      this.dbManager.close();
      this.dbManager = null;
      this.categories = null;
      this.products = null;
      this.sales = null;
      this.saleItems = null;
      this.inventory = null;
      this.users = null;
      logger.info('Database closed');
    }
  }

  /**
   * Create a backup of the database
   */
  backup(): string {
    if (!this.dbManager) {
      throw new Error('Database not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      getUserDataPath(),
      'backups',
      `omnia-backup-${timestamp}.db`
    );

    this.dbManager.backup(backupPath);
    logger.info(`Database backed up to: ${backupPath}`);
    return backupPath;
  }

  /**
   * Vacuum the database to optimize storage
   */
  vacuum(): void {
    if (!this.dbManager) {
      throw new Error('Database not initialized');
    }

    this.dbManager.vacuum();
    logger.info('Database vacuumed');
  }

  /**
   * Get the database file path
   */
  getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.dbManager !== null;
  }

  /**
   * Get database instance (for advanced usage)
   */
  getDatabase() {
    if (!this.dbManager) {
      throw new Error('Database not initialized');
    }
    return this.dbManager.getDatabase();
  }
}

// Export singleton instance
export const dbManager = new ElectronDatabaseManager();
