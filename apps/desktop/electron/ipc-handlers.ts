import { ipcMain, app, dialog } from 'electron';
import { getLogger } from './utils/logger';
import { getUserDataPath } from './utils/paths';
import { dbManager } from './database/db-manager';
import { syncService } from './sync/sync-service';
import { wsClient } from './sync/websocket-client';
import { apiClient } from './api/api-client-instance';
import { authService } from './auth/auth-service';
import { 
  generateUUID,
  ProductsRepository,
  CategoriesRepository,
  InventoryRepository,
  SettingsRepository,
} from '@omnia/local-db';
import fs from 'fs';
import path from 'path';

const log = getLogger();

// ========================================================================
// LAZY REPOSITORY INITIALIZATION
// ========================================================================
// We create repositories on-demand to avoid calling dbManager.getDatabase()
// before the database is initialized in main.ts

function getProductRepo(): ProductsRepository {
  if (!dbManager.isInitialized()) {
    throw new Error('Database not initialized');
  }
  return new ProductsRepository(dbManager.getDatabase());
}

function getCategoryRepo(): CategoriesRepository {
  if (!dbManager.isInitialized()) {
    throw new Error('Database not initialized');
  }
  return new CategoriesRepository(dbManager.getDatabase());
}

function getInventoryRepo(): InventoryRepository {
  if (!dbManager.isInitialized()) {
    throw new Error('Database not initialized');
  }
  return new InventoryRepository(dbManager.getDatabase());
}

