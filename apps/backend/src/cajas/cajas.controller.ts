import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CajasService } from './cajas.service';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';
import { FilterCajasDto } from './dto/filter-cajas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cajas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CajasController {
  constructor(private readonly cajasService: CajasService) {}

  @Post()
  @Roles('admin')
  create(@Body() createCajaDto: CreateCajaDto) {
    return this.cajasService.create(createCajaDto);
  }

  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() filters: FilterCajasDto) {
    return this.cajasService.findAll(filters);
  }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findOne(@Param('id') id: string) {
    return this.cajasService.findById(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateCajaDto: UpdateCajaDto) {
    return this.cajasService.update(id, updateCajaDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.cajasService.softDelete(id);
  }
}
