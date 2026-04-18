import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ProductUpdatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedHandler implements IEventHandler<ProductUpdatedEvent> {
  private readonly logger = new Logger(ProductUpdatedHandler.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: INotificationService,
  ) {}

  async handle(event: ProductUpdatedEvent): Promise<void> {
    this.logger.log(`Handling ProductUpdatedEvent for product: ${event.id}`);
    
    await this.notificationService.notifyProductUpdated({
      id: event.id,
      ...event.changes,
    });
  }
}
