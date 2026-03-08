import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMarkupDto {
  @ApiProperty({
    description: 'Markup percentage (0-1000). Set to null to remove specific markup and inherit from parent level.',
    example: 35,
    minimum: 0,
    maximum: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  markup?: number | null;
}
