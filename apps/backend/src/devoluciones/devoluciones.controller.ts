import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto, FilterDevolucionesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * DevolucionesController - API endpoints for product returns/refunds
 * 
 * All endpoints require authentication (JwtAuthGuard)
 * POST endpoint requires role: cajero, encargado, or admin
 */
@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  constructor(private readonly devolucionesService: DevolucionesService) {}

  /**
   * POST /devoluciones
   * Create a new devolucion (product return)
   * 
   * Roles: cajero, encargado, admin
   * 
   * Business Rules Applied:
   * - Validates venta exists and is not anulada
   * - Validates cantidad disponible
   * - Returns product to same lote
   * - Calculates monto with discount applied
   * - Creates movimiento_stock
   * - Emits DevolucionCreatedEvent
   */
  @Post()
  @Roles('cajero', 'encargado', 'admin')
  create(
    @Body() createDevolucionDto: CreateDevolucionDto,
    @CurrentUser() user: any,
  ) {
    return this.devolucionesService.createDevolucion(createDevolucionDto, user.id);
  }

  /**
   * GET /devoluciones
   * Get all devoluciones with filters and pagination
   * 
   * Query params:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - venta_id: UUID (optional)
   * - producto_id: UUID (optional)
   * - fecha_desde: ISO date string (optional)
   * - fecha_hasta: ISO date string (optional)
   * - tipo_devolucion: string (optional)
   * 
   * Roles: cajero, encargado, admin
   */
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: FilterDevolucionesDto) {
    return this.devolucionesService.findAll(query);
  }

  /**
   * GET /devoluciones/:id
   * Get devolucion by ID with full details
   * 
   * Roles: cajero, encargado, admin
   */
  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findOne(@Param('id') id: string) {
    return this.devolucionesService.findOne(id);
  }

  /**
   * GET /devoluciones/venta/:id
   * Get all devoluciones for a specific venta
   * 
   * Roles: cajero, encargado, admin
   */
  @Get('venta/:id')
  @Roles('cajero', 'encargado', 'admin')
  findByVenta(@Param('id') id: string) {
    return this.devolucionesService.findByVenta(id);
  }
}
