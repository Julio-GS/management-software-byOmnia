import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max, IsUUID, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * CreateProductDto - Spanish field names matching Prisma schema
 * 
 * Fields match: productos model from schema.prisma
 * - codigo (required, unique)
 * - detalle
 * - proveedor_id, rubro_id, unidad_medida_id
 * - es_codigo_especial, requiere_precio_manual, maneja_lotes
 * - costo, iva, precio_venta
 * - stock_minimo, maneja_stock
 */
export class CreateProductDto {
  @ApiProperty({ example: 'COCA-2.25L' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiPropertyOptional({ example: 'Coca Cola 2.25 litros' })
  @IsString()
  @IsOptional()
  codigo_alternativo?: string;

  @ApiPropertyOptional({ example: '7790895001567' })
  @IsString()
  @IsOptional()
  codigo_barras?: string;

  @ApiProperty({ example: 'Coca Cola 2.25L' })
  @IsString()
  @IsNotEmpty()
  detalle: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  proveedor_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  rubro_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  unidad_medida_id?: string;

  @ApiPropertyOptional({ example: 2.25 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  contenido?: number;

  @ApiPropertyOptional({ description: 'F/V/P/C code - Fresh/Vegetables/Produce/Cheese' })
  @IsBoolean()
  @IsOptional()
  es_codigo_especial?: boolean;

  @ApiPropertyOptional({ description: 'Requires manual price entry' })
  @IsBoolean()
  @IsOptional()
  requiere_precio_manual?: boolean;

  @ApiPropertyOptional({ description: 'Uses batch/lote tracking' })
  @IsBoolean()
  @IsOptional()
  maneja_lotes?: boolean;

  @ApiPropertyOptional({ example: 850.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  costo?: number;

  @ApiPropertyOptional({ example: 21.00 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  iva?: number;

  @ApiPropertyOptional({ example: 1200.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  precio_venta?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock_minimo?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  maneja_stock?: boolean;
}