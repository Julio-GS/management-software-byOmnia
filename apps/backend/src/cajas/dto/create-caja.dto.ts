import { IsInt, IsString, IsOptional, Min, MinLength, MaxLength } from 'class-validator';

export class CreateCajaDto {
  @IsInt()
  @Min(1)
  numero: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
