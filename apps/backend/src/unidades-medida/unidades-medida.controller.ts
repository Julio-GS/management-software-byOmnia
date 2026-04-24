import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { FilterUnidadesMedidaDto } from './dto/filter-unidades-medida.dto';

@ApiTags('unidades-medida')
@Controller('api/v1/unidades-medida')
export class UnidadesMedidaController {
  constructor(private readonly service: UnidadesMedidaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all unidades de medida' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['unidad', 'peso', 'volumen', 'longitud'] })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of unidades de medida' })
  async findAll(@Query() filters: FilterUnidadesMedidaDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one unidad de medida by ID' })
  @ApiResponse({ status: 200, description: 'Unidad de medida found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin', 'encargado')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new unidad de medida' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() data: CreateUnidadMedidaDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles('admin', 'encargado')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update unidad de medida' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateUnidadMedidaDto,
  ) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete unidad de medida' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}