import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto, FilterDevolucionesDto, ProcesarDevolucionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProcesarDevolucionCommand } from './commands/procesar-devolucion.command';
import { UserRole } from '../auth/enums/user-role.enum';

/**
 * DevolucionesController - API endpoints for product returns/refunds
 * 
 * All endpoints require authentication (JwtAuthGuard)
 * POST endpoint requires role: cajero, encargado, or admin
 */
@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  constructor(
    private readonly devolucionesService: DevolucionesService,
    private readonly commandBus: CommandBus,
  ) {}

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
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  create(
    @Body() createDevolucionDto: CreateDevolucionDto,
    @CurrentUser() user: any,
  ) {
    return this.devolucionesService.createDevolucion(createDevolucionDto, user.id);
  }

  /**
   * POST /devoluciones/procesar
   * Process a devolucion using CQRS CommandBus
   * 
   * Roles: cajero, encargado, admin
   * 
   * This endpoint uses the command handler directly for better isolation
   * and transaction control.
   */
  @Post('procesar')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  async procesarDevolucion(
    @Body() dto: ProcesarDevolucionDto,
  ) {
    const command = new ProcesarDevolucionCommand(
      dto.ventaId,
      dto.productoId,
      dto.cantidadDevuelta,
      dto.motivoDevolucion,
    );
    return await this.commandBus.execute(command);
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
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
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
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
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
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  findByVenta(@Param('id') id: string) {
    return this.devolucionesService.findByVenta(id);
  }
}
