/**
 * UpdateStockCommand
 * 
 * Command for updating product stock via inventory movements.
 * Supports ENTRY, EXIT, and ADJUSTMENT types.
 */
export class UpdateStockCommand {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT',
    public readonly reason?: string,
    public readonly reference?: string,
    public readonly notes?: string,
    public readonly userId?: string,
  ) {}
}
