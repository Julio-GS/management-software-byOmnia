import { ipcMain, app, dialog } from 'electron';
import { getLogger } from './utils/logger';
import { getUserDataPath } from './utils/paths';
import { dbManager } from './database/db-manager';
import { syncService } from './sync/sync-service';
import { wsClient } from './sync/websocket-client';
import { httpClient } from './api/http-client';
import { authService } from './auth/auth-service';
import { generateUUID } from '@omnia/local-db';
import fs from 'fs';
import path from 'path';

const log = getLogger();

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
        const result = await httpClient.post('/api/pricing/calculate', {
          cost,
          productId,
          categoryId,
        });
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
      const db = dbManager.getDatabase();

      // Update or insert global markup setting
      const existing = db.prepare("SELECT id FROM settings WHERE key = 'globalMarkup'").get() as any;

      if (existing) {
        db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'globalMarkup'").run(
          percentage.toString(),
          new Date().toISOString()
        );
      } else {
        db.prepare("INSERT INTO settings (id, key, value, updated_at) VALUES (?, 'globalMarkup', ?, ?)").run(
          generateUUID(),
          percentage.toString(),
          new Date().toISOString()
        );
      }

      // If online, sync to backend
      if (syncService.getOnlineStatus()) {
        await httpClient.post('/api/pricing/global-markup', { percentage });
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
        const result = await httpClient.post(`/api/pricing/recalculate/category/${categoryId}`);
        return { success: true, data: result };
      }

      // Offline: Recalculate locally
      const db = dbManager.getDatabase();
      const products = db
        .prepare(`
          SELECT id, cost FROM products
          WHERE category_id = ? AND markup IS NULL AND deleted_at IS NULL
        `)
        .all(categoryId) as any[];

      let updated = 0;
      for (const product of products) {
        const markup = await getApplicableMarkupLocal(product.id, categoryId);
        const calculatedPrice = Number(product.cost) * (1 + markup.percentage / 100);
        const suggestedPrice = suggestRoundedPrice(calculatedPrice);

        db.prepare('UPDATE products SET price = ?, updated_at = ? WHERE id = ?').run(
          suggestedPrice.toString(),
          new Date().toISOString(),
          product.id
        );
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
      const db = dbManager.getDatabase();

      // Get current product stock
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId) as any;
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

      const movementId = generateUUID();
      const now = new Date().toISOString();

      // Create movement record
      db.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, type, quantity, previous_stock, new_stock,
          reason, reference, notes, user_id, is_dirty, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        movementId,
        productId,
        type,
        quantity,
        previousStock,
        newStock,
        reason || null,
        reference || null,
        notes || null,
        userId || null,
        now,
        now
      );

      // Update product stock
      db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(
        newStock,
        now,
        productId
      );

      // If online, sync to backend
      if (syncService.getOnlineStatus()) {
        await httpClient.post('/api/inventory/movements', {
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
        syncService.queueChange('inventory', movementId, 'create', {
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
          id: movementId,
          productId,
          type,
          quantity,
          previousStock,
          newStock,
          reason,
          reference,
          notes,
          userId,
          createdAt: now,
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
      const db = dbManager.getDatabase();

      let query = 'SELECT * FROM inventory_movements WHERE product_id = ?';
      const params: any[] = [productId];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const movements = db.prepare(query).all(...params);

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
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      db.prepare('UPDATE categories SET default_markup = ?, updated_at = ? WHERE id = ?').run(
        markup,
        now,
        categoryId
      );

      // If online, sync to backend and trigger price recalculation
      if (syncService.getOnlineStatus()) {
        await httpClient.patch(`/api/categories/${categoryId}`, { defaultMarkup: markup });
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
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      // Get product to recalculate price
      const product = db.prepare('SELECT cost, category_id FROM products WHERE id = ?').get(productId) as any;
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // Update markup
      db.prepare('UPDATE products SET markup = ?, updated_at = ? WHERE id = ?').run(
        markup,
        now,
        productId
      );

      // Recalculate price
      const markupData = await getApplicableMarkupLocal(productId, product.category_id);
      const calculatedPrice = Number(product.cost) * (1 + markupData.percentage / 100);
      const suggestedPrice = suggestRoundedPrice(calculatedPrice);

      db.prepare('UPDATE products SET price = ?, updated_at = ? WHERE id = ?').run(
        suggestedPrice.toString(),
        now,
        productId
      );

      // If online, sync to backend
      if (syncService.getOnlineStatus()) {
        await httpClient.patch(`/api/products/${productId}`, { markup });
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
      const db = dbManager.getDatabase();
      const product = db
        .prepare('SELECT * FROM products WHERE barcode = ? AND deleted_at IS NULL')
        .get(barcode);

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
  const db = dbManager.getDatabase();

  // 1. Try product-level markup
  if (productId) {
    const product = db
      .prepare('SELECT markup, category_id FROM products WHERE id = ?')
      .get(productId) as any;

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
    const category = db
      .prepare('SELECT default_markup FROM categories WHERE id = ?')
      .get(categoryId) as any;

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
    const db = dbManager.getDatabase();
    const setting = db
      .prepare("SELECT value FROM settings WHERE key = 'globalMarkup'")
      .get() as any;

    if (setting?.value) {
      return Number(setting.value);
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
    const response = await httpClient.get(endpoint);
    return response.data;
  } catch (error) {
    log.error(`Error in API GET ${endpoint}:`, error);
    throw error;
  }
});

ipcMain.handle('api:post', async (_, endpoint: string, data: any) => {
  try {
    const response = await httpClient.post(endpoint, data);
    return response.data;
  } catch (error) {
    log.error(`Error in API POST ${endpoint}:`, error);
    throw error;
  }
});

ipcMain.handle('api:put', async (_, endpoint: string, data: any) => {
  try {
    const response = await httpClient.put(endpoint, data);
    return response.data;
  } catch (error) {
    log.error(`Error in API PUT ${endpoint}:`, error);
    throw error;
  }
});

ipcMain.handle('api:delete', async (_, endpoint: string) => {
  try {
    const response = await httpClient.delete(endpoint);
    return response.data;
  } catch (error) {
    log.error(`Error in API DELETE ${endpoint}:`, error);
    throw error;
  }
});
