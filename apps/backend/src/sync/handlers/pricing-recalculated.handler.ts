import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PricingRecalculatedEvent } from '../../shared/events';
import { SyncGateway } from '../sync.gateway';

@EventsHandler(PricingRecalculatedEvent)
export class PricingRecalculatedHandler implements IEventHandler<PricingRecalculatedEvent> {
  private readonly logger = new Logger(PricingRecalculatedHandler.name);

  constructor(private readonly syncGateway: SyncGateway) {}

  handle(event: PricingRecalculatedEvent) {
    this.logger.log(`Handling PricingRecalculatedEvent for product: ${event.productId}`);
    
    this.syncGateway.emitPricingRecalculated({
      type: 'product',
      count: 1,
      id: event.productId,
    });
  }
}
