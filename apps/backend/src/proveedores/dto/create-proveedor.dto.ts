import { IsString, IsOptional, MaxLength, MinLength, IsBoolean } from 'class-validator';

export class CreateProveedorDto {
  @IsString({ message: 'nombre must be a string' })
  @MinLength(1, { message: 'nombre is required' })
  @MaxLength(200, { message: 'nombre must be at most 200 characters' })
  nombre: string;

  @IsOptional()
  @IsString({ message: 'razon_social must be a string' })
  @MaxLength(200)
  razon_social?: string;

  @IsOptional()
  @IsString({ message: 'cuit must be a string' })
  @MinLength(11, { message: 'cuit must be 11 digits' })
  @MaxLength(13, { message: 'cuit must be at most 13 characters' })
  cuit?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contacto?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}