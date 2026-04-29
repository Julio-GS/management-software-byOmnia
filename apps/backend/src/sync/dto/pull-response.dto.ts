export class PullResponseDto {
  timestamp: Date; // Server timestamp 
  
  // Tablas del core que necesitan bajar al Electron
  productos: any[];
  lotes: any[];
  promociones: any[];
  rubros: any[];
  categorias: any[];
  unidades_medida: any[];
  proveedores: any[];
  
  // El snapshot de stock actual para corregir desviaciones en SQLite
  stock_snapshot: any[]; 
}
