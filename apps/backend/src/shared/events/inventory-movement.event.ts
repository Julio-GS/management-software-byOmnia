export class InventoryMovementEvent {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly type: 'IN' | 'OUT' | 'ADJUSTMENT',
    public readonly reason: string | null,
    public readonly newStockLevel: number,
  ) {}
}
