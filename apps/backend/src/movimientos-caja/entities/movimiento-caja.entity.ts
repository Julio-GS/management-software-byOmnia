export class MovimientoCaja {
  id: string;
  tipo: string;
  monto: number;
  concepto: string;
  comprobante?: string | null;
  usuario_id: string;
  observaciones?: string | null;
  fecha: Date;

  // Relación
  usuarios?: {
    username: string;
  };
}
