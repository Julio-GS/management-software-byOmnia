import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { InventoryMovementEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

@EventsHandler(InventoryMovementEvent)
export class InventoryMovementHandler implements IEventHandler<InventoryMovementEvent> {
  private readonly logger = new Logger(InventoryMovementHandler.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: INotificationService,
  ) {}

  async handle(event: InventoryMovementEvent): Promise<void> {
    this.logger.log(`Handling InventoryMovementEvent for product: ${event.productId}`);
    
    await this.notificationService.notifyInventoryMovement({
      productId: event.productId,
      quantity: event.quantity,
      type: event.type,
      reason: event.reason,
      newStockLevel: event.newStockLevel,
    });
  }
}
