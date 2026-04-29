import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class QueryEfectividadPromocionesDto {
  @IsOptional()
  @IsUUID()
  promocion_id?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
