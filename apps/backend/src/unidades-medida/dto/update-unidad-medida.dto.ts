import { IsString, IsOptional, IsEnum, MaxLength, MinLength, IsBoolean } from 'class-validator';

export class UpdateUnidadMedidaDto {
  @IsOptional()
  @IsString({ message: 'nombre must be a string' })
  @MinLength(1, { message: 'nombre is required' })
  @MaxLength(50, { message: 'nombre must be at most 50 characters' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'abreviatura must be a string' })
  @MinLength(1, { message: 'abreviatura is required' })
  @MaxLength(10, { message: 'abreviatura must be at most 10 characters' })
  abreviatura?: string;

  @IsOptional()
  @IsEnum(['unidad', 'peso', 'volumen', 'longitud'], {
    message: 'tipo must be one of: unidad, peso, volumen, longitud'
  })
  tipo?: 'unidad' | 'peso' | 'volumen' | 'longitud';

  @IsOptional()
  @IsBoolean({ message: 'activo must be a boolean' })
  activo?: boolean;
}