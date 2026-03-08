import { httpClient } from '../api/http-client';
import { getLogger } from '../utils/logger';
import { dbManager } from '../database/db-manager';
import { wsClient } from './websocket-client';
import { generateUUID } from '@omnia/local-db';

const logger = getLogger();

/**
 * Sync service for background data synchronization
 * 
 * Automatically syncs local database changes with the backend
 * Handles 401 errors transparently through httpClient
 * Integrates WebSocket for real-time sync and offline queue management
 */
class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private isSyncing = false;
  private isOnline = false;

  /**
   * Start background sync and WebSocket connection
   */
  startAutoSync(token: string, backendUrl?: string): void {
    if (this.syncInterval) {
      logger.warn('Auto-sync already running');
      return;
    }

    logger.info(`Starting auto-sync (every ${this.SYNC_INTERVAL_MS / 1000}s)`);

    // Connect WebSocket for real-time sync
    wsClient.connect(token, backendUrl);
    this.isOnline = true;

    // Initial sync
    this.sync();

    // Schedule periodic sync (fallback for missed WebSocket events)
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop background sync and disconnect WebSocket
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Auto-sync stopped');
    }

    // Disconnect WebSocket
    wsClient.disconnect();
    this.isOnline = false;
  }

  /**
   * Perform a manual sync
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      logger.debug('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      logger.info('Starting sync...');

      // Get dirty (modified) records from local DB
      const dirtyProducts = this.getDirtyProducts();
      const dirtyCategories = this.getDirtyCategories();

      if (dirtyProducts.length === 0 && dirtyCategories.length === 0) {
        logger.debug('No changes to sync');
        return;
      }

      logger.info(`Syncing ${dirtyProducts.length} products, ${dirtyCategories.length} categories`);

      // Push changes to backend
      // The httpClient will automatically handle 401 and retry
      const syncResult = await httpClient.post('/api/v1/sync/logs', {
        products: dirtyProducts,
        categories: dirtyCategories,
      });

      logger.info('Sync successful:', syncResult);

      // Mark records as synced
      this.markAsSynced(dirtyProducts, dirtyCategories);

      // Pull any updates from backend
      await this.pullUpdates();
    } catch (error) {
      logger.error('Sync failed:', error);
      // Don't throw - we'll retry on the next sync cycle
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get products that have been modified locally
   */
  private getDirtyProducts(): any[] {
    const db = dbManager.getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE is_dirty = 1 AND is_deleted = 0');
    return stmt.all();
  }

  /**
   * Get categories that have been modified locally
   */
  private getDirtyCategories(): any[] {
    const db = dbManager.getDatabase();
    const stmt = db.prepare('SELECT * FROM categories WHERE is_dirty = 1 AND is_deleted = 0');
    return stmt.all();
  }

  /**
   * Mark records as synced
   */
  private markAsSynced(products: any[], categories: any[]): void {
    const db = dbManager.getDatabase();
    const now = new Date().toISOString();

    const updateProduct = db.prepare(
      'UPDATE products SET is_dirty = 0, synced_at = ? WHERE id = ?'
    );

    const updateCategory = db.prepare(
      'UPDATE categories SET is_dirty = 0, synced_at = ? WHERE id = ?'
    );

    for (const product of products) {
      updateProduct.run(now, product.id);
    }

    for (const category of categories) {
      updateCategory.run(now, category.id);
    }

    logger.info('Marked records as synced');
  }

  /**
   * Pull updates from backend
   */
  private async pullUpdates(): Promise<void> {
    try {
      // Get last sync timestamp
      const lastSync = this.getLastSyncTimestamp();

      // Fetch updates from backend
      const updates = await httpClient.get(`/api/v1/sync/logs?since=${lastSync}`);

      logger.info(`Received ${updates.products?.length || 0} product updates`);

      // Apply updates to local DB
      // TODO: Implement update logic
    } catch (error) {
      logger.error('Failed to pull updates:', error);
    }
  }

  /**
   * Get timestamp of last successful sync
   */
  private getLastSyncTimestamp(): string {
    const db = dbManager.getDatabase();
    const result = db
      .prepare('SELECT MAX(synced_at) as last_sync FROM products')
      .get() as { last_sync: string | null };

    return result.last_sync || new Date(0).toISOString();
  }

  /**
   * Queue a change for sync when offline
   */
  queueChange(
    entityType: 'product' | 'category' | 'inventory' | 'sale',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: any
  ): void {
    try {
      const db = dbManager.getDatabase();
      const queueId = generateUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(
        queueId,
        entityType,
        entityId,
        operation,
        JSON.stringify(payload),
        now,
        now
      );

      logger.info(`Queued ${operation} ${entityType} ${entityId} for sync (ID: ${queueId})`);

      // If online, try to sync immediately
      if (this.isOnline && wsClient.getConnectionStatus().connected) {
        this.processQueueItem(queueId);
      }
    } catch (error) {
      logger.error('Error queuing change for sync:', error);
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(queueId: string): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      const item = db.prepare('SELECT * FROM sync_queue WHERE id = ?').get(queueId) as any;

      if (!item || item.status !== 'pending') {
        return;
      }

      const payload = JSON.parse(item.payload);

      // Send to backend via appropriate HTTP endpoint
      let endpoint = '';
      let method = 'POST';

      switch (item.entity_type) {
        case 'product':
          endpoint = item.operation === 'create' ? '/api/v1/products' : `/api/v1/products/${item.entity_id}`;
          method = item.operation === 'delete' ? 'DELETE' : item.operation === 'update' ? 'PATCH' : 'POST';
          break;
        case 'category':
          endpoint = item.operation === 'create' ? '/api/v1/categories' : `/api/v1/categories/${item.entity_id}`;
          method = item.operation === 'delete' ? 'DELETE' : item.operation === 'update' ? 'PATCH' : 'POST';
          break;
        case 'inventory':
          endpoint = '/api/v1/inventory/movement';
          method = 'POST';
          break;
        case 'sale':
          endpoint = '/api/v1/sales';
          method = 'POST';
          break;
      }

      // Send to backend
      if (method === 'GET') {
        await httpClient.get(endpoint);
      } else if (method === 'POST') {
        await httpClient.post(endpoint, payload);
      } else if (method === 'PATCH') {
        await httpClient.patch(endpoint, payload);
      } else if (method === 'DELETE') {
        await httpClient.delete(endpoint);
      }

      // Mark as synced
      db.prepare(`
        UPDATE sync_queue
        SET status = 'synced', updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), queueId);

      logger.info(`✅ Synced queue item ${queueId}`);
    } catch (error) {
      logger.error(`Error processing queue item ${queueId}:`, error);

      // Mark as failed
      const db = dbManager.getDatabase();
      db.prepare(`
        UPDATE sync_queue
        SET status = 'failed', error_message = ?, attempts = attempts + 1, updated_at = ?
        WHERE id = ?
      `).run((error as Error).message, new Date().toISOString(), queueId);
    }
  }

  /**
   * Get sync queue status
   */
  getQueueStatus(): {
    pending: number;
    synced: number;
    failed: number;
  } {
    const db = dbManager.getDatabase();
    
    const pending = (db.prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'").get() as any).count;
    const synced = (db.prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'synced'").get() as any).count;
    const failed = (db.prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'").get() as any).count;

    return { pending, synced, failed };
  }

  /**
   * Clear synced items from queue (older than 7 days)
   */
  clearSyncedQueue(): void {
    const db = dbManager.getDatabase();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = db.prepare(`
      DELETE FROM sync_queue
      WHERE status = 'synced' AND updated_at < ?
    `).run(sevenDaysAgo);

    logger.info(`Cleared ${result.changes} synced items from queue`);
  }

  /**
   * Check if service is online and connected
   */
  getOnlineStatus(): boolean {
    return this.isOnline && wsClient.getConnectionStatus().connected;
  }
}

// Singleton instance
export const syncService = new SyncService();
