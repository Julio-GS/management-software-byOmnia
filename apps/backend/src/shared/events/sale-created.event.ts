/**
 * SaleCreatedEvent
 * 
 * Domain event emitted when a new sale is created.
 * Includes metadata for event tracing and auditing.
 */
export class SaleCreatedEvent {
  constructor(
    public readonly saleId: string,
    public readonly saleNumber: string,
    public readonly totalAmount: number,
    public readonly items: Array<{
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>,
    public readonly paymentMethod: string,
    public readonly timestamp: Date,
    public readonly userId?: string,
    public readonly correlationId: string = crypto.randomUUID(),
  ) {}
}
