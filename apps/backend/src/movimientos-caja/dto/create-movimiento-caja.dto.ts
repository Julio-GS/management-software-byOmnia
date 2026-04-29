import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMovimientoCajaDto {
  @IsIn(['gasto', 'retiro'])
  tipo: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  concepto: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  comprobante?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
