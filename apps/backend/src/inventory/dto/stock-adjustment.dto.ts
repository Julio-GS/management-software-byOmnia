import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { StockAdjustmentDto as IStockAdjustmentDto } from '@omnia/shared-types';

export class StockAdjustmentDto implements IStockAdjustmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50, description: 'New stock value to set (can be negative for offline scenarios)' })
  @IsNumber()
  @Type(() => Number)
  newStock: number;

  @ApiProperty({ example: 'Physical inventory count', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
