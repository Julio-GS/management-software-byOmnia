import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { UpdateGlobalMarkupDto } from './dto/update-global-markup.dto';
import { PriceCalculationResultDto } from './dto/price-calculation-result.dto';
import {
  UpdatePrecioDto,
  BulkUpdatePreciosDto,
  CalculatePriceWithIvaDto,
  FilterPreciosHistoriaDto,
  ApplyMarkupToRubroDto,
} from './dto/pricing-crud.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('api/v1/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ========== NEW PHASE 4 ENDPOINTS ==========

  /**
   * GET /api/v1/pricing/historia - List all price history
   */
  @Get('historia')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all price history' })
  @ApiResponse({ status: 200, description: 'Price history list' })
  async getAllPriceHistory(
    @Query() filters: FilterPreciosHistoriaDto,
  ): Promise<{
    data: Array<{
      id: string;
      producto_id: string;
      precio_anterior: number | null;
      precio_nuevo: number | null;
      motivo: string | null;
      tipo_cambio: string | null;
      fecha_cambio: Date;
    }>;
    total: number;
  }> {
    return this.pricingService.getAllPriceHistory(filters);
  }

  /**
   * GET /api/v1/pricing/historia/producto/:id - Get price history for a product
   */
  @Get('historia/producto/:id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get price history for a product' })
  @ApiResponse({ status: 200, description: 'Product price history' })
  async getProductPriceHistory(
    @Param('id') productId: string,
    @Query('limit') limit?: number,
  ) {
    return this.pricingService.getPriceHistory(productId, limit);
  }

  /**
   * PATCH /api/v1/pricing/producto/:id - Update price/cost for a product
   */
  @Patch('producto/:id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update price/cost for a product' })
  @ApiResponse({ status: 200, description: 'Price updated' })
  async updateProductPrice(
    @Param('id') productId: string,
    @Body() data: UpdatePrecioDto,
  ): Promise<{ message: string }> {
    await this.pricingService.updatePrice(productId, data);
    return { message: `Precio actualizado para producto ${productId}` };
  }

  /**
   * PATCH /api/v1/pricing/bulk - Bulk update prices
   */
  @Patch('bulk')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update prices' })
  @ApiResponse({ status: 200, description: 'Prices updated' })
  async bulkUpdatePrices(
    @Body() data: BulkUpdatePreciosDto,
  ): Promise<{ updated: number; failed: number }> {
    return this.pricingService.bulkUpdatePrices(data);
  }

  /**
   * POST /api/v1/pricing/calculate - Calculate price from cost+markup+IVA
   */
  @Post('calculate')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Calculate price from cost+markup+IVA' })
  @ApiResponse({ status: 200, description: 'Price calculated' })
  async calculatePriceWithIva(
    @Body() data: CalculatePriceWithIvaDto,
  ): Promise<{ precio_final: number }> {
    const precio = this.pricingService.calculatePriceWithIva(data.costo, data.markup, data.iva);
    return { precio_final: precio };
  }

  /**
   * GET /api/v1/pricing/rubro/:id/markup - Get default markup by rubro
   */
  @Get('rubro/:id/markup')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get default markup for rubro' })
  @ApiResponse({ status: 200, description: 'Markup retrieved' })
  async getRubroMarkup(
    @Param('id') rubroId: string,
  ): Promise<{ markup: number }> {
    const markup = await this.pricingService.getDefaultMarkupByRubro(rubroId);
    return { markup };
  }

  /**
   * POST /api/v1/pricing/rubro/:id/apply-markup - Apply markup to all products in rubro
   */
  @Post('rubro/:id/apply-markup')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply markup to all products in rubro' })
  @ApiResponse({ status: 200, description: 'Markup applied' })
  async applyMarkupToRubro(
    @Param('id') rubroId: string,
    @Body() data: ApplyMarkupToRubroDto,
  ): Promise<{ message: string; count: number }> {
    const count = await this.pricingService.applyMarkupToRubro(rubroId, data.markup);
    return {
      message: `Markup ${data.markup}% aplicado a ${count} productos`,
      count,
    };
  }

  @Post('calculate')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Calculate price with markup hierarchy',
    description: 'Calculates product price based on cost and markup hierarchy (product > category > global)',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Price calculated successfully',
    type: PriceCalculationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async calculatePrice(
    @Body() calculatePriceDto: CalculatePriceDto,
  ): Promise<PriceCalculationResultDto> {
    return this.pricingService.calculatePrice(
      calculatePriceDto.cost,
      calculatePriceDto.productId,
      calculatePriceDto.categoryId,
    );
  }

  @Get('markup/:productId')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Get applicable markup for product',
    description: 'Returns the markup percentage and source (product/category/global) for a specific product',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Markup retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        percentage: { type: 'number', example: 30 },
        source: { type: 'string', enum: ['product', 'category', 'global'], example: 'global' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getApplicableMarkup(
    @Param('productId') productId: string,
  ): Promise<{ percentage: number; source: 'product' | 'category' | 'global' }> {
    return this.pricingService.getApplicableMarkup(productId);
  }

  @Put('global-markup')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update global markup',
    description: 'Updates the global default markup percentage. This affects all products without specific product or category markup.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Global markup updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Global markup updated to 30%' },
        percentage: { type: 'number', example: 30 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid markup percentage' })
  async updateGlobalMarkup(
    @Body() updateGlobalMarkupDto: UpdateGlobalMarkupDto,
  ): Promise<{ message: string; percentage: number }> {
    await this.pricingService.updateGlobalMarkup(updateGlobalMarkupDto.markup);
    return {
      message: `Global markup updated to ${updateGlobalMarkupDto.markup}%`,
      percentage: updateGlobalMarkupDto.markup,
    };
  }

  @Post('recalculate/category/:id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Recalculate prices for category',
    description: 'Recalculates prices for all products in a category that rely on category markup (no product-specific markup)',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prices recalculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Recalculated 15 product prices' },
        count: { type: 'number', example: 15 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async recalculateCategoryPrices(
    @Param('id') categoryId: string,
  ): Promise<{ message: string; count: number }> {
    const count = await this.pricingService.recalculatePricesForCategory(categoryId);
    return {
      message: `Recalculated ${count} product prices`,
      count,
    };
  }

  @Post('recalculate/global')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Recalculate all prices',
    description: 'Recalculates prices for all products that rely on global markup (no product or category markup)',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prices recalculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Recalculated 50 product prices' },
        count: { type: 'number', example: 50 },
      },
    },
  })
  async recalculateGlobalPrices(): Promise<{ message: string; count: number }> {
    const count = await this.pricingService.recalculatePricesGlobal();
    return {
      message: `Recalculated ${count} product prices`,
      count,
    };
  }

  @Post('recalculate/product/:id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Recalculate single product price',
    description: 'Recalculates price for a specific product based on its cost and applicable markup',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Product price recalculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Product price recalculated successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async recalculateProductPrice(
    @Param('id') productId: string,
  ): Promise<{ message: string }> {
    await this.pricingService.recalculatePriceForProduct(productId);
    return {
      message: 'Product price recalculated successfully',
    };
  }
}
