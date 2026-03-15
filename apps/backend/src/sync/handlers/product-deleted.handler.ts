import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProductDeletedEvent } from '../../shared/events';
import { SyncGateway } from '../sync.gateway';

@EventsHandler(ProductDeletedEvent)
export class ProductDeletedHandler implements IEventHandler<ProductDeletedEvent> {
  private readonly logger = new Logger(ProductDeletedHandler.name);

  constructor(private readonly syncGateway: SyncGateway) {}

  handle(event: ProductDeletedEvent) {
    this.logger.log(`Handling ProductDeletedEvent for product: ${event.id}`);
    
    this.syncGateway.emitProductDeleted(event.id);
  }
}
