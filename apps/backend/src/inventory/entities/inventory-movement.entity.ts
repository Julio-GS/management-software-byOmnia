/**
 * InventoryMovement Domain Entity
 * 
 * Represents the core business concept of an Inventory Movement in the Omnia Management System.
 * Encapsulates business rules and validation logic for stock movements.
 */
export class InventoryMovement {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly type: MovementType,
    public readonly quantity: number,
    public readonly previousStock: number,
    public readonly newStock: number,
    public readonly reason: string | null,
    public readonly reference: string | null,
    public readonly notes: string | null,
    public readonly userId: string | null,
    public readonly deviceId: string | null,
    public readonly createdAt: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new InventoryMovement from user input.
   */
  static create(params: {
    productId: string;
    type: MovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    reference?: string;
    notes?: string;
    userId?: string;
    deviceId?: string;
  }): InventoryMovement {
    return new InventoryMovement(
      crypto.randomUUID(),
      params.productId,
      params.type,
      params.quantity,
      params.previousStock,
      params.newStock,
      params.reason ?? null,
      params.reference ?? null,
      params.notes ?? null,
      params.userId ?? null,
      params.deviceId ?? null,
      new Date(),
    );
  }

  /**
   * Factory method to reconstruct an InventoryMovement from persistence (Prisma).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromPersistence(data: any): InventoryMovement {
    return new InventoryMovement(
      data.id,
      data.productId,
      data.type,
      data.quantity,
      data.previousStock,
      data.newStock,
      data.reason,
      data.reference,
      data.notes,
      data.userId,
      data.deviceId,
      data.createdAt,
    );
  }

  /**
   * Calculate stock movement based on type.
   * Returns the change in stock (positive for ENTRY, negative for EXIT).
   */
  getStockChange(): number {
    switch (this.type) {
      case 'ENTRY':
        return Math.abs(this.quantity);
      case 'EXIT':
        return -Math.abs(this.quantity);
      case 'ADJUSTMENT':
        return this.quantity; // Can be positive or negative
      default:
        return 0;
    }
  }

  /**
   * Check if movement increases stock.
   */
  isStockIncrease(): boolean {
    return this.newStock > this.previousStock;
  }

  /**
   * Check if movement decreases stock.
   */
  isStockDecrease(): boolean {
    return this.newStock < this.previousStock;
  }

  /**
   * Check if this movement resulted in negative stock.
   */
  hasNegativeStock(): boolean {
    return this.newStock < 0;
  }

  /**
   * Get the magnitude of the stock change.
   */
  getStockChangeMagnitude(): number {
    return Math.abs(this.newStock - this.previousStock);
  }

  /**
   * Validate all business rules.
   */
  private validate(): void {
    if (!this.productId || this.productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    if (!this.type || !this.isValidMovementType(this.type)) {
      throw new Error('Invalid movement type');
    }

    if (this.quantity === 0) {
      throw new Error('Quantity cannot be zero');
    }

    // For ENTRY and EXIT, quantity should be positive (direction is determined by type)
    if ((this.type === 'ENTRY' || this.type === 'EXIT') && this.quantity < 0) {
      throw new Error(`Quantity for ${this.type} must be positive`);
    }

    // Validate stock calculations
    const expectedNewStock = this.previousStock + this.getStockChange();
    if (this.newStock !== expectedNewStock) {
      throw new Error(
        `Stock calculation error: expected ${expectedNewStock}, got ${this.newStock}`,
      );
    }
  }

  /**
   * Validate movement type.
   */
  private isValidMovementType(type: string): boolean {
    return ['ENTRY', 'EXIT', 'ADJUSTMENT'].includes(type);
  }

  /**
   * Convert to plain object for API responses.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON(): any {
    return {
      id: this.id,
      productId: this.productId,
      type: this.type,
      quantity: this.quantity,
      previousStock: this.previousStock,
      newStock: this.newStock,
      reason: this.reason,
      reference: this.reference,
      notes: this.notes,
      userId: this.userId,
      deviceId: this.deviceId,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Movement type enum (matching Prisma schema).
 */
export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
