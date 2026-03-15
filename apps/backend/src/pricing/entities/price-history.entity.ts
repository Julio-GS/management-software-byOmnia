/**
 * PriceHistory Domain Entity
 * 
 * Represents a historical record of price changes in the Omnia Management System.
 * Provides an audit trail for pricing decisions and changes.
 */
export class PriceHistory {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly oldPrice: number,
    public readonly newPrice: number,
    public readonly changeType: 'manual' | 'markup_change' | 'cost_change' | 'bulk_update',
    public readonly changedBy: string | null,
    public readonly reason: string | null,
    public readonly timestamp: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new PriceHistory record.
   */
  static create(params: {
    productId: string;
    oldPrice: number;
    newPrice: number;
    changeType: 'manual' | 'markup_change' | 'cost_change' | 'bulk_update';
    changedBy?: string;
    reason?: string;
  }): PriceHistory {
    return new PriceHistory(
      crypto.randomUUID(),
      params.productId,
      params.oldPrice,
      params.newPrice,
      params.changeType,
      params.changedBy ?? null,
      params.reason ?? null,
      new Date(),
    );
  }

  /**
   * Factory method to reconstruct PriceHistory from persistence (Prisma).
   */
  static fromPersistence(data: {
    id: string;
    productId: string;
    oldPrice: number | { toNumber: () => number };
    newPrice: number | { toNumber: () => number };
    changeType: string;
    changedBy: string | null;
    reason: string | null;
    timestamp: Date;
  }): PriceHistory {
    return new PriceHistory(
      data.id,
      data.productId,
      // Convert Prisma Decimal to number
      typeof data.oldPrice === 'object' ? Number(data.oldPrice) : data.oldPrice,
      typeof data.newPrice === 'object' ? Number(data.newPrice) : data.newPrice,
      data.changeType as 'manual' | 'markup_change' | 'cost_change' | 'bulk_update',
      data.changedBy,
      data.reason,
      data.timestamp,
    );
  }

  /**
   * Calculate the price change amount.
   */
  getPriceChange(): number {
    return this.newPrice - this.oldPrice;
  }

  /**
   * Calculate the price change percentage.
   */
  getPriceChangePercentage(): number {
    if (this.oldPrice === 0) return 0;
    return ((this.newPrice - this.oldPrice) / this.oldPrice) * 100;
  }

  /**
   * Check if price increased.
   */
  isPriceIncrease(): boolean {
    return this.newPrice > this.oldPrice;
  }

  /**
   * Check if price decreased.
   */
  isPriceDecrease(): boolean {
    return this.newPrice < this.oldPrice;
  }

  /**
   * Validate business rules.
   */
  private validate(): void {
    if (!this.productId || this.productId.trim().length === 0) {
      throw new Error('Product ID is required for price history');
    }

    if (this.oldPrice < 0) {
      throw new Error('Old price cannot be negative');
    }

    if (this.newPrice < 0) {
      throw new Error('New price cannot be negative');
    }

    const validChangeTypes = ['manual', 'markup_change', 'cost_change', 'bulk_update'];
    if (!validChangeTypes.includes(this.changeType)) {
      throw new Error(`Invalid change type: ${this.changeType}`);
    }
  }

  /**
   * Convert to plain object for API responses.
   */
  toJSON(): {
    id: string;
    productId: string;
    oldPrice: number;
    newPrice: number;
    changeType: string;
    changedBy: string | null;
    reason: string | null;
    timestamp: Date;
    priceChange: number;
    priceChangePercentage: number;
  } {
    return {
      id: this.id,
      productId: this.productId,
      oldPrice: this.oldPrice,
      newPrice: this.newPrice,
      changeType: this.changeType,
      changedBy: this.changedBy,
      reason: this.reason,
      timestamp: this.timestamp,
      priceChange: this.getPriceChange(),
      priceChangePercentage: this.getPriceChangePercentage(),
    };
  }
}
