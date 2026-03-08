import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProductUpdatedEvent } from '../../shared/events';
import { SyncGateway } from '../sync.gateway';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedHandler implements IEventHandler<ProductUpdatedEvent> {
  private readonly logger = new Logger(ProductUpdatedHandler.name);

  constructor(private readonly syncGateway: SyncGateway) {}

  handle(event: ProductUpdatedEvent) {
    this.logger.log(`Handling ProductUpdatedEvent for product: ${event.id}`);
    
    this.syncGateway.emitProductUpdated({
      id: event.id,
      ...event.changes,
    });
  }
}
