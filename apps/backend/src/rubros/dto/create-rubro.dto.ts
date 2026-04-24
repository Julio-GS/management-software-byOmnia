import { IsString, IsOptional, MaxLength, IsNumber, Min, Max, MinLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateRubroDto {
  @IsString({ message: 'nombre must be a string' })
  @MinLength(1, { message: 'nombre is required' })
  @MaxLength(100, { message: 'nombre must be at most 100 characters' })
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  default_markup?: number;
}