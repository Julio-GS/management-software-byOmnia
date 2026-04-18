import { Test, TestingModule } from '@nestjs/testing';
import { ProductUpdatedHandler } from './product-updated.handler';
import { ProductUpdatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

describe('ProductUpdatedHandler', () => {
  let handler: ProductUpdatedHandler;
  let notificationService: INotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductUpdatedHandler,
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            notifyProductUpdated: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ProductUpdatedHandler>(ProductUpdatedHandler);
    notificationService = module.get<INotificationService>('NOTIFICATION_SERVICE');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call notificationService.notifyProductUpdated when event is handled', async () => {
    const event = new ProductUpdatedEvent(
      'product-123',
      { name: 'Updated Product', basePrice: 200 },
    );

    await handler.handle(event);

    expect(notificationService.notifyProductUpdated).toHaveBeenCalledWith({
      id: event.id,
      ...event.changes,
    });
    expect(notificationService.notifyProductUpdated).toHaveBeenCalledTimes(1);
  });
});
