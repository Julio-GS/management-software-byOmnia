import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGlobalMarkupDto {
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
  percentage: number;
}
