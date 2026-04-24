import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FilterCierresCajaDto {
  @IsOptional()
  @IsUUID()
  caja_id?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
