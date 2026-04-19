import { Test, TestingModule } from '@nestjs/testing';
import { UpdateStockHandler } from './update-stock.handler';
import { InventoryService } from '../../../inventory/inventory.service';
import { UpdateStockCommand } from '../update-stock.command';

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
    inventoryService = module.get(InventoryService);
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

    const mockMovement = {
      id: 'mov-123',
      productId: 'prod-123',
      quantity: 10,
      type: 'ENTRY',
      newStock: 50,
    };

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

    const mockMovement = { id: 'mov-456', productId: 'prod-456', quantity: 5, type: 'EXIT', newStock: 15 };
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

    const mockMovement = { id: 'mov-789', productId: 'prod-789', quantity: -3, type: 'ADJUSTMENT', newStock: 47 };
    inventoryService.createMovement.mockResolvedValue(mockMovement);

    // Act
    await handler.execute(command);

    // Assert
    expect(inventoryService.createMovement).toHaveBeenCalledWith(expectedDto);
  });
});
