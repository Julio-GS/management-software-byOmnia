import { ApiProperty } from '@nestjs/swagger';

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
