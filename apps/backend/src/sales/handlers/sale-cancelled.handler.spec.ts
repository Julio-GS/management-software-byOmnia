import { Test, TestingModule } from '@nestjs/testing';
import { SaleCancelledHandler } from './sale-cancelled.handler';
import { SaleCancelledEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

describe('SaleCancelledHandler', () => {
  let handler: SaleCancelledHandler;
  let notificationService: INotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleCancelledHandler,
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            notifySaleCancelled: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<SaleCancelledHandler>(SaleCancelledHandler);
    notificationService = module.get<INotificationService>('NOTIFICATION_SERVICE');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call notificationService.notifySaleCancelled when event is handled', async () => {
    const event = new SaleCancelledEvent(
      'sale-123',
      'Customer requested refund',
      new Date('2026-04-16'),
      'user-123',
      'correlation-123',
    );

    await handler.handle(event);

    expect(notificationService.notifySaleCancelled).toHaveBeenCalledWith(event);
    expect(notificationService.notifySaleCancelled).toHaveBeenCalledTimes(1);
  });
});
