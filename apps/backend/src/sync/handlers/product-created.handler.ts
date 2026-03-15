import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProductCreatedEvent } from '../../shared/events';
import { SyncGateway } from '../sync.gateway';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedHandler implements IEventHandler<ProductCreatedEvent> {
  private readonly logger = new Logger(ProductCreatedHandler.name);

  constructor(private readonly syncGateway: SyncGateway) {}

  handle(event: ProductCreatedEvent) {
    this.logger.log(`Handling ProductCreatedEvent for product: ${event.id}`);
    
    this.syncGateway.emitProductCreated({
      id: event.id,
      name: event.name,
      sku: event.sku,
      barcode: event.barcode,
      categoryId: event.categoryId,
      basePrice: event.basePrice,
    });
  }
}
