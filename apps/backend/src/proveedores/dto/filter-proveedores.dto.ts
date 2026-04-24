import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class FilterProveedoresDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}