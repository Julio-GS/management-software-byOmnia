import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { CreateCategoryDto as ICreateCategoryDto } from '@omnia/shared-types';

export class CreateCategoryDto implements ICreateCategoryDto {
  @ApiProperty({ example: 'Bebidas' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Bebidas y refrescos', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ example: '#3B82F6', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'droplet', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 25, description: 'Default markup percentage for products in this category', required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  @IsOptional()
  defaultMarkup?: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
