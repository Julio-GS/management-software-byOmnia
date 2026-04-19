import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SaleCancelledEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

@EventsHandler(SaleCancelledEvent)
export class SaleCancelledHandler implements IEventHandler<SaleCancelledEvent> {
  private readonly logger = new Logger(SaleCancelledHandler.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: INotificationService,
  ) {}

  async handle(event: SaleCancelledEvent): Promise<void> {
    this.logger.log(`Handling SaleCancelledEvent for sale: ${event.saleId}`);
    
    await this.notificationService.notifySaleCancelled(event);
  }
}
