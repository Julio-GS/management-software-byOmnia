import { io, Socket } from 'socket.io-client';
import { getLogger } from '../utils/logger';
import { dbManager } from '../database/db-manager';
import { generateUUID } from '@omnia/local-db';
import { BrowserWindow } from 'electron';

const logger = getLogger();

/**
 * WebSocket client for real-time sync with backend
 * Handles Socket.io connection with JWT authentication
 */
export class WebSocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private mainWindow: BrowserWindow | null = null;

  /**
   * Set the main window reference for sending events to renderer
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Connect to WebSocket server with JWT authentication
   */
  connect(token: string, backendUrl: string = 'http://localhost:3000'): void {
    if (this.socket?.connected) {
      logger.warn('WebSocket already connected');
      return;
    }

    logger.info(`Connecting to WebSocket at ${backendUrl}/sync`);

    this.socket = io(`${backendUrl}/sync`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
    });

    this.setupListeners();
  }

  /**
   * Setup all WebSocket event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));

    // Product events
    this.socket.on('product:created', this.handleProductCreated.bind(this));
    this.socket.on('product:updated', this.handleProductUpdated.bind(this));
    this.socket.on('product:deleted', this.handleProductDeleted.bind(this));

    // Category events
    this.socket.on('category:created', this.handleCategoryCreated.bind(this));
    this.socket.on('category:updated', this.handleCategoryUpdated.bind(this));
    this.socket.on('category:deleted', this.handleCategoryDeleted.bind(this));

    // Inventory events
    this.socket.on('inventory:movement', this.handleInventoryMovement.bind(this));

    // Pricing events
    this.socket.on('pricing:recalculated', this.handlePricingRecalculated.bind(this));

    logger.info('WebSocket event listeners registered');
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    logger.info('✅ WebSocket connected');

    // Emit sync status to renderer
    this.emitToRenderer('sync:status', {
      status: 'online',
      queuedItems: this.getPendingQueueCount(),
    });

    // Process pending sync queue
    this.processSyncQueue();
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    this.isConnected = false;
    logger.warn(`WebSocket disconnected: ${reason}`);

    // Emit sync status to renderer
    this.emitToRenderer('sync:status', {
      status: 'offline',
      queuedItems: this.getPendingQueueCount(),
    });
  }

  /**
   * Handle connection error
   */
  private handleConnectError(error: Error): void {
    this.reconnectAttempts++;
    logger.error(`WebSocket connection error (attempt ${this.reconnectAttempts}):`, error);

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached');
      this.emitToRenderer('sync:status', {
        status: 'error',
        error: 'Failed to connect to backend',
        queuedItems: this.getPendingQueueCount(),
      });
    }
  }

  /**
   * Handle product created event from backend
   */
  private async handleProductCreated(data: any): Promise<void> {
    try {
      logger.info('Product created event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      // Check if product already exists (avoid duplicates)
      const existing = db
        .prepare('SELECT id FROM products WHERE id = ?')
        .get(data.id);

      if (existing) {
        logger.warn(`Product ${data.id} already exists, updating instead`);
        await this.handleProductUpdated(data);
        return;
      }

      // Insert new product
      db.prepare(`
        INSERT INTO products (
          id, name, barcode, price, cost, stock, category_id, description,
          markup, image_url, synced_at, is_dirty, version, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?)
      `).run(
        data.id,
        data.name,
        data.barcode,
        data.price.toString(),
        data.cost?.toString() || null,
        data.stock || 0,
        data.categoryId || null,
        data.description || null,
        data.markup || null,
        data.imageUrl || null,
        now,
        now,
        now
      );

      logger.info(`✅ Product ${data.id} created locally`);

      // Notify renderer
      this.emitToRenderer('product:created', data);
    } catch (error) {
      logger.error('Error handling product created event:', error);
    }
  }

  /**
   * Handle product updated event from backend
   */
  private async handleProductUpdated(data: any): Promise<void> {
    try {
      logger.info('Product updated event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE products
        SET name = ?, barcode = ?, price = ?, cost = ?, stock = ?,
            category_id = ?, description = ?, markup = ?, image_url = ?,
            synced_at = ?, is_dirty = 0, updated_at = ?
        WHERE id = ?
      `).run(
        data.name,
        data.barcode,
        data.price.toString(),
        data.cost?.toString() || null,
        data.stock || 0,
        data.categoryId || null,
        data.description || null,
        data.markup || null,
        data.imageUrl || null,
        now,
        now,
        data.id
      );

      logger.info(`✅ Product ${data.id} updated locally`);

      // Notify renderer
      this.emitToRenderer('product:updated', data);
    } catch (error) {
      logger.error('Error handling product updated event:', error);
    }
  }

  /**
   * Handle product deleted event from backend (soft delete)
   */
  private async handleProductDeleted(data: any): Promise<void> {
    try {
      logger.info('Product deleted event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      // Soft delete: set deleted_at timestamp
      db.prepare(`
        UPDATE products
        SET deleted_at = ?, is_deleted = 1, synced_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, now, data.id);

      logger.info(`✅ Product ${data.id} soft deleted locally`);

      // Notify renderer
      this.emitToRenderer('product:deleted', data);
    } catch (error) {
      logger.error('Error handling product deleted event:', error);
    }
  }

  /**
   * Handle category created event from backend
   */
  private async handleCategoryCreated(data: any): Promise<void> {
    try {
      logger.info('Category created event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      // Check if category already exists
      const existing = db
        .prepare('SELECT id FROM categories WHERE id = ?')
        .get(data.id);

      if (existing) {
        logger.warn(`Category ${data.id} already exists, updating instead`);
        await this.handleCategoryUpdated(data);
        return;
      }

      db.prepare(`
        INSERT INTO categories (
          id, name, description, default_markup, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.name,
        data.description || null,
        data.defaultMarkup || null,
        now,
        now
      );

      logger.info(`✅ Category ${data.id} created locally`);

      // Notify renderer
      this.emitToRenderer('category:created', data);
    } catch (error) {
      logger.error('Error handling category created event:', error);
    }
  }

  /**
   * Handle category updated event from backend
   */
  private async handleCategoryUpdated(data: any): Promise<void> {
    try {
      logger.info('Category updated event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE categories
        SET name = ?, description = ?, default_markup = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.name,
        data.description || null,
        data.defaultMarkup || null,
        now,
        data.id
      );

      logger.info(`✅ Category ${data.id} updated locally`);

      // If category markup changed, refresh product prices
      // (They will be recalculated on next price query or by backend event)

      // Notify renderer
      this.emitToRenderer('category:updated', data);
    } catch (error) {
      logger.error('Error handling category updated event:', error);
    }
  }

  /**
   * Handle category deleted event from backend (soft delete)
   */
  private async handleCategoryDeleted(data: any): Promise<void> {
    try {
      logger.info('Category deleted event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      // Soft delete: set deleted_at timestamp
      db.prepare(`
        UPDATE categories
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, data.id);

      logger.info(`✅ Category ${data.id} soft deleted locally`);

      // Notify renderer
      this.emitToRenderer('category:deleted', data);
    } catch (error) {
      logger.error('Error handling category deleted event:', error);
    }
  }

  /**
   * Handle inventory movement event from backend
   */
  private async handleInventoryMovement(data: any): Promise<void> {
    try {
      logger.info('Inventory movement event received:', data.id);

      const db = dbManager.getDatabase();
      const now = new Date().toISOString();

      // Check if movement already exists
      const existing = db
        .prepare('SELECT id FROM inventory_movements WHERE id = ?')
        .get(data.id);

      if (existing) {
        logger.warn(`Inventory movement ${data.id} already exists, skipping`);
        return;
      }

      // Insert inventory movement
      db.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, type, quantity, previous_stock, new_stock,
          reason, reference, notes, user_id, device_id,
          synced_at, is_dirty, version, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?)
      `).run(
        data.id,
        data.productId,
        data.type,
        data.quantity,
        data.previousStock || 0,
        data.newStock || 0,
        data.reason || null,
        data.reference || null,
        data.notes || null,
        data.userId || null,
        data.deviceId || null,
        now,
        now,
        now
      );

      // Update product stock locally
      db.prepare(`
        UPDATE products SET stock = ?, updated_at = ? WHERE id = ?
      `).run(data.newStock, now, data.productId);

      logger.info(`✅ Inventory movement ${data.id} created locally, stock updated`);

      // Notify renderer
      this.emitToRenderer('inventory:movement', data);
    } catch (error) {
      logger.error('Error handling inventory movement event:', error);
    }
  }

  /**
   * Handle pricing recalculated event from backend
   */
  private async handlePricingRecalculated(data: any): Promise<void> {
    try {
      logger.info('Pricing recalculated event received:', data);

      // Notify renderer to refresh product prices
      this.emitToRenderer('pricing:recalculated', data);

      // Note: We don't update prices locally here because:
      // 1. Backend will emit individual product:updated events for each changed product
      // 2. Those events will update local prices via handleProductUpdated
      // This event is just a notification for UI to show progress/completion
    } catch (error) {
      logger.error('Error handling pricing recalculated event:', error);
    }
  }

  /**
   * Emit event to renderer process
   */
  private emitToRenderer(event: string, data: any): void {
    if (!this.mainWindow) {
      logger.warn('Main window not set, cannot emit to renderer');
      return;
    }

    this.mainWindow.webContents.send(event, data);
  }

  /**
   * Get count of pending sync queue items
   */
  private getPendingQueueCount(): number {
    try {
      const db = dbManager.getDatabase();
      const result = db
        .prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'")
        .get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Error getting pending queue count:', error);
      return 0;
    }
  }

  /**
   * Process pending sync queue items
   * Called when connection is established
   */
  private async processSyncQueue(): Promise<void> {
    try {
      logger.info('Processing sync queue...');

      const db = dbManager.getDatabase();
      const pendingItems = db
        .prepare(`
          SELECT * FROM sync_queue
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT 50
        `)
        .all() as any[];

      logger.info(`Found ${pendingItems.length} pending sync items`);

      for (const item of pendingItems) {
        await this.processSyncQueueItem(item);
      }

      logger.info('✅ Sync queue processed');

      // Update renderer with new queue count
      this.emitToRenderer('sync:status', {
        status: 'online',
        queuedItems: this.getPendingQueueCount(),
      });
    } catch (error) {
      logger.error('Error processing sync queue:', error);
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processSyncQueueItem(item: any): Promise<void> {
    try {
      logger.info(`Processing sync queue item: ${item.id} (${item.operation} ${item.entity_type})`);

      const payload = JSON.parse(item.payload);

      // Emit to backend via WebSocket
      this.socket?.emit('sync:push', {
        entityType: item.entity_type,
        entityId: item.entity_id,
        operation: item.operation,
        payload,
      });

      // Mark as synced in local queue
      const db = dbManager.getDatabase();
      db.prepare(`
        UPDATE sync_queue
        SET status = 'synced', updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), item.id);

      logger.info(`✅ Sync queue item ${item.id} processed`);
    } catch (error) {
      logger.error(`Error processing sync queue item ${item.id}:`, error);

      // Mark as failed
      const db = dbManager.getDatabase();
      db.prepare(`
        UPDATE sync_queue
        SET status = 'failed', error_message = ?, attempts = attempts + 1, updated_at = ?
        WHERE id = ?
      `).run((error as Error).message, new Date().toISOString(), item.id);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      logger.info('WebSocket disconnected');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  getConnectionStatus(): { connected: boolean; queuedItems: number } {
    return {
      connected: this.isConnected,
      queuedItems: this.getPendingQueueCount(),
    };
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
