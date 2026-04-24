import { IsUUID, IsNumber, IsIn, IsString, MinLength, IsOptional, Min } from 'class-validator';

/**
 * DTO for creating a devolucion (refund/return)
 * Business rule: Product returns to the SAME lote it came from
 */
export class CreateDevolucionDto {
  @IsUUID()
  venta_id: string;

  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string;

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsIn(['efectivo', 'transferencia', 'nota_credito'])
  tipo_devolucion: string;

  @IsIn(['efectivo', 'transferencia', 'nota_credito'])
  medio_devolucion: string;

  @IsString()
  @MinLength(5)
  motivo: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
