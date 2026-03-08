import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MovementType } from '../entities/inventory-movement.entity';

export class CreateMovementDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'ENTRY', enum: ['ENTRY', 'EXIT', 'ADJUSTMENT'] })
  @IsEnum(['ENTRY', 'EXIT', 'ADJUSTMENT'])
  @IsNotEmpty()
  type: MovementType;

  @ApiProperty({ example: 10, description: 'Quantity to add (positive) or subtract (negative)' })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 'Stock replenishment', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'PO-2024-001', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

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
