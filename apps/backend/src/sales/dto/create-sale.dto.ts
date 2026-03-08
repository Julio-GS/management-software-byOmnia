import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateSaleItemDto } from './create-sale-item.dto';
import type { CreateSaleDto as ICreateSaleDto, PaymentMethod } from '@omnia/shared-types';

export class CreateSaleDto implements ICreateSaleDto {
  @ApiProperty({ example: 'cash', enum: ['cash', 'card', 'transfer', 'mixed'] })
  @IsEnum(['cash', 'card', 'transfer', 'mixed'])
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 0, default: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cashierId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
