import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  Min,
  Max,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Promotion types enum
 */
export const TIPO_PROMOCION = ['descuento_porcentaje', 'descuento_monto', 'cantidad_por_cantidad', 'precio_especial'] as const;
export type TipoPromocion = typeof TIPO_PROMOCION[number];

/**
 * DTO for creating a promotion
 */
export class CreatePromocionDto {
  @ApiProperty({
    description: 'Promotion name',
    example: 'Descuento 20% en productos de limpieza',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Promotion description',
    example: 'Promoción válida solo los domingos',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    description: 'Promotion type',
    enum: TIPO_PROMOCION,
    example: 'descuento_porcentaje',
  })
  @IsIn(TIPO_PROMOCION)
  tipo: TipoPromocion;

  @ApiProperty({
    description: 'Discount value (for porcentaje or monto types)',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_descuento?: number;

  @ApiProperty({
    description: 'Required quantity (for cantidad_por_cantidad type)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad_requerida?: number;

  @ApiProperty({
    description: 'Bonus quantity (for cantidad_por_cantidad type)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad_bonificada?: number;

  @ApiProperty({
    description: 'Special price (for precio_especial type)',
    example: 99.99,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_especial?: number;

  @ApiProperty({
    description: 'Start date',
    example: '2024-01-01',
  })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({
    description: 'End date',
    example: '2024-12-31',
  })
  @IsDateString()
  fecha_fin: string;

  @ApiProperty({
    description: 'Days of week (0=Sunday, 1=Monday, etc.)',
    example: [0, 1, 2, 3, 4, 5, 6],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  dias_semana?: number[];

  @ApiProperty({
    description: 'Start time (HH:mm)',
    example: '08:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @ApiProperty({
    description: 'End time (HH:mm)',
    example: '22:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  hora_fin?: string;

  @ApiProperty({
    description: 'Max quantity per customer',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad_maxima_cliente?: number;

  @ApiProperty({
    description: 'Can be stacked with other promotions (only for jubilado)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  acumulable?: boolean;

  @ApiProperty({
    description: 'Priority (higher = more important)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  prioridad?: number;

  @ApiProperty({
    description: 'Product IDs to apply promotion',
    example: ['uuid-1', 'uuid-2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productos_ids?: string[];
}

/**
 * DTO for updating a promotion
 */
export class UpdatePromocionDto {
  @ApiProperty({
    description: 'Promotion name',
    required: false,
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({
    description: 'Promotion description',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    description: 'Promotion type',
    enum: TIPO_PROMOCION,
    required: false,
  })
  @IsOptional()
  @IsIn(TIPO_PROMOCION)
  tipo?: TipoPromocion;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valor_descuento?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cantidad_requerida?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cantidad_bonificada?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  precio_especial?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  dias_semana?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hora_fin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cantidad_maxima_cliente?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  acumulable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  prioridad?: number;
}

/**
 * DTO for filtering promotions
 */
export class FilterPromocionesDto {
  @ApiProperty({
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({
    description: 'Filter only currently active promotions',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  solo_vigentes?: boolean;

  @ApiProperty({
    description: 'Filter by promotion type',
    enum: TIPO_PROMOCION,
    required: false,
  })
  @IsOptional()
  @IsIn(TIPO_PROMOCION)
  tipo?: TipoPromocion;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

/**
 * DTO for adding products to a promotion
 */
export class AddProductsToPromocionDto {
  @ApiProperty({
    description: 'Product IDs to add',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  productos_ids: string[];
}