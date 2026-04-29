/**
 * Sale Domain Entity
 * 
 * Represents a sale transaction in the Omnia Management System.
 * Encapsulates business rules and validation logic.
 */
export class Sale {
  constructor(
    public readonly id: string,
    public readonly numero_ticket: string,
    public readonly detalle_ventas: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      productName: string;
    }>,
    public total: number,
    public readonly paymentMethod: string,
    public status: 'PENDING' | 'COMPLETED' | 'CANCELLED',
    public readonly createdAt: Date,
    public cancelledAt?: Date,
    skipValidation = false,
  ) {
    if (!skipValidation) {
      this.validate();
    }
  }

  /**
   * Calculate total from items.
   * Updates the total property.
   */
  calculateTotal(): number {
    this.total = this.detalle_ventas.reduce((sum, item) => sum + item.subtotal, 0);
    return this.total;
  }

  /**
   * Cancel the sale.
   * Only completed sales can be cancelled.
   */
  cancel(): void {
    if (this.status === 'CANCELLED') {
      throw new Error('Sale is already cancelled');
    }

    if (this.status !== 'COMPLETED') {
      throw new Error('Only completed sales can be cancelled');
    }

    this.status = 'CANCELLED';
    this.cancelledAt = new Date();
  }

  /**
   * Validate business rules.
   */
  validate(): void {
    if (!this.numero_ticket || this.numero_ticket.trim().length === 0) {
      throw new Error('Sale number is required');
    }

    if (this.detalle_ventas.length === 0) {
      throw new Error('Sale must have at least one item');
    }

    if (this.total < 0) {
      throw new Error('Sale total must be non-negative');
    }
  }

  /**
   * Factory method to reconstruct Sale from persistence.
   */
  static fromPersistence(data: any): Sale {
    return new Sale(
      data.id,
      data.numero_ticket,
      data.detalle_ventas || [],
      typeof data.total === 'object' ? Number(data.total) : data.total,
      data.paymentMethod,
      data.status,
      data.createdAt,
      data.cancelledAt,
    );
  }

  /**
   * Convert to plain object for API responses.
   */
  toJSON(): any {
    return {
      id: this.id,
      numero_ticket: this.numero_ticket,
      detalle_ventas: this.detalle_ventas,
      total: this.total,
      paymentMethod: this.paymentMethod,
      status: this.status,
      createdAt: this.createdAt,
      cancelledAt: this.cancelledAt,
    };
  }
}
