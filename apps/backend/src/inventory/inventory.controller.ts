import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { BulkMovementDto, BulkMovementResponseDto } from './dto/bulk-movement.dto';
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

  @Post('bulk-movement')
  @Roles('manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create bulk inventory movements for multiple products' })
  @SwaggerApiResponse({ status: 201, description: 'Bulk movement created successfully' })
  @SwaggerApiResponse({ status: 207, description: 'Partial success - some items failed' })
  @SwaggerApiResponse({ status: 400, description: 'Validation error or invalid request' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async createBulkMovement(
    @Body() bulkMovementDto: BulkMovementDto
  ): Promise<BulkMovementResponseDto> {
    return this.inventoryService.createBulkMovement(bulkMovementDto);
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
