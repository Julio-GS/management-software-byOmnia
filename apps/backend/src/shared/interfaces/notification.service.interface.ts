/**
 * Notification Service Interface
 * 
 * Abstraction for sending real-time notifications across the system.
 * Decouples event handlers from concrete notification implementations (WebSocket, SSE, Email, etc.)
 * 
 * @see WebSocketNotificationService - WebSocket implementation using SyncGateway
 */
export interface INotificationService {
  /**
   * Notify when a product is created
   * @param product - Product data to broadcast
   */
  notifyProductCreated(product: any): Promise<void>;

  /**
   * Notify when a product is updated
   * @param product - Updated product data to broadcast
   */
  notifyProductUpdated(product: any): Promise<void>;

  /**
   * Notify when an inventory movement occurs
   * @param movement - Inventory movement data to broadcast
   */
  notifyInventoryMovement(movement: any): Promise<void>;

  /**
   * Notify when pricing is recalculated
   * @param data - Pricing recalculation data to broadcast
   */
  notifyPricingRecalculated(data: any): Promise<void>;

  /**
   * Notify when a sale is created
   * @param sale - Sale data to broadcast
   */
  notifySaleCreated(sale: any): Promise<void>;

  /**
   * Notify when a sale is cancelled
   * @param sale - Cancelled sale data to broadcast
   */
  notifySaleCancelled(sale: any): Promise<void>;
}
