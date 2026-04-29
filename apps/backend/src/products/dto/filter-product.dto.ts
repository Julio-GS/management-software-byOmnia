import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../shared/dto/pagination.dto';

/**
 * FilterProductsDto - Filtros para búsqueda de productos
 * 
 * Campos del schema: productos
 */
export class FilterProductsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  proveedor_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  rubro_id?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  maneja_stock?: boolean;

  @ApiPropertyOptional({ description: 'F/V/P/C codes' })
  @IsBoolean()
  @IsOptional()
  es_codigo_especial?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;
}