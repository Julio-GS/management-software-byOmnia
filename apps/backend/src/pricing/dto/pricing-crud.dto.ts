import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating product price/cost
 */
export class UpdatePrecioDto {
  @ApiProperty({
    description: 'New cost value',
    example: 150.00,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nuevo_costo?: number;

  @ApiProperty({
    description: 'New price value',
    example: 299.99,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nuevo_precio?: number;

  @ApiProperty({
    description: 'Reason for price change',
    example: 'Ajuste por aumento de costos del proveedor',
    required: false,
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}

/**
 * DTO for bulk updating prices
 */
export class BulkUpdateItemDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'uuid-here',
  })
  @IsUUID()
  producto_id: string;

  @ApiProperty({
    description: 'New cost value',
    example: 150.00,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nuevo_costo?: number;

  @ApiProperty({
    description: 'New price value',
    example: 299.99,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nuevo_precio?: number;

  @ApiProperty({
    description: 'Reason for price change',
    example: 'Ajuste seasonal',
    required: false,
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class BulkUpdatePreciosDto {
  @ApiProperty({
    description: 'Array of price updates',
    type: [BulkUpdateItemDto],
  })
  updates: BulkUpdateItemDto[];
}

/**
 * DTO for calculating price from cost + markup + IVA
 */
export class CalculatePriceWithIvaDto {
  @ApiProperty({
    description: 'Product cost (without IVA)',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  costo: number;

  @ApiProperty({
    description: 'Markup percentage',
    example: 30,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  markup: number;

  @ApiProperty({
    description: 'IVA percentage',
    example: 21,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  iva: number;
}

/**
 * DTO for filtering price history
 */
export class FilterPreciosHistoriaDto {
  @ApiProperty({
    description: 'Filter by product ID',
    example: 'uuid-producto',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  producto_id?: string;

  @ApiProperty({
    description: 'Start date filter',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @ApiProperty({
    description: 'End date filter',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @ApiProperty({
    description: 'Page number (default 1)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    description: 'Items per page (default 20, max 100)',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO for applying markup to all products in a rubro
 */
export class ApplyMarkupToRubroDto {
  @ApiProperty({
    description: 'Markup percentage to apply',
    example: 35,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  markup: number;
}