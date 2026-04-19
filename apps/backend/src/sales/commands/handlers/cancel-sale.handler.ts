import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelSaleCommand } from '../cancel-sale.command';
import { SalesService } from '../../sales.service';

/**
 * CancelSaleHandler
 * 
 * Handles CancelSaleCommand by delegating to SalesService.
 * Note: Current SalesService.cancel() signature is (id, userId).
 * Reason is not yet supported by the service but is part of the command for future extension.
 */
@CommandHandler(CancelSaleCommand)
export class CancelSaleHandler implements ICommandHandler<CancelSaleCommand> {
  constructor(private readonly salesService: SalesService) {}

  async execute(command: CancelSaleCommand): Promise<any> {
    // Delegate to service
    // TODO: Pass command.reason once SalesService.cancel() supports it
    return this.salesService.cancel(command.saleId, command.userId);
  }
}
