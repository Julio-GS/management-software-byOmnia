import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LotesService } from './lotes.service';
import { Lote } from './entities/lote.entity';

@ApiTags('lotes')
@Controller('api/v1/lotes')
export class LotesController {
  constructor(private readonly service: LotesService) {}

  @Get()
  @ApiOperation({ summary: 'List all lotes' })
  @ApiResponse({ status: 200, description: 'List of lotes' })
  async findAll(
    @Query('producto_id') producto_id?: string,
    @Query('activo') activo?: string,
    @Query('solo_con_stock') solo_con_stock?: string,
  ) {
    const filters = {
      producto_id,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      solo_con_stock: solo_con_stock === 'true',
    };
    return this.service.findAll(filters);
  }

  @Get('proximos-vencer')
  @ApiOperation({ summary: 'Get lots expiring soon' })
  @ApiQuery({ name: 'dias', required: false, type: Number })
  async getProximosVencer(@Query('dias') dias: number = 15) {
    return this.service.getProximosVencer(dias);
  }

  @Get('vencidos')
  @ApiOperation({ summary: 'Get expired lots' })
  async getVencidos() {
    return this.service.getVencidos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lote by ID' })
  @ApiResponse({ status: 200, description: 'Lote found' })
  @ApiResponse({ status: 404, description: 'Lote not found' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create lote' })
  @ApiResponse({ status: 201, description: 'Lote created' })
  async create(@Body() dto: {
    producto_id: string;
    numero_lote?: string;
    fecha_vencimiento?: Date;
    cantidad_inicial: number;
  }) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lote' })
  @ApiResponse({ status: 200, description: 'Lote updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: {
      numero_lote?: string;
      fecha_vencimiento?: Date;
      activo?: boolean;
    },
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete lote' })
  @ApiResponse({ status: 200, description: 'Lote deleted' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}