function getSettingsRepo(): SettingsRepository {
  if (!dbManager.isInitialized()) {
    throw new Error('Database not initialized');
  }
  return new SettingsRepository(dbManager.getDatabase());
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  // System information
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  ipcMain.handle('get-user-data-path', () => {
    return getUserDataPath();
  });

  // File operations
  ipcMain.handle('read-file', async (_, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      log.error('Error reading file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      log.error('Error writing file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Dialog operations
  ipcMain.handle('show-open-dialog', async (_, options) => {
    const result = await dialog.showOpenDialog(options);
    return result;
  });

  ipcMain.handle('show-save-dialog', async (_, options) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });

  ipcMain.handle('show-message-box', async (_, options) => {
    const result = await dialog.showMessageBox(options);
    return result;
  });

  // ========================================================================
  // PRICING IPC HANDLERS
  // ========================================================================

  /**
   * Calculate price based on cost and markup hierarchy
   */
  ipcMain.handle('pricing:calculate', async (_, { cost, productId, categoryId }) => {
    try {
      // If online, use backend pricing service
      if (syncService.getOnlineStatus()) {
        const result = await apiClient.pricing.calculatePrice({ cost, productId, categoryId });
        return { success: true, data: result };
      }

      // Offline: Calculate locally using same logic as backend
      const markup = await getApplicableMarkupLocal(productId, categoryId);
      const calculatedPrice = cost * (1 + markup.percentage / 100);
      const suggestedPrice = suggestRoundedPrice(calculatedPrice);

      return {
        success: true,
        data: {
          calculatedPrice: Math.round(calculatedPrice * 100) / 100,
          suggestedPrice,
          markupPercentage: markup.percentage,
          markupSource: markup.source,
        },
      };
    } catch (error) {
      log.error('Error calculating price:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Update global markup percentage
   */
  ipcMain.handle('pricing:updateGlobalMarkup', async (_, { percentage }) => {
    try {
      // Offline: Update local setting using SettingsRepository
      getSettingsRepo().set('globalMarkup', percentage.toString());

      // If online, sync to backend
      if (syncService.getOnlineStatus()) {
        await apiClient.pricing.updateGlobalMarkup({ markup: percentage });
      } else {
        // Queue for sync when online
        syncService.queueChange('product', 'global-markup', 'update', { percentage });
      }

      return { success: true };
    } catch (error) {
      log.error('Error updating global markup:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Recalculate prices for a category
   */
  ipcMain.handle('pricing:recalculateCategory', async (_, { categoryId }) => {
    try {
      if (syncService.getOnlineStatus()) {
        // Use direct client call since this method isn't in pricing service yet
        const result = await apiClient.getClient().post(`/pricing/recalculate/category/${categoryId}`);
        return { success: true, data: result.data };
      }

      // Offline: Recalculate locally using repository
      const products = getProductRepo().findByCategory(categoryId);

      let updated = 0;
      for (const product of products) {
        // Skip products with custom markup
        if (product.markup != null) continue;
        
        const markup = await getApplicableMarkupLocal(product.id, categoryId);
        const calculatedPrice = Number(product.cost || 0) * (1 + markup.percentage / 100);
        const suggestedPrice = suggestRoundedPrice(calculatedPrice);

        getProductRepo().update(product.id, { price: suggestedPrice.toString() });
        updated++;
      }

      return { success: true, data: { count: updated } };
    } catch (error) {
      log.error('Error recalculating category prices:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================================================
  // INVENTORY IPC HANDLERS
  // ========================================================================

  /**
   * Create inventory movement
   */
  ipcMain.handle('inventory:createMovement', async (_, { productId, type, quantity, reason, reference, notes, userId }) => {
    try {
      // Get current product stock
      const product = getProductRepo().findById(productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      const previousStock = product.stock;
      let newStock = previousStock;

      // Calculate new stock based on movement type
      switch (type) {
        case 'ENTRY':
          newStock = previousStock + Math.abs(quantity);
          break;
        case 'EXIT':
          newStock = previousStock - Math.abs(quantity);
          break;
        case 'ADJUSTMENT':
          newStock = previousStock + quantity;
          break;
        default:
          return { success: false, error: `Invalid movement type: ${type}` };
      }

      // Create movement record using InventoryRepository
      const movement = getInventoryRepo().create({
        productId,
        type,
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason,
        reference,
        notes,
        userId,
      });

      // Update product stock using repository
      getProductRepo().update(productId, { stock: newStock });

      // If online, sync to backend
      if (syncService.getOnlineStatus()) {
        await apiClient.getClient().post('/inventory/movement', {
          productId,
          type,
          quantity,
          reason,
          reference,
          notes,
          userId,
        });
      } else {
        // Queue for sync when online
        syncService.queueChange('inventory', movement.id, 'create', {
          productId,
          type,
          quantity,
          previousStock,
          newStock,
          reason,
          reference,
          notes,
          userId,
        });
      }

      return {
        success: true,
        data: {
          id: movement.id,
          productId,
          type,
          quantity,
          previousStock,
          newStock,
          reason,
          reference,
          notes,
          userId,
          createdAt: movement.created_at,
        },
      };
    } catch (error) {
      log.error('Error creating inventory movement:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Get inventory movements for a product
   */
  ipcMain.handle('inventory:getMovements', async (_, { productId, type, limit = 50 }) => {
    try {
      let movements;
      
      if (type) {
        // Filter by type if specified
        movements = getInventoryRepo().findByProductId(productId, limit).filter(m => m.type === type);
      } else {
        movements = getInventoryRepo().findByProductId(productId, limit);
      }

      return { success: true, data: movements };
    } catch (error) {
      log.error('Error getting inventory movements:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================================================
  // CATEGORY IPC HANDLERS
  // ========================================================================

  /**
   * Update category markup
   */
  ipcMain.handle('category:updateMarkup', async (_, { categoryId, markup }) => {
    try {
      // Update category using repository
      getCategoryRepo().update(categoryId, { default_markup: markup });

      // If online, sync to backend and trigger price recalculation
      if (syncService.getOnlineStatus()) {
        await apiClient.categories.update(categoryId, { defaultMarkup: markup });
        // Backend will automatically trigger price recalculation and emit WebSocket events
      } else {
        // Queue for sync when online
        syncService.queueChange('category', categoryId, 'update', { defaultMarkup: markup });
      }

      return { success: true };
    } catch (error) {
      log.error('Error updating category markup:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================================================
  // PRODUCT IPC HANDLERS
  // ========================================================================

  /**
   * Update product markup
   */
  ipcMain.handle('product:updateMarkup', async (_, { productId, markup }) => {
    try {
      // Get product to recalculate price
      const product = getProductRepo().findById(productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // Update markup using repository
      getProductRepo().update(productId, { markup });

      // Recalculate price
      const markupData = await getApplicableMarkupLocal(productId, product.category_id || undefined);
      const calculatedPrice = Number(product.cost || 0) * (1 + markupData.percentage / 100);
      const suggestedPrice = suggestRoundedPrice(calculatedPrice);

      // Update price using repository
      getProductRepo().update(productId, { price: suggestedPrice.toString() });

      // If online, sync to backend
      if (syncService.getOnlineStatus()) {
        await apiClient.products.update(productId, { markup });
      } else {
        // Queue for sync when online
        syncService.queueChange('product', productId, 'update', { markup });
      }

      return { success: true, data: { price: suggestedPrice } };
    } catch (error) {
      log.error('Error updating product markup:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Search product by barcode
   */
  ipcMain.handle('product:searchByBarcode', async (_, { barcode }) => {
    try {
      const product = getProductRepo().findByBarcode(barcode);

      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      return { success: true, data: product };
    } catch (error) {
      log.error('Error searching product by barcode:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================================================
  // SYNC IPC HANDLERS
  // ========================================================================

  /**
   * Get sync status
   */
  ipcMain.handle('sync:getStatus', async () => {
    try {
      const status = wsClient.getConnectionStatus();
      const queueStatus = syncService.getQueueStatus();

      return {
        success: true,
        data: {
          connected: status.connected,
          online: syncService.getOnlineStatus(),
          queuedItems: status.queuedItems,
          queue: queueStatus,
        },
      };
    } catch (error) {
      log.error('Error getting sync status:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Force sync now
   */
  ipcMain.handle('sync:forceSync', async () => {
    try {
      await syncService.sync();
      return { success: true };
    } catch (error) {
      log.error('Error forcing sync:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Clear synced queue items
   */
  ipcMain.handle('sync:clearQueue', async () => {
    try {
      syncService.clearSyncedQueue();
      return { success: true };
    } catch (error) {
      log.error('Error clearing sync queue:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  log.info('IPC handlers registered');
}

// ========================================================================
// HELPER FUNCTIONS (Local pricing logic matching backend)
// ========================================================================

/**
 * Get applicable markup for a product (local version)
 * Matches backend PricingService.getApplicableMarkup logic
 */
async function getApplicableMarkupLocal(
  productId?: string,
  categoryId?: string
): Promise<{ percentage: number; source: 'product' | 'category' | 'global' }> {
  // 1. Try product-level markup
  if (productId) {
    const product = getProductRepo().findById(productId);

    if (product?.markup) {
      return {
        percentage: Number(product.markup),
        source: 'product',
      };
    }

    // If product has no markup but has a category, use that categoryId
    if (!categoryId && product?.category_id) {
      categoryId = product.category_id;
    }
  }

  // 2. Try category-level markup
  if (categoryId) {
    const category = getCategoryRepo().findById(categoryId);

    if (category?.default_markup) {
      return {
        percentage: Number(category.default_markup),
        source: 'category',
      };
    }
  }

  // 3. Fall back to global markup
  const globalMarkup = getGlobalMarkupLocal();
  return {
    percentage: globalMarkup,
    source: 'global',
  };
}

/**
 * Get global markup setting (local version)
 */
function getGlobalMarkupLocal(): number {
  const DEFAULT_GLOBAL_MARKUP = 30;

  try {
    const value = getSettingsRepo().getValue<string>('globalMarkup');

    if (value) {
      return Number(value);
    }

    return DEFAULT_GLOBAL_MARKUP;
  } catch (error) {
    log.error('Error fetching global markup, using default:', error);
    return DEFAULT_GLOBAL_MARKUP;
  }
}

/**
 * Suggest rounded price (local version)
 * Matches backend PricingService.suggestRoundedPrice logic
 */
function suggestRoundedPrice(calculatedPrice: number): number {
  if (calculatedPrice < 100) {
    // Round to nearest 10
    return Math.round(calculatedPrice / 10) * 10;
  } else if (calculatedPrice < 1000) {
    // Round to nearest 50
    return Math.round(calculatedPrice / 50) * 50;
  } else {
    // Round to nearest 100
    return Math.round(calculatedPrice / 100) * 100;
  }
}

// ========================================================================
// AUTH IPC HANDLERS
// ========================================================================

ipcMain.handle('auth:getToken', async () => {
  try {
    const token = await authService.getToken();
    return { success: true, token };
  } catch (error) {
    log.error('Error getting auth token:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:getUser', async () => {
  try {
    const user = authService.getCurrentUser();
    return { success: true, user };
  } catch (error) {
    log.error('Error getting current user:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:isAuthenticated', async () => {
  try {
    const token = await authService.getToken();
    const user = authService.getCurrentUser();
    return { success: true, isAuthenticated: !!(token && user), user };
  } catch (error) {
    log.error('Error checking auth status:', error);
    return { success: false, isAuthenticated: false };
  }
});

// ========================================================================
// API IPC HANDLERS
// ========================================================================

ipcMain.handle('api:get', async (_, endpoint: string) => {
  try {
    const response = await apiClient.getClient().get(endpoint);
    return response.data;
  } catch (error) {
    log.error(`Error in API GET ${endpoint}:`, error);
    throw error;
  }
});

ipcMain.handle('api:post', async (_, endpoint: string, data: any) => {
  try {
    const response = await apiClient.getClient().post(endpoint, data);
    return response.data;
  } catch (error) {
    log.error(`Error in API POST ${endpoint}:`, error);
    throw error;
  }
});

ipcMain.handle('api:put', async (_, endpoint: string, data: any) => {
  try {
    const response = await apiClient.getClient().put(endpoint, data);
    return response.data;
  } catch (error) {
    log.error(`Error in API PUT ${endpoint}:`, error);
    throw error;
  }
});

ipcMain.handle('api:delete', async (_, endpoint: string) => {
  try {
    const response = await apiClient.getClient().delete(endpoint);
    return response.data;
  } catch (error) {
    log.error(`Error in API DELETE ${endpoint}:`, error);
    throw error;
  }
});
