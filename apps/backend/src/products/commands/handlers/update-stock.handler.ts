import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateStockCommand } from '../update-stock.command';
import { InventoryService } from '../../../inventory/inventory.service';

/**
 * UpdateStockHandler
 * 
 * Handles UpdateStockCommand by delegating to InventoryService.
 * Creates inventory movement with specified type (ENTRY, EXIT, ADJUSTMENT).
 */
@CommandHandler(UpdateStockCommand)
export class UpdateStockHandler implements ICommandHandler<UpdateStockCommand> {
  constructor(private readonly inventoryService: InventoryService) {}

  async execute(command: UpdateStockCommand): Promise<any> {
    // Transform command to CreateMovementDto
    const createMovementDto = {
      productId: command.productId,
      quantity: command.quantity,
      type: command.type,
      reason: command.reason,
      reference: command.reference,
      notes: command.notes,
      userId: command.userId,
    };

    // Delegate to service
    return this.inventoryService.createMovement(createMovementDto);
  }
}
