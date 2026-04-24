import { IsOptional, IsInt, Min, Max, IsUUID, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for filtering devoluciones with pagination
 */
export class FilterDevolucionesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  venta_id?: string;

  @IsOptional()
  @IsUUID()
  producto_id?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  tipo_devolucion?: string;
}
