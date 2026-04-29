import { IsUUID, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TicketItemDto
 * 
 * DTO para cada item en el ticket de venta.
 * Soporta precio manual para productos F/V/P/C y selección FEFO de lotes.
 */
export class TicketItemDto {
  @ApiProperty({
    description: 'ID del producto',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  producto_id: string;

  @ApiProperty({
    description: 'ID del lote (opcional, se selecciona automático con FEFO si el producto maneja lotes)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  lote_id?: string;

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 2.5,
    minimum: 0.001,
  })
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @ApiProperty({
    description: 'Precio manual (REQUERIDO para productos F/V/P/C que requieren precio manual)',
    example: 150.50,
    minimum: 0.01,
    maximum: 999999,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  precio_manual?: number;

  @ApiProperty({
    description: 'ID de promoción (auto-aplicada por PromocionCalculatorService)',
    example: '550e8400-e29b-41d4-a716-446655440003',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  promocion_id?: string;
}
