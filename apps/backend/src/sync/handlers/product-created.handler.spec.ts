import { Test, TestingModule } from '@nestjs/testing';
import { ProductCreatedHandler } from './product-created.handler';
import { ProductCreatedEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

describe('ProductCreatedHandler', () => {
  let handler: ProductCreatedHandler;
  let notificationService: INotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCreatedHandler,
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            notifyProductCreated: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ProductCreatedHandler>(ProductCreatedHandler);
    notificationService = module.get<INotificationService>('NOTIFICATION_SERVICE');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call notificationService.notifyProductCreated when event is handled', async () => {
    const event = new ProductCreatedEvent(
      'product-123',
      'Product A',
      'SKU-001',
      '123456789',
      'category-1',
      100.50,
    );

    await handler.handle(event);

    expect(notificationService.notifyProductCreated).toHaveBeenCalledWith({
      id: event.id,
      name: event.name,
      sku: event.sku,
      barcode: event.barcode,
      categoryId: event.categoryId,
      basePrice: event.basePrice,
    });
    expect(notificationService.notifyProductCreated).toHaveBeenCalledTimes(1);
  });
});
