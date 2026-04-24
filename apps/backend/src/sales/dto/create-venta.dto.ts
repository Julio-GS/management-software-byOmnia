import { IsUUID, IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TicketItemDto } from './ticket-item.dto';
import { MedioPagoDto } from './medio-pago.dto';

/**
 * CreateVentaDto
 * 
 * DTO para crear una venta completa según SPEC_04.
 * Soporta:
 * - Múltiples items con FEFO automático
 * - Split tickets (múltiples medios de pago)
 * - Precio manual para productos F/V/P/C
 * - Promociones automáticas
 */
export class CreateVentaDto {
  @ApiProperty({
    description: 'ID de la caja donde se realiza la venta',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  caja_id: string;

  @ApiProperty({
    description: 'ID de transacción (para split tickets - múltiples ventas en 1 transacción)',
    example: '550e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  transaccion_id?: string;

  @ApiProperty({
    description: 'Items del ticket',
    type: [TicketItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketItemDto)
  items: TicketItemDto[];

  @ApiProperty({
    description: 'Medios de pago (soporta múltiples para split tickets)',
    type: [MedioPagoDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedioPagoDto)
  medios_pago: MedioPagoDto[];

  @ApiProperty({
    description: 'Observaciones adicionales',
    example: 'Cliente frecuente',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
