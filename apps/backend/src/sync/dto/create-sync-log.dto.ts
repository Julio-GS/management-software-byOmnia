import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CreateSyncLogDto as ICreateSyncLogDto, SyncEntityType, SyncOperation } from '@omnia/shared-types';

export class CreateSyncLogDto implements ICreateSyncLogDto {
  @ApiProperty({ example: 'DEVICE-001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'product', enum: ['product', 'sale', 'inventory', 'category', 'user'] })
  @IsEnum(['product', 'sale', 'inventory', 'category', 'user'])
  @IsNotEmpty()
  entityType: SyncEntityType;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'create', enum: ['create', 'update', 'delete'] })
  @IsEnum(['create', 'update', 'delete'])
  @IsNotEmpty()
  operation: SyncOperation;

  @ApiProperty({ example: { name: 'Product Name', price: 100 }, required: false })
  @IsObject()
  @IsOptional()
  data?: any;
}
