import { ipcMain } from 'electron';
import { dbManager } from './db-manager';
import { getLogger } from '../utils/logger';
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CreateProductDTO,
  UpdateProductDTO,
  CreateSaleDTO,
  CreateUserDTO,
  UpdateUserDTO,
  CreateInventoryMovementDTO,
  UpdateInventoryMovementDTO,
  ProductSearchOptions,
  SalesSearchOptions,
} from '@omnia/local-db';

const logger = getLogger();

/**
 * Register all database IPC handlers
 */
export function registerDatabaseHandlers() {
  // ============================================================================
  // CATEGORIES
  // ============================================================================

  ipcMain.handle('db:categories:getAll', async () => {
    try {
      return dbManager.categories!.findAll();
    } catch (error) {
      logger.error('Error getting all categories:', error);
      throw error;
    }
  });

  ipcMain.handle('db:categories:getById', async (_, id: string) => {
    try {
      return dbManager.categories!.findById(id);
    } catch (error) {
      logger.error(`Error getting category ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:categories:create', async (_, data: CreateCategoryDTO) => {
    try {
      return dbManager.categories!.create(data);
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:categories:update',
    async (_, id: string, data: UpdateCategoryDTO) => {
      try {
        return dbManager.categories!.update(id, data);
      } catch (error) {
        logger.error(`Error updating category ${id}:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle('db:categories:delete', async (_, id: string) => {
    try {
      dbManager.categories!.delete(id);
    } catch (error) {
      logger.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  });

  // ============================================================================
  // PRODUCTS
  // ============================================================================

  ipcMain.handle('db:products:getAll', async () => {
    try {
      return dbManager.products!.findAll();
    } catch (error) {
      logger.error('Error getting all products:', error);
      throw error;
    }
  });

  ipcMain.handle('db:products:getById', async (_, id: string) => {
    try {
      return dbManager.products!.findById(id);
    } catch (error) {
      logger.error(`Error getting product ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:products:getByBarcode', async (_, barcode: string) => {
    try {
      return dbManager.products!.findByBarcode(barcode);
    } catch (error) {
      logger.error(`Error getting product by barcode ${barcode}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:products:search', async (_, options: ProductSearchOptions) => {
    try {
      return dbManager.products!.search(options);
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  });

  ipcMain.handle('db:products:getLowStock', async (_, threshold: number) => {
    try {
      return dbManager.products!.getLowStock(threshold);
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  });

  ipcMain.handle('db:products:create', async (_, data: CreateProductDTO) => {
    try {
      return dbManager.products!.create(data);
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:products:update',
    async (_, id: string, data: UpdateProductDTO) => {
      try {
        return dbManager.products!.update(id, data);
      } catch (error) {
        logger.error(`Error updating product ${id}:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle('db:products:delete', async (_, id: string) => {
    try {
      dbManager.products!.delete(id);
    } catch (error) {
      logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:products:updateStock',
    async (_, id: string, newStock: number) => {
      try {
        return dbManager.products!.updateStock(id, newStock);
      } catch (error) {
        logger.error(`Error updating stock for product ${id}:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'db:products:adjustStock',
    async (_, id: string, adjustment: number) => {
      try {
        return dbManager.products!.adjustStock(id, adjustment);
      } catch (error) {
        logger.error(`Error adjusting stock for product ${id}:`, error);
        throw error;
      }
    }
  );

  // ============================================================================
  // SALES
  // ============================================================================

  ipcMain.handle('db:sales:getAll', async () => {
    try {
      return dbManager.sales!.findAll();
    } catch (error) {
      logger.error('Error getting all sales:', error);
      throw error;
    }
  });

  ipcMain.handle('db:sales:getById', async (_, id: string) => {
    try {
      return dbManager.sales!.findById(id);
    } catch (error) {
      logger.error(`Error getting sale ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:sales:create', async (_, data: CreateSaleDTO) => {
    try {
      return dbManager.sales!.createSaleWithItems(data);
    } catch (error) {
      logger.error('Error creating sale:', error);
      throw error;
    }
  });

  ipcMain.handle('db:sales:search', async (_, options: SalesSearchOptions) => {
    try {
      return dbManager.sales!.search(options);
    } catch (error) {
      logger.error('Error searching sales:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:sales:getByDateRange',
    async (_, startDate: string, endDate: string) => {
      try {
        return dbManager.sales!.findByDateRange(startDate, endDate);
      } catch (error) {
        logger.error('Error getting sales by date range:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'db:sales:getTotalSales',
    async (_, startDate: string, endDate: string) => {
      try {
        return dbManager.sales!.getTotalSales(startDate, endDate);
      } catch (error) {
        logger.error('Error getting total sales:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'db:sales:getSalesByPaymentMethod',
    async (_, startDate: string, endDate: string) => {
      try {
        return dbManager.sales!.getSalesByPaymentMethod(startDate, endDate);
      } catch (error) {
        logger.error('Error getting sales by payment method:', error);
        throw error;
      }
    }
  );

  // ============================================================================
  // SALE ITEMS
  // ============================================================================

  ipcMain.handle('db:saleItems:getBySaleId', async (_, saleId: string) => {
    try {
      return dbManager.saleItems!.findBySaleId(saleId);
    } catch (error) {
      logger.error(`Error getting sale items for sale ${saleId}:`, error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:saleItems:getTopSellingProducts',
    async (_, startDate: string, endDate: string, limit?: number) => {
      try {
        return dbManager.saleItems!.getTopSellingProducts(
          startDate,
          endDate,
          limit
        );
      } catch (error) {
        logger.error('Error getting top selling products:', error);
        throw error;
      }
    }
  );

  // ============================================================================
  // INVENTORY
  // ============================================================================

  ipcMain.handle('db:inventory:getAll', async () => {
    try {
      return dbManager.inventory!.findAll();
    } catch (error) {
      logger.error('Error getting all inventory movements:', error);
      throw error;
    }
  });

  ipcMain.handle('db:inventory:getById', async (_, id: string) => {
    try {
      return dbManager.inventory!.findById(id);
    } catch (error) {
      logger.error(`Error getting inventory movement ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:inventory:getByProductId',
    async (_, productId: string, limit?: number) => {
      try {
        return dbManager.inventory!.findByProductId(productId, limit);
      } catch (error) {
        logger.error(`Error getting inventory for product ${productId}:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'db:inventory:create',
    async (_, data: CreateInventoryMovementDTO) => {
      try {
        return dbManager.inventory!.create(data);
      } catch (error) {
        logger.error('Error creating inventory movement:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'db:inventory:update',
    async (_, id: string, data: UpdateInventoryMovementDTO) => {
      try {
        return dbManager.inventory!.update(id, data);
      } catch (error) {
        logger.error(`Error updating inventory movement ${id}:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'db:inventory:getRecentMovements',
    async (_, limit?: number) => {
      try {
        return dbManager.inventory!.getRecentMovements(limit);
      } catch (error) {
        logger.error('Error getting recent inventory movements:', error);
        throw error;
      }
    }
  );

  // ============================================================================
  // USERS
  // ============================================================================

  ipcMain.handle('db:users:getAll', async () => {
    try {
      return dbManager.users!.findAll();
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  });

  ipcMain.handle('db:users:getById', async (_, id: string) => {
    try {
      return dbManager.users!.findById(id);
    } catch (error) {
      logger.error(`Error getting user ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:users:getByEmail', async (_, email: string) => {
    try {
      return dbManager.users!.findByEmail(email);
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:users:create', async (_, data: CreateUserDTO) => {
    try {
      return dbManager.users!.create(data);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'db:users:update',
    async (_, id: string, data: UpdateUserDTO) => {
      try {
        return dbManager.users!.update(id, data);
      } catch (error) {
        logger.error(`Error updating user ${id}:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle('db:users:delete', async (_, id: string) => {
    try {
      dbManager.users!.delete(id);
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:users:search', async (_, query: string) => {
    try {
      return dbManager.users!.search(query);
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  });

  // ============================================================================
  // DATABASE MANAGEMENT
  // ============================================================================

  ipcMain.handle('db:backup', async () => {
    try {
      return await dbManager.backup();
    } catch (error) {
      logger.error('Error creating database backup:', error);
      throw error;
    }
  });

  ipcMain.handle('db:vacuum', async () => {
    try {
      await dbManager.vacuum();
    } catch (error) {
      logger.error('Error vacuuming database:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getPath', async () => {
    try {
      return dbManager.getDatabasePath();
    } catch (error) {
      logger.error('Error getting database path:', error);
      throw error;
    }
  });

  logger.info('Database IPC handlers registered');
}
