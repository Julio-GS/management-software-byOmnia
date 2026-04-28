import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ProductsEsService } from './products-es.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
// TODO: Restore when PricingService is fixed for Spanish schema
// import { UpdateMarkupDto } from '../pricing/dto/update-markup.dto';
// import { PricingService } from '../pricing/pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetProductsQuery } from './queries/get-products.query';
import { UpdateStockCommand } from './commands/update-stock.command';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly ProductsEsService: ProductsEsService,
    // TODO: Restore when PricingService is fixed for Spanish schema
    // private readonly pricingService: PricingService,
  ) {}

  @Post()
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 409, description: 'Product with SKU or barcode already exists' })
  create(@Body() createProductDto: CreateProductDto) {
    // Call service directly - CreateProductDto already uses Spanish field names
    return this.ProductsEsService.create(createProductDto);
  }

  @Get()
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.queryBus.execute(
      new GetProductsQuery({ categoryId, isActive, search }),
    );
  }

  @Get('total-value')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get total inventory value' })
  @ApiResponse({ 
    status: 200, 
    description: 'Total inventory value retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalValue: { type: 'number', example: 125430.50 }
      }
    }
  })
  getTotalInventoryValue() {
    return this.ProductsEsService.getTotalInventoryValue();
  }

  @Get('sku/:sku')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get product by SKU' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findBySku(@Param('sku') sku: string) {
    return this.ProductsEsService.findBySku(sku);
  }

  @Get('barcode/:barcode')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.ProductsEsService.findByBarcode(barcode);
  }

  @Get(':id')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.ProductsEsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'SKU or barcode conflict' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.ProductsEsService.update(id, updateProductDto);
  }

  // TODO: Restore when markup field is added to Spanish schema
  // Spanish system uses precio_venta/costo directly, no markup field
  // @Put(':id/markup')
  // @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ 
  //   summary: 'Update product markup',
  //   description: 'Updates product-specific markup and triggers price recalculation. Set markup to null to inherit from category/global.',
  // })
  // @ApiResponse({ 
  //   status: 200, 
  //   description: 'Product markup updated and price recalculated',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       message: { type: 'string', example: 'Product markup updated and price recalculated' },
  //       product: { type: 'object' },
  //     },
  //   },
  // })
  // @ApiResponse({ status: 404, description: 'Product not found' })
  // async updateProductMarkup(
  //   @Param('id') id: string,
  //   @Body() updateMarkupDto: UpdateMarkupDto,
  // ) {
  //   // Update the product markup
  //   await this.ProductsEsService.update(id, {
  //     markup: updateMarkupDto.markup,
  //   });

  //   // Trigger price recalculation for this product
  //   await this.pricingService.recalculatePriceForProduct(id);

  //   // Fetch updated product with new price
  //   const updatedProduct = await this.ProductsEsService.findOne(id);

  //   return {
  //     message: 'Product markup updated and price recalculated',
  //     product: updatedProduct,
  //   };
  // }

  @Patch(':id/stock')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product stock' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  updateStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    // For backward compatibility, infer type='ADJUSTMENT' when only quantity is provided
    return this.commandBus.execute(
      new UpdateStockCommand(
        id,
        quantity,
        'ADJUSTMENT',
        undefined,
        undefined,
        undefined,
        undefined,
      ),
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (soft delete)' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string) {
    return this.ProductsEsService.remove(id);
  }
}
