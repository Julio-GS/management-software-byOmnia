import { Test, TestingModule } from '@nestjs/testing';
import { InventoryMovementHandler } from './inventory-movement.handler';
import { InventoryMovementEvent } from '../../shared/events';
import { INotificationService } from '../../shared/interfaces/notification.service.interface';

describe('InventoryMovementHandler', () => {
  let handler: InventoryMovementHandler;
  let notificationService: INotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryMovementHandler,
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            notifyInventoryMovement: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<InventoryMovementHandler>(InventoryMovementHandler);
    notificationService = module.get<INotificationService>('NOTIFICATION_SERVICE');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call notificationService.notifyInventoryMovement when event is handled', async () => {
    const event = new InventoryMovementEvent(
      'product-123',
      10,
      'IN',
      'purchase',
      100,
    );

    await handler.handle(event);

    expect(notificationService.notifyInventoryMovement).toHaveBeenCalledWith({
      productId: event.productId,
      quantity: event.quantity,
      type: event.type,
      reason: event.reason,
      newStockLevel: event.newStockLevel,
    });
    expect(notificationService.notifyInventoryMovement).toHaveBeenCalledTimes(1);
  });
});
