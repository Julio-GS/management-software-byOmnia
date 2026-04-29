/**
 * Promocion Entity
 * 
 * Represents a promotion in the Omnia Management System.
 */
export class PromocionEntity {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly descripcion: string | null,
    public readonly tipo: string,
    public readonly valor_descuento: number | null,
    public readonly cantidad_requerida: number | null,
    public readonly cantidad_bonificada: number | null,
    public readonly precio_especial: number | null,
    public readonly fecha_inicio: Date,
    public readonly fecha_fin: Date,
    public readonly dias_semana: number[],
    public readonly hora_inicio: string | null,
    public readonly hora_fin: string | null,
    public readonly cantidad_maxima_cliente: number | null,
    public readonly acumulable: boolean,
    public readonly activo: boolean,
    public readonly prioridad: number,
    public readonly created_at: Date | null,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.nombre || this.nombre.trim().length === 0) {
      throw new Error('Nombre es requerido');
    }

    const validTypes = ['descuento_porcentaje', 'descuento_monto', 'cantidad_por_cantidad', 'precio_especial'];
    if (!validTypes.includes(this.tipo)) {
      throw new Error(`Tipo de promoción inválido: ${this.tipo}`);
    }

    if (this.fecha_inicio > this.fecha_fin) {
      throw new Error('Fecha de inicio debe ser anterior a fecha de fin');
    }

    if (this.hora_inicio && this.hora_fin && this.hora_inicio >= this.hora_fin) {
      throw new Error('Hora de inicio debe ser anterior a hora de fin');
    }
  }

  /**
   * Check if promotion is currently active
   */
  isActiva(): boolean {
    const now = new Date();
    const fechaInicio = new Date(this.fecha_inicio);
    const fechaFin = new Date(this.fecha_inicio);
    
    return (
      this.activo &&
      now >= fechaInicio &&
      now <= fechaFin
    );
  }

  /**
   * Check if promotion is valid for a specific day of week
   */
  isValidForDia(diaSemana: number): boolean {
    if (!this.dias_semana || this.dias_semana.length === 0) {
      return true; // Valid for all days
    }
    return this.dias_semana.includes(diaSemana);
  }

  /**
   * Check if promotion is valid for a specific time
   */
  isValidForHora(hora: string): boolean {
    if (!this.hora_inicio || !this.hora_fin) {
      return true; // Valid for all hours
    }
    return hora >= this.hora_inicio && hora <= this.hora_fin;
  }

  /**
   * Check if this is a cart-level discount (applies to total) vs item-level
   */
  esDescuentoDeCarrito(): boolean {
    return this.tipo === 'descuento_monto';
  }

  /**
   * Get discount amount for a price and quantity
   */
  calcularDescuento(precioUnitario: number, cantidad: number): number {
    switch (this.tipo) {
      case 'descuento_porcentaje':
        return precioUnitario * cantidad * ((this.valor_descuento || 0) / 100);
      
      case 'descuento_monto':
        // Cart-level discount: fixed amount for entire cart, not per item
        return this.valor_descuento || 0;
      
      case 'cantidad_por_cantidad':
        if (!this.cantidad_requerida || !this.cantidad_bonificada) return 0;
        const grupos = Math.floor(cantidad / this.cantidad_requerida);
        return grupos * this.cantidad_bonificada * precioUnitario;
      
      case 'precio_especial':
        if (!this.precio_especial) return 0;
        return (precioUnitario - this.precio_especial) * cantidad;
      
      default:
        return 0;
    }
  }

  static fromPersistence(data: any): PromocionEntity {
    return new PromocionEntity(
      data.id,
      data.nombre,
      data.descripcion,
      data.tipo,
      data.valor_descuento ? Number(data.valor_descuento) : null,
      data.cantidad_requerida,
      data.cantidad_bonificada,
      data.precio_especial ? Number(data.precio_especial) : null,
      data.fecha_inicio,
      data.fecha_fin,
      data.dias_semana || [],
      data.hora_inicio ? String(data.hora_inicio).slice(0, 5) : null,
      data.hora_fin ? String(data.hora_fin).slice(0, 5) : null,
      data.cantidad_maxima_cliente,
      data.acumulable ?? false,
      data.activo ?? true,
      data.prioridad ?? 0,
      data.created_at,
    );
  }
}