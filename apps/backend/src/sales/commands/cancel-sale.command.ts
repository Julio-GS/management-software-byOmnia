/**
 * CancelSaleCommand
 * 
 * Command for canceling a sale.
 * Includes saleId, userId, and optional reason.
 */
export class CancelSaleCommand {
  constructor(
    public readonly saleId: string,
    public readonly userId: string,
    public readonly reason?: string,
  ) {}
}
