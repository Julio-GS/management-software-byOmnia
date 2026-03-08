import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalculatePriceDto {
  @ApiProperty({
    description: 'Product cost',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cost: number;

  @ApiProperty({
    description: 'Product ID (optional, for product-specific markup)',
    example: 'clxxxxx',
    required: false,
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({
    description: 'Category ID (optional, for category-specific markup)',
    example: 'clxxxxx',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
