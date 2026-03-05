import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StockAdjustmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50, description: 'New stock value to set' })
  @IsNumber()
  @Type(() => Number)
  newStock: number;

  @ApiProperty({ example: 'Physical inventory count' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
