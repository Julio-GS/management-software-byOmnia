import { IsString, IsOptional, MaxLength, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class UpdateRubroDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

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

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FilterRubrosDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  nivel?: number;

  @IsOptional()
  @IsString()
  parent_id?: string;
}