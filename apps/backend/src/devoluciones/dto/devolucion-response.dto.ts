/**
 * Response DTO for devolucion operations
 * Returns devolucion with related producto information
 */
export class DevolucionResponseDto {
  devolucion: {
    id: string;
    venta_id: string;
    producto_id: string;
    lote_id: string | null;
    cantidad: number;
    monto_devuelto: number;
    tipo_devolucion: string;
    medio_devolucion: string;
    motivo: string;
    observaciones?: string | null;
    fecha: Date;
    usuario_id?: string | null;
  };
  producto: {
    codigo: string;
    detalle: string;
  };
  venta?: {
    numero_ticket: string;
  };
  lote?: {
    numero_lote: string;
  } | null;
}
