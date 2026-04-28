import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class QueryVentasDiariasDto {
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsIn(['efectivo', 'debito', 'credito', 'transferencia', 'qr'])
  medio_pago?: string;
}
