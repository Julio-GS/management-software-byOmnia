export class StockConflictDto {
  producto_id: string;
  lote_id?: string;
  solicitado: number;
  disponible: number;
  mensaje: string;
}

export class BatchPushResultDto {
  processed: number;
  failed: number;
  errors: Array<{
    transaccion_id: string;
    error: string;
  }>;
  stock_conflicts: StockConflictDto[]; // Alertas para el encargado (Opción A)
}
