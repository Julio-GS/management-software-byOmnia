import { Test, TestingModule } from '@nestjs/testing';
import { PricingRecalculatedHandler } from './pricing-recalculated.handler';
import { PricingRecalculatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

describe('PricingRecalculatedHandler', () => {
  let handler: PricingRecalculatedHandler;
  let notificationService: INotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingRecalculatedHandler,
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            notifyPricingRecalculated: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<PricingRecalculatedHandler>(PricingRecalculatedHandler);
    notificationService = module.get<INotificationService>('NOTIFICATION_SERVICE');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call notificationService.notifyPricingRecalculated when event is handled', async () => {
    const event = new PricingRecalculatedEvent(
      'product-123',
      100,
      0.3,
      130,
      new Date('2026-04-16'),
    );

    await handler.handle(event);

    expect(notificationService.notifyPricingRecalculated).toHaveBeenCalledWith({
      type: 'product',
      count: 1,
      id: event.productId,
    });
    expect(notificationService.notifyPricingRecalculated).toHaveBeenCalledTimes(1);
  });
});
