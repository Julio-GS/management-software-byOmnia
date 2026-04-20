/**
 * Base class for Domain Events
 * 
 * Domain events represent something that happened within the domain
 * (e.g., "ProductCreated", "SaleProcessed", "StockAdjusted").
 * 
 * They are used for in-process communication between modules.
 */
export abstract class DomainEvent {
  public readonly occurredAt: Date;

  constructor() {
    this.occurredAt = new Date();
  }

  /**
   * Event name (used for logging and debugging)
   */
  abstract get eventName(): string;
}
