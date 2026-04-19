import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateSaleCommand } from '../create-sale.command';
import { SalesService } from '../../sales.service';

/**
 * CreateSaleHandler
 * 
 * Handles CreateSaleCommand by delegating to SalesService.
 * Thin wrapper — no business logic, just command-to-DTO transformation.
 */
@CommandHandler(CreateSaleCommand)
export class CreateSaleHandler implements ICommandHandler<CreateSaleCommand> {
  constructor(private readonly salesService: SalesService) {}

  async execute(command: CreateSaleCommand): Promise<any> {
    // Transform command to DTO (1-to-1 mapping)
    const createSaleDto = {
      items: command.items,
      paymentMethod: command.paymentMethod,
      discountAmount: command.discountAmount,
      customerId: command.customerId,
      customerName: command.customerName,
      customerEmail: command.customerEmail,
      notes: command.notes,
      cashierId: command.cashierId,
      deviceId: command.deviceId,
    };

    // Delegate to service
    return this.salesService.create(createSaleDto);
  }
}
