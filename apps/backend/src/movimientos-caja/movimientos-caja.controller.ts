import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MovimientosCajaService } from './movimientos-caja.service';
import { CreateMovimientoCajaDto } from './dto/create-movimiento-caja.dto';
import { FilterMovimientosCajaDto } from './dto/filter-movimientos-caja.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('movimientos-caja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosCajaController {
  constructor(
    private readonly movimientosCajaService: MovimientosCajaService,
  ) {}

  @Post()
  @Roles('admin')
  create(
    @Body() createMovimientoCajaDto: CreateMovimientoCajaDto,
    @CurrentUser() user: any,
  ) {
    return this.movimientosCajaService.create(
      createMovimientoCajaDto,
      user.id,
    );
  }

  @Get()
  @Roles('admin', 'encargado')
  findAll(@Query() query: FilterMovimientosCajaDto) {
    return this.movimientosCajaService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'encargado')
  findOne(@Param('id') id: string) {
    return this.movimientosCajaService.findOne(id);
  }
}
