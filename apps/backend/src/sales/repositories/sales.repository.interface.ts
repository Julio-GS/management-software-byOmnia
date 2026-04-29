export interface ISalesRepository {
  // Control de transacciones
  executeTransaction<T>(fn: (tx: any) => Promise<T>, options?: any): Promise<T>;

  // Métodos para el flujo de creación (aceptan tx)
  findCajaById(id: string, tx?: any): Promise<any>;
  findProductosActivos(ids: string[], tx?: any): Promise<any[]>;
  getStockDisponible(productoId: string, tx?: any): Promise<number>;
  findLotesDisponibles(productoId: string, tx?: any): Promise<any[]>;
  getUltimaVentaCajaByPrefix(cajaId: string, prefix: string, tx?: any): Promise<any>;
  
  crearVenta(data: any, tx?: any): Promise<any>;
  crearDetallesVenta(data: any[], tx?: any): Promise<any>;
  crearMediosPago(data: any[], tx?: any): Promise<any>;
  crearMovimientosStock(data: any[], tx?: any): Promise<any>;
  getVentaCompleta(id: string, tx?: any): Promise<any>;

  // Consultas
  findAll(filters: any, skip: number, take: number): Promise<[any[], number]>;
  findOne(id: string): Promise<any>;
  findByNumeroTicket(numeroTicket: string): Promise<any>;
  findByCajaHoy(cajaId: string, hoy: Date, manana: Date): Promise<any[]>;
  
  // Modificación
  anularVenta(id: string, motivo: string): Promise<any>;
}
