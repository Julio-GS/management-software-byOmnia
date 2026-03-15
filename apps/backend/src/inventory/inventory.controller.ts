import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movement')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Create an inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid movement data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  createMovement(@Body() createMovementDto: CreateMovementDto) {
    return this.inventoryService.createMovement(createMovementDto);
  }

  @Post('adjust')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Adjust product stock' })
  @ApiResponse({ status: 201, description: 'Stock adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  adjustStock(@Body() adjustmentDto: StockAdjustmentDto) {
    return this.inventoryService.adjustStock(adjustmentDto);
  }

  @Get('movements')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get all inventory movements' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Movements retrieved successfully' })
  getAllMovements(
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params: any = {};
    if (type) params.type = type;
    if (startDate) params.startDate = new Date(startDate);
    if (endDate) params.endDate = new Date(endDate);

    return this.inventoryService.getAllMovements(params);
  }

  @Get('low-stock')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get products with low stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved successfully' })
  getLowStockProducts(@Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStockProducts(threshold);
  }

  @Get('movements/:productId')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get inventory movement history for a product' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Product history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProductHistory(
    @Param('productId') productId: string,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getProductHistory(productId, limit);
  }
}
