import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnularVentaDto {
  @ApiProperty({
    example: 'Error en el precio del producto',
    description: 'Motivo de la anulación de la venta',
    minLength: 10,
  })
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio' })
  @IsString({ message: 'El motivo de anulación debe ser un texto' })
  @MinLength(10, { message: 'El motivo de anulación debe tener al menos 10 caracteres' })
  motivo_anulacion: string;
}
