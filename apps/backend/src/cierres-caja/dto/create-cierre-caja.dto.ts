import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCierreCajaDto {
  @IsUUID()
  caja_id: string;

  @IsDateString()
  fecha: string; // YYYY-MM-DD

  @IsNumber()
  @Min(0)
  efectivo_fisico: number; // Lo que realmente hay contado

  @IsOptional()
  @IsString()
  motivo_diferencia?: string; // REQUERIDO si diferencia != 0 (validado en service)

  @IsOptional()
  @IsString()
  observaciones?: string;
}
