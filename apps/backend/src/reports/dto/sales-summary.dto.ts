import { ApiProperty } from '@nestjs/swagger';
import type { SalesSummaryRequest } from '@omnia/shared-types';
import { IsOptional, IsString, IsEnum } from 'class-validator';

// Note: This file contains DTOs for the reports module
// The shared SalesSummaryRequest is used for the request DTO
// The other DTOs are backend-specific response types

export class SalesSummaryRequestDto implements SalesSummaryRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ required: false, enum: ['day', 'week', 'month', 'quarter', 'year', 'custom'] })
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'quarter', 'year', 'custom'])
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

// Legacy backend-specific DTOs (kept for backwards compatibility)
// These should eventually be replaced with shared types

export class SalesSummaryDto {
  @ApiProperty({ description: 'Total number of sales' })
  totalSales: number;

  @ApiProperty({ description: 'Total revenue amount' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total products sold' })
  productsSold: number;

  @ApiProperty({ description: 'Average transaction value' })
  avgTransactionValue: number;

  @ApiProperty({ description: 'Percentage change vs previous period' })
  changeVsYesterday: number;
}

export class TopProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  quantitySold: number;

  @ApiProperty()
  revenue: number;
}

export class LowStockProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  currentStock: number;

  @ApiProperty()
  minStock: number;

  @ApiProperty()
  categoryName?: string;
}

export class StockRotationDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  averageDailySales: number;

  @ApiProperty()
  currentStock: number;

  @ApiProperty()
  daysUntilStockout: number;

  @ApiProperty()
  rotationRate: number;
}

export class RevenueByCategoryDto {
  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  salesCount: number;

  @ApiProperty()
  percentage: number;
}

export class SalesTrendDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  sales: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  productsSold: number;
}

export enum PeriodType {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
}
