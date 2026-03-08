import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Coca Cola 2.25L' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Gaseosa Coca Cola 2.25 litros', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'BEB-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: '7790895001567', required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 850.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 550.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost: number;

  @ApiProperty({ example: 48, default: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: 12, default: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minStock?: number;

  @ApiProperty({ example: 100, required: false })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxStock?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 35, description: 'Product-specific markup percentage (overrides category/global)', required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  @IsOptional()
  markup?: number;

  @ApiProperty({ example: 21.00, default: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
