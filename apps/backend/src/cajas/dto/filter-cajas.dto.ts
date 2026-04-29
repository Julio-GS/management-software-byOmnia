import { IsBoolean, IsOptional } from 'class-validator';

export class FilterCajasDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
