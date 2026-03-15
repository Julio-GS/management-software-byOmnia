import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { UpdateGlobalMarkupDto } from './dto/update-global-markup.dto';
import { PriceCalculationResultDto } from './dto/price-calculation-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  @Roles('cashier', 'manager', 'admin')
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
  @Roles('manager', 'admin')
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
  @Roles('admin')
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
  @Roles('manager', 'admin')
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
  @Roles('admin')
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
  @Roles('manager', 'admin')
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
