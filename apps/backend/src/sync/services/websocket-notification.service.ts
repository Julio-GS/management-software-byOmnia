import { Injectable } from '@nestjs/common';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';
import { SyncGateway } from '../sync.gateway';

/**
 * WebSocket implementation of INotificationService
 * 
 * Thin adapter that delegates notification calls to SyncGateway.
 * Decouples event handlers from concrete WebSocket implementation.
 * 
 * @see INotificationService - Notification service interface
 * @see SyncGateway - WebSocket gateway for real-time communication
 */
@Injectable()
export class WebSocketNotificationService implements INotificationService {
  constructor(private readonly syncGateway: SyncGateway) {}

  async notifyProductCreated(product: any): Promise<void> {
    this.syncGateway.emitProductCreated(product);
  }

  async notifyProductUpdated(product: any): Promise<void> {
    this.syncGateway.emitProductUpdated(product);
  }

  async notifyInventoryMovement(movement: any): Promise<void> {
    this.syncGateway.emitInventoryMovement(movement);
  }

  async notifyPricingRecalculated(data: any): Promise<void> {
    this.syncGateway.emitPricingRecalculated(data);
  }

  async notifySaleCreated(sale: any): Promise<void> {
    this.syncGateway.emitSaleCreated(sale);
  }

  async notifySaleCancelled(sale: any): Promise<void> {
    this.syncGateway.emitSaleCancelled(sale);
  }
}
