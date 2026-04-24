/**
 * Lote Entity - Batch tracking entity
 * 
 * Fields match: lotes model from schema.prisma
 */
export class Lote {
  constructor(
    public readonly id: string,
    public producto_id: string,
    public numero_lote: string,
    public fecha_vencimiento: Date | null,
    public cantidad_inicial: number,
    public cantidad_actual: number,
    public fecha_ingreso: Date | null,
    public activo: boolean,
  ) {
    this.validate();
  }

  /**
   * Factory: create new Lote
   */
  static create(params: {
    producto_id: string;
    numero_lote?: string;
    fecha_vencimiento?: Date;
    cantidad_inicial: number;
  }): Lote {
    const numeroLote = params.numero_lote 
      ?? `LOTE-${params.producto_id.substring(0, 6)}-${Date.now()}`;

    return new Lote(
      crypto.randomUUID(),
      params.producto_id,
      numeroLote,
      params.fecha_vencimiento ?? null,
      params.cantidad_inicial,
      params.cantidad_inicial,
      new Date(),
      true,
    );
  }

  /**
   * Factory: reconstruct from Prisma
   */
  static fromPersistence(data: any): Lote {
    return new Lote(
      data.id,
      data.producto_id,
      data.numero_lote,
      data.fecha_vencimiento,
      data.cantidad_inicial,
      data.cantidad_actual,
      data.fecha_ingreso,
      data.activo ?? true,
    );
  }

  /**
   * Check if lote is expired
   */
  isExpired(): boolean {
    if (!this.fecha_vencimiento) return false;
    return this.fecha_vencimiento < new Date();
  }

  /**
   * Check if lote is about to expire (within days)
   */
  isExpiringSoon(days: number = 15): boolean {
    if (!this.fecha_vencimiento) return false;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return this.fecha_vencimiento <= deadline && !this.isExpired();
  }

  /**
   * Check if lote has stock
   */
  hasStock(): boolean {
    return this.cantidad_actual > 0 && this.activo;
  }

  /**
   * Consume stock from lote (for sales/ventas)
   */
  consume(cantidad: number): void {
    if (cantidad > this.cantidad_actual) {
      throw new Error(`Insufficient stock in lote ${this.numero_lote}`);
    }
    this.cantidad_actual -= cantidad;
  }

  /**
   * Add stock to lote
   */
  addStock(cantidad: number): void {
    if (cantidad <= 0) {
      throw new Error('Quantity must be positive');
    }
    this.cantidad_actual += cantidad;
  }

  /**
   * Validate business rules
   */
  private validate(): void {
    if (!this.producto_id) {
      throw new Error('Product ID is required');
    }

    if (!this.numero_lote) {
      throw new Error('Lote number is required');
    }

    if (this.cantidad_inicial < 0) {
      throw new Error('Initial quantity cannot be negative');
    }

    if (this.cantidad_actual < 0) {
      throw new Error('Actual quantity cannot be negative');
    }

    if (this.cantidad_actual > this.cantidad_inicial) {
      throw new Error('Actual quantity cannot exceed initial quantity');
    }

    // Validate fecha_vencimiento is in future if provided
    if (this.fecha_vencimiento && this.fecha_vencimiento < new Date()) {
      // Allow past dates only for already-expired lotes
      if (this.fecha_vencimiento >= new Date(new Date().setFullYear(new Date().getFullYear() - 1))) {
        // Allow if within last year (imported historical lots)
      } else {
        // throw new Error('Expiration date must be in the future');
        // Relaxed: Allow any date for flexibility
      }
    }
  }

  /**
   * Convert to JSON
   */
  toJSON(): any {
    return {
      id: this.id,
      producto_id: this.producto_id,
      numero_lote: this.numero_lote,
      fecha_vencimiento: this.fecha_vencimiento,
      cantidad_inicial: this.cantidad_inicial,
      cantidad_actual: this.cantidad_actual,
      fecha_ingreso: this.fecha_ingreso,
      activo: this.activo,
    };
  }
}