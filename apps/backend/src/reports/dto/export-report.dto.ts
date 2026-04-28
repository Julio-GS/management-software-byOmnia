import { IsString, IsIn, IsOptional, IsObject, MaxLength } from 'class-validator';

export class ExportReportDto {
  @IsString()
  @IsIn([
    'stock_actual',
    'proximos_vencer',
    'sin_movimiento',
    'promociones_vigentes',
    'ventas_diarias',
    'efectividad_promociones',
    // Casos especiales POS (usan datos directos, no vistas)
    'sales_receipt',
  ])
  reportType: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  titulo?: string;

  // Campo exclusivo para 'sales_receipt'
  @IsOptional()
  @IsString()
  ventaId?: string;
}
