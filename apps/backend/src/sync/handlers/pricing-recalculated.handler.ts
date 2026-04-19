import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { PricingRecalculatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

@EventsHandler(PricingRecalculatedEvent)
export class PricingRecalculatedHandler implements IEventHandler<PricingRecalculatedEvent> {
  private readonly logger = new Logger(PricingRecalculatedHandler.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: INotificationService,
  ) {}

  async handle(event: PricingRecalculatedEvent): Promise<void> {
    this.logger.log(`Handling PricingRecalculatedEvent for product: ${event.productId}`);
    
    await this.notificationService.notifyPricingRecalculated({
      type: 'product',
      count: 1,
      id: event.productId,
    });
  }
}
