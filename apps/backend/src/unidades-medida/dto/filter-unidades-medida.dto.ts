import { IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class FilterUnidadesMedidaDto {
  @IsOptional()
  @IsEnum(['unidad', 'peso', 'volumen', 'longitud'], {
    message: 'tipo must be one of: unidad, peso, volumen, longitud'
  })
  tipo?: 'unidad' | 'peso' | 'volumen' | 'longitud';

  @IsOptional()
  @IsBoolean({ message: 'activo must be a boolean' })
  activo?: boolean;
}