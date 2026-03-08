import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PeriodType } from './dto/sales-summary.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  @ApiOperation({ summary: 'Get sales summary for a period' })
  @ApiQuery({
    name: 'period',
    enum: PeriodType,
    required: false,
    description: 'Period for the summary (today, week, month)',
  })
  async getSalesSummary(@Query('period') period?: PeriodType) {
    return this.reportsService.getSalesSummary(period || PeriodType.TODAY);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return',
  })
  async getTopProducts(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.reportsService.getTopProducts(limitNum);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock' })
  async getLowStockProducts() {
    return this.reportsService.getLowStockProducts();
  }

  @Get('stock-rotation')
  @ApiOperation({ summary: 'Get stock rotation metrics' })
  async getStockRotation() {
    return this.reportsService.getStockRotation();
  }

  @Get('revenue-by-category')
  @ApiOperation({ summary: 'Get revenue breakdown by category' })
  async getRevenueByCategory() {
    return this.reportsService.getRevenueByCategory();
  }

  @Get('sales-trends')
  @ApiOperation({ summary: 'Get sales trends over time' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include',
  })
  async getSalesTrends(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.reportsService.getSalesTrends(daysNum);
  }
}
