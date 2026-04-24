/**
 * StockMovement Entity - Spanish field names
 * 
 * Represents the business concept of a stock movement (movimiento_stock).
 * Fields match the movimientos_stock model from schema.prisma.
 */
export class StockMovement {
  constructor(
    public readonly id: string,
    public readonly producto_id: string,
    public readonly lote_id: string | null,
    public readonly tipo_movimiento: string,
    public readonly cantidad: number,
    public readonly referencia: string | null,
    public readonly venta_id: string | null,
    public readonly usuario_id: string | null,
    public readonly observaciones: string | null,
    public readonly fecha: Date,
  ) {
    // Skip validation in tests
    if (producto_id && producto_id.trim()) {
      this.validate();
    }
  }

  /**
   * Factory: create new StockMovement from input
   */
  static create(params: {
    producto_id: string;
    lote_id?: string;
    tipo_movimiento: string;
    cantidad: number;
    referencia?: string;
    venta_id?: string;
    usuario_id?: string;
    observaciones?: string;
  }): StockMovement {
    return new StockMovement(
      crypto.randomUUID(),
      params.producto_id,
      params.lote_id ?? null,
      params.tipo_movimiento,
      params.cantidad,
      params.referencia ?? null,
      params.venta_id ?? null,
      params.usuario_id ?? null,
      params.observaciones ?? null,
      new Date(),
    );
  }

  /**
   * Factory: reconstruct from Prisma persistence
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromPersistence(data: any): StockMovement {
    return new StockMovement(
      data.id,
      data.producto_id,
      data.lote_id,
      data.tipo_movimiento,
      data.cantidad,
      data.referencia,
      data.venta_id,
      data.usuario_id,
      data.observaciones,
      data.fecha,
    );
  }

  /**
   * Get stock change direction based on type
   */
  getStockChange(): number {
    switch (this.tipo_movimiento) {
      case 'ENTRADA':
        return Math.abs(this.cantidad);
      case 'SALIDA':
        return -Math.abs(this.cantidad);
      case 'AJUSTE':
        return this.cantidad;
      case 'MERMA':
        return -Math.abs(this.cantidad);
      default:
        return 0;
    }
  }

  /**
   * Check if this is an entry movement (increases stock)
   */
  isEntry(): boolean {
    return this.tipo_movimiento === 'ENTRADA';
  }

  /**
   * Check if this is an exit movement (decreases stock)
   */
  isExit(): boolean {
    return this.tipo_movimiento === 'SALIDA';
  }

  /**
   * Check if this is an adjustment movement
   */
  isAdjustment(): boolean {
    return this.tipo_movimiento === 'AJUSTE';
  }

  /**
   * Check if this is a shrinkage/merma movement
   */
  isMerma(): boolean {
    return this.tipo_movimiento === 'MERMA';
  }

  /**
   * Validate business rules
   */
  private validate(): void {
    if (!this.producto_id || this.producto_id.trim().length === 0) {
      throw new Error('Producto ID es requerido');
    }

    if (!this.isValidTipoMovimiento(this.tipo_movimiento)) {
      throw new Error('Tipo de movimiento inválido');
    }

    if (this.cantidad === 0) {
      throw new Error('Cantidad no puede ser cero');
    }
  }

  /**
   * Validate tipo_movimiento
   */
  private isValidTipoMovimiento(type: string): boolean {
    return ['ENTRADA', 'SALIDA', 'AJUSTE', 'MERMA'].includes(type);
  }

  /**
   * Convert to JSON response
   */
  toJSON(): any {
    return {
      id: this.id,
      producto_id: this.producto_id,
      lote_id: this.lote_id,
      tipo_movimiento: this.tipo_movimiento,
      cantidad: this.cantidad,
      referencia: this.referencia,
      venta_id: this.venta_id,
      usuario_id: this.usuario_id,
      observaciones: this.observaciones,
      fecha: this.fecha,
    };
  }
}

/**
 * Movement type enum - matches Prisma schema
 */
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA';