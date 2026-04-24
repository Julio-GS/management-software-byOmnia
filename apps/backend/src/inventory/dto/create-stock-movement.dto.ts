import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * MovementType - Spanish enum values
 */
export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AJUSTE_POSITIVO = 'ajuste_positivo',
  AJUSTE_NEGATIVO = 'ajuste_negativo',
  VENTA = 'venta',
  DEVOLUCION = 'devolucion',
  MERMA = 'merma',
  VENCIMIENTO = 'vencimiento',
}

/**
 * CreateStockMovementDto - Create inventory movement
 * 
 * Fields match: movimientos_stock model from schema
 */
export class CreateStockMovementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  producto_id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  lote_id?: string;

  @ApiProperty({ enum: TipoMovimiento })
  @IsEnum(TipoMovimiento)
  tipo_movimiento: TipoMovimiento;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  cantidad: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  usuario_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observaciones?: string;
}

/**
 * AjusteStockDto - Stock adjustment
 */
export class AjusteStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  producto_id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  lote_id?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  cantidad_fisica: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

/**
 * FilterMovimientosDto
 */
export class FilterMovimientosDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  producto_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  lote_id?: string;

  @ApiPropertyOptional({ enum: TipoMovimiento })
  @IsEnum(TipoMovimiento)
  @IsOptional()
  tipo_movimiento?: TipoMovimiento;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fecha_desde?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fecha_hasta?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}