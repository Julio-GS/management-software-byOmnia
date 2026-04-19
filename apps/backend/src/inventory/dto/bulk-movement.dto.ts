import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkMovementItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 10, description: 'Stock change (positive to add, negative to subtract)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 150.00, description: 'New price (optional - if omitted, price unchanged)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  newPrice?: number;

  @ApiPropertyOptional({ enum: ['ENTRY', 'EXIT', 'ADJUSTMENT'] })
  @IsOptional()
  @IsString()
  movementType?: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

  @ApiPropertyOptional({ example: 50, description: 'Set exact stock value (overrides stockQuantity if provided)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  setStockTo?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class BulkMovementDto {
  @ApiProperty({ type: [BulkMovementItemDto], description: 'Array of movement items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMovementItemDto)
  items: BulkMovementItemDto[];

  @ApiPropertyOptional({ example: 'Stock replenishment' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'PO-2024-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'If true, continues processing even if some items fail' })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}

export class BulkMovementError {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  code: string;
}

export class BulkMovementResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [Object] })
  movements: Record<string, unknown>[];

  @ApiProperty({ type: [BulkMovementError] })
  errors: BulkMovementError[];

  @ApiProperty()
  processedCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiPropertyOptional()
  message?: string;
}
