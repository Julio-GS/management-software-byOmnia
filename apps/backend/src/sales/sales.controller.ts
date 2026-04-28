import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateVentaDto, AnularVentaDto, FilterVentasDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  async create(@Body() dto: CreateVentaDto, @CurrentUser() user: any) {
    const result = await this.salesService.createVenta(dto, user.id ?? user.sub);
    return result.venta;
  }

  @Get()
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  findAll(@Query() query: FilterVentasDto) {
    return this.salesService.findAll(query);
  }

  @Get('ticket/:numero')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  findByNumeroTicket(@Param('numero') numero: string) {
    return this.salesService.findByNumeroTicket(numero);
  }

  @Get('caja/:id')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  findByCajaHoy(@Param('id') id: string) {
    return this.salesService.findByCajaHoy(id);
  }

  @Get(':id')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post(':id/anular')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  anular(
    @Param('id') id: string,
    @Body() dto: AnularVentaDto,
    @CurrentUser() user: any,
  ) {
    return this.salesService.anularVenta(id, dto, user.id ?? user.sub);
  }
}
