/**
 * SaleCancelledEvent
 * 
 * Domain event emitted when a sale is cancelled.
 * Includes metadata for event tracing and auditing.
 */
export class SaleCancelledEvent {
  constructor(
    public readonly saleId: string,
    public readonly reason: string,
    public readonly timestamp: Date,
    public readonly userId?: string,
    public readonly correlationId: string = crypto.randomUUID(),
  ) {}
}
