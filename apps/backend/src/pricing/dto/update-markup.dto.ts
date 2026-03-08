import { IsNumber, IsOptional, Min, Max, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type { UpdateMarkupDto as IUpdateMarkupDto } from '@omnia/shared-types';

export class UpdateMarkupDto implements IUpdateMarkupDto {
  @ApiProperty({
    description: 'Product or Category ID',
    example: 'clxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Markup percentage (0-1000). Set to null to remove specific markup and inherit from parent level.',
    example: 35,
    minimum: 0,
    maximum: 1000,
    nullable: true,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  markup: number;
}
