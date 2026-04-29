import { Prisma } from '@prisma/client';

/**
 * Devolucion entity (Domain model wrapper for Prisma)
 * Represents a product return/refund from a sale
 */
export type DevolucionWithRelations = Prisma.devolucionesGetPayload<{
  include: {
    productos: true;
    ventas: true;
    lotes: true;
    usuarios: true;
  };
}>;

export type DevolucionBasic = Prisma.devolucionesGetPayload<{}>;

/**
 * Devolucion entity class
 */
export class Devolucion {
  id: string;
  venta_id: string;
  producto_id: string;
  lote_id: string | null;
  cantidad: number;
  monto_devuelto: number;
  tipo_devolucion: string;
  medio_devolucion: string | null;
  usuario_id: string | null;
  motivo: string | null;
  observaciones: string | null;
  fecha: Date | null;

  // Relations
  productos?: any;
  ventas?: any;
  lotes?: any;
  usuarios?: any;

  constructor(data: DevolucionBasic) {
    this.id = data.id;
    this.venta_id = data.venta_id;
    this.producto_id = data.producto_id;
    this.lote_id = data.lote_id;
    this.cantidad = Number(data.cantidad);
    this.monto_devuelto = Number(data.monto_devuelto);
    this.tipo_devolucion = data.tipo_devolucion;
    this.medio_devolucion = data.medio_devolucion;
    this.usuario_id = data.usuario_id;
    this.motivo = data.motivo;
    this.observaciones = data.observaciones;
    this.fecha = data.fecha;
  }

  /**
   * Create Devolucion entity from Prisma persistence model
   */
  static fromPersistence(data: DevolucionWithRelations | DevolucionBasic): Devolucion {
    const devolucion = new Devolucion(data);
    
    if ('productos' in data && data.productos) {
      devolucion.productos = data.productos;
    }
    if ('ventas' in data && data.ventas) {
      devolucion.ventas = data.ventas;
    }
    if ('lotes' in data && data.lotes) {
      devolucion.lotes = data.lotes;
    }
    if ('usuarios' in data && data.usuarios) {
      devolucion.usuarios = data.usuarios;
    }

    return devolucion;
  }

  /**
   * Convert to plain JSON object
   */
  toJSON() {
    return {
      id: this.id,
      venta_id: this.venta_id,
      producto_id: this.producto_id,
      lote_id: this.lote_id,
      cantidad: this.cantidad,
      monto_devuelto: this.monto_devuelto,
      tipo_devolucion: this.tipo_devolucion,
      medio_devolucion: this.medio_devolucion,
      usuario_id: this.usuario_id,
      motivo: this.motivo,
      observaciones: this.observaciones,
      fecha: this.fecha,
      productos: this.productos,
      ventas: this.ventas,
      lotes: this.lotes,
      usuarios: this.usuarios,
    };
  }
}
