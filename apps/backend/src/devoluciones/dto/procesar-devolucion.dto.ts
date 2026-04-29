import { IsUUID, IsInt, IsString, MinLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para procesar una devolución usando CQRS CommandBus
 * Versión simplificada que solo requiere datos críticos de negocio
 */
export class ProcesarDevolucionDto {
  @ApiProperty({
    description: 'ID de la venta original',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  ventaId: string;

  @ApiProperty({
    description: 'ID del producto a devolver',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  productoId: string;

  @ApiProperty({
    description: 'Cantidad de unidades a devolver',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  cantidadDevuelta: number;

  @ApiProperty({
    description: 'Motivo de la devolución (mínimo 10 caracteres)',
    example: 'Producto defectuoso - embalaje roto',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  motivoDevolucion: string;
}
