import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type { UpdateGlobalMarkupDto as IUpdateGlobalMarkupDto } from '@omnia/shared-types';

export class UpdateGlobalMarkupDto implements IUpdateGlobalMarkupDto {
  @ApiProperty({
    description: 'Global markup percentage (0-1000)',
    example: 30,
    minimum: 0,
    maximum: 1000,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  markup: number;
}
