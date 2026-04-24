import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCajaDto } from './create-caja.dto';

export class UpdateCajaDto extends PartialType(CreateCajaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
