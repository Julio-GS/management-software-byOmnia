import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SaleCreatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

@EventsHandler(SaleCreatedEvent)
export class SaleCreatedHandler implements IEventHandler<SaleCreatedEvent> {
  private readonly logger = new Logger(SaleCreatedHandler.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: INotificationService,
  ) {}

  async handle(event: SaleCreatedEvent): Promise<void> {
    this.logger.log(`Handling SaleCreatedEvent for sale: ${event.saleId}`);
    
    await this.notificationService.notifySaleCreated(event);
  }
}
