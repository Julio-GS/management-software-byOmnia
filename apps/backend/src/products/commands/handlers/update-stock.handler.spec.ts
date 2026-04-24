import { Test, TestingModule } from '@nestjs/testing';
import { UpdateStockHandler } from './update-stock.handler';
import { InventoryService } from '../../../inventory/inventory.service';
import { UpdateStockCommand } from '../update-stock.command';
import { createMockStockMovement } from '../../../shared/test-utils';

describe('UpdateStockHandler', () => {
  let handler: UpdateStockHandler;
  let inventoryService: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const mockInventoryService = {
      createMovement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateStockHandler,
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    handler = module.get<UpdateStockHandler>(UpdateStockHandler);
    inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call inventoryService.createMovement with correct DTO when executing ENTRY command', async () => {
    // Arrange
    const command = new UpdateStockCommand('prod-123', 10, 'ENTRY', 'Restocking');

    const expectedDto = {
      productId: 'prod-123',
      quantity: 10,
      type: 'ENTRY',
      reason: 'Restocking',
    };

    const mockMovement = createMockStockMovement({
      id: 'mov-123',
      producto_id: 'prod-123',
      cantidad: 10,
      tipo_movimiento: 'ENTRADA', // Valid Spanish type
    });

    inventoryService.createMovement.mockResolvedValue(mockMovement);

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(inventoryService.createMovement).toHaveBeenCalledWith(expectedDto);
    expect(inventoryService.createMovement).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockMovement);
  });

  it('should call inventoryService.createMovement with EXIT type', async () => {
    // Arrange
    const command = new UpdateStockCommand('prod-456', 5, 'EXIT', 'Sale adjustment');

    const expectedDto = {
      productId: 'prod-456',
      quantity: 5,
      type: 'EXIT',
      reason: 'Sale adjustment',
    };

    const mockMovement = createMockStockMovement({
      id: 'mov-456',
      producto_id: 'prod-456',
      cantidad: 5,
      tipo_movimiento: 'SALIDA', // Valid Spanish type
    });
    inventoryService.createMovement.mockResolvedValue(mockMovement);

    // Act
    await handler.execute(command);

    // Assert
    expect(inventoryService.createMovement).toHaveBeenCalledWith(expectedDto);
  });

  it('should handle ADJUSTMENT type correctly', async () => {
    // Arrange
    const command = new UpdateStockCommand('prod-789', -3, 'ADJUSTMENT', 'Stock correction');

    const expectedDto = {
      productId: 'prod-789',
      quantity: -3,
      type: 'ADJUSTMENT',
      reason: 'Stock correction',
    };

    const mockMovement = createMockStockMovement({
      id: 'mov-789',
      producto_id: 'prod-789',
      cantidad: -3,
      tipo_movimiento: 'AJUSTE', // Valid Spanish type
    });
    inventoryService.createMovement.mockResolvedValue(mockMovement);

    // Act
    await handler.execute(command);

    // Assert
    expect(inventoryService.createMovement).toHaveBeenCalledWith(expectedDto);
  });
});
