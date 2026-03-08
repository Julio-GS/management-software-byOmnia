import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InventoryMovementEvent } from '../../shared/events';
import { SyncGateway } from '../sync.gateway';

@EventsHandler(InventoryMovementEvent)
export class InventoryMovementHandler implements IEventHandler<InventoryMovementEvent> {
  private readonly logger = new Logger(InventoryMovementHandler.name);

  constructor(private readonly syncGateway: SyncGateway) {}

  handle(event: InventoryMovementEvent) {
    this.logger.log(`Handling InventoryMovementEvent for product: ${event.productId}`);
    
    this.syncGateway.emitInventoryMovement({
      productId: event.productId,
      quantity: event.quantity,
      type: event.type,
      reason: event.reason,
      newStockLevel: event.newStockLevel,
    });
  }
}
