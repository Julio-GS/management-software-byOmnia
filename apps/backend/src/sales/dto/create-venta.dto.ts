import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TicketItemDto {
  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string; // Opcional: si no se provee, FEFO selecciona automático

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  precio_manual?: number; // REQUERIDO para productos F/V/P/C
}

export class MedioPagoDto {
  @IsIn(['efectivo', 'debito', 'credito', 'transferencia', 'qr'])
  medio_pago: string;

  @IsNumber()
  @Min(0.01)
  monto: number;
}

export class CreateVentaDto {
  @IsUUID()
  caja_id: string;

  @IsOptional()
  @IsUUID()
  transaccion_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketItemDto)
  items: TicketItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedioPagoDto)
  medios_pago: MedioPagoDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class AnularVentaDto {
  @IsString()
  @MinLength(10)
  motivo_anulacion: string;
}

export class FilterVentasDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  caja_id?: string;

  @IsOptional()
  fecha_desde?: string;

  @IsOptional()
  fecha_hasta?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  incluir_anuladas?: boolean = false;
}
