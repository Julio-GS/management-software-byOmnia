import { IsIn, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * MedioPagoDto
 * 
 * DTO para cada medio de pago en la venta.
 * Soporta split tickets (múltiples medios de pago).
 */
export class MedioPagoDto {
  @ApiProperty({
    description: 'Medio de pago',
    enum: ['efectivo', 'debito', 'credito', 'transferencia', 'qr'],
    example: 'efectivo',
  })
  @IsIn(['efectivo', 'debito', 'credito', 'transferencia', 'qr'])
  medio_pago: string;

  @ApiProperty({
    description: 'Monto pagado con este medio',
    example: 1000,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  monto: number;
}
