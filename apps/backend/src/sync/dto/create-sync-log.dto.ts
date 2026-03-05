import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum EntityType {
  PRODUCT = 'product',
  SALE = 'sale',
  INVENTORY = 'inventory',
  CATEGORY = 'category',
}

enum Operation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export class CreateSyncLogDto {
  @ApiProperty({ example: 'DEVICE-001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'product', enum: EntityType })
  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'create', enum: Operation })
  @IsEnum(Operation)
  @IsNotEmpty()
  operation: string;

  @ApiProperty({ example: { name: 'Product Name', price: 100 }, required: false })
  @IsObject()
  @IsOptional()
  data?: any;
}
