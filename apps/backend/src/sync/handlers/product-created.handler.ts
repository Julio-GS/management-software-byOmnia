import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ProductCreatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedHandler implements IEventHandler<ProductCreatedEvent> {
  private readonly logger = new Logger(ProductCreatedHandler.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: INotificationService,
  ) {}

  async handle(event: ProductCreatedEvent): Promise<void> {
    this.logger.log(`Handling ProductCreatedEvent for product: ${event.id}`);
    
    await this.notificationService.notifyProductCreated({
      id: event.id,
      name: event.name,
      sku: event.sku,
      barcode: event.barcode,
      categoryId: event.categoryId,
      basePrice: event.basePrice,
    });
  }
}
