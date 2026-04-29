import {
  Controller,
  Get,
  Post,
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
import { PromocionesService } from './promociones.service';
import { PromotionCalculatorService } from './services/promotion-calculator.service';
import {
  CreatePromocionDto,
  UpdatePromocionDto,
  FilterPromocionesDto,
  AddProductsToPromocionDto,
} from './dto/create-promocion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Promociones')
@ApiBearerAuth()
@Controller('api/v1/promociones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromocionesController {
  constructor(
    private readonly promocionesService: PromocionesService,
    private readonly promotionCalculator: PromotionCalculatorService,
  ) {}

  /**
   * GET /api/v1/promociones - List all promotions
   */
  @Get()
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all promotions' })
  @ApiResponse({ status: 200, description: 'Promotions list' })
  async findAll(
    @Query() filters: FilterPromocionesDto,
  ): Promise<{ data: any[]; total: number }> {
    return this.promocionesService.findAll(filters);
  }

  /**
   * GET /api/v1/promociones/vigentes - Currently active promotions
   */
  @Get('vigentes')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get currently active promotions' })
  @ApiResponse({ status: 200, description: 'Active promotions' })
  async findVigentes(): Promise<any[]> {
    return this.promocionesService.findVigentes();
  }

  /**
   * GET /api/v1/promociones/:id - Get a promotion
   */
  @Get(':id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a promotion by ID' })
  @ApiResponse({ status: 200, description: 'Promotion details' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async findById(@Param('id') id: string): Promise<any> {
    return this.promocionesService.findById(id);
  }

  /**
   * GET /api/v1/promociones/:id/productos - Get products in a promotion
   */
  @Get(':id/productos')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get products in a promotion' })
  @ApiResponse({ status: 200, description: 'Product IDs' })
  async getProductos(@Param('id') id: string): Promise<{ productos: string[] }> {
    const productos = await this.promocionesService.getProductos(id);
    return { productos };
  }

  /**
   * POST /api/v1/promociones - Create a promotion
   */
  @Post()
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new promotion' })
  @ApiResponse({ status: 201, description: 'Promotion created' })
  async create(@Body() data: CreatePromocionDto): Promise<any> {
    return this.promocionesService.create(data);
  }

  /**
   * PATCH /api/v1/promociones/:id - Update a promotion
   */
  @Patch(':id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a promotion' })
  @ApiResponse({ status: 200, description: 'Promotion updated' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdatePromocionDto,
  ): Promise<any> {
    return this.promocionesService.update(id, data);
  }

  /**
   * DELETE /api/v1/promociones/:id - Soft delete a promotion
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a promotion' })
  @ApiResponse({ status: 204, description: 'Promotion deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.promocionesService.softDelete(id);
  }

  /**
   * POST /api/v1/promociones/:id/productos - Add products to promotion
   */
  @Post(':id/productos')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add products to promotion' })
  @ApiResponse({ status: 201, description: 'Products added' })
  async addProductos(
    @Param('id') id: string,
    @Body() data: AddProductsToPromocionDto,
  ): Promise<{ message: string }> {
    await this.promocionesService.addProductos(id, data);
    return { message: `${data.productos_ids.length} productos agregados` };
  }

  /**
   * DELETE /api/v1/promociones/:id/productos - Remove products from promotion
   */
  @Delete(':id/productos')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove products from promotion' })
  @ApiResponse({ status: 200, description: 'Products removed' })
  async removeProductos(
    @Param('id') id: string,
    @Body() data: AddProductsToPromocionDto,
  ): Promise<{ message: string }> {
    await this.promocionesService.removeProductos(id, data);
    return { message: `${data.productos_ids.length} productos removidos` };
  }
}