import { Test, TestingModule } from '@nestjs/testing';
import { SaleCreatedHandler } from './sale-created.handler';
import { SaleCreatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

describe('SaleCreatedHandler', () => {
  let handler: SaleCreatedHandler;
  let notificationService: INotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleCreatedHandler,
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            notifySaleCreated: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<SaleCreatedHandler>(SaleCreatedHandler);
    notificationService = module.get<INotificationService>('NOTIFICATION_SERVICE');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call notificationService.notifySaleCreated when event is handled', async () => {
    const event = new SaleCreatedEvent(
      'sale-123',
      'SALE-001',
      100.50,
      [
        { productId: 'product-1', quantity: 2, price: 50.25, subtotal: 100.50 },
      ],
      'CASH',
      new Date('2026-04-16'),
      'user-123',
      'correlation-123',
    );

    await handler.handle(event);

    expect(notificationService.notifySaleCreated).toHaveBeenCalledWith(event);
    expect(notificationService.notifySaleCreated).toHaveBeenCalledTimes(1);
  });
});
