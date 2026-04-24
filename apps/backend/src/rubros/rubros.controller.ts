import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RubrosService } from './rubros.service';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto, FilterRubrosDto } from './dto/update-rubro.dto';

@ApiTags('rubros')
@Controller('api/v1/rubros')
export class RubrosController {
  constructor(private readonly service: RubrosService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all rubros' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'nivel', required: false, type: Number })
  @ApiQuery({ name: 'parent_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of rubros' })
  async findAll(@Query() filters: FilterRubrosDto) {
    return this.service.findAll(filters);
  }

  @Get('tree')
  @Public()
  @ApiOperation({ summary: 'Get hierarchical tree of rubros' })
  @ApiResponse({ status: 200, description: 'Tree of rubros' })
  async findTree() {
    return this.service.findTree();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one rubro by ID' })
  @ApiResponse({ status: 200, description: 'Rubro found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Get(':id/children')
  @Public()
  @ApiOperation({ summary: 'Get children of a rubro' })
  @ApiResponse({ status: 200, description: 'List of child rubros' })
  async findChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findChildren(id);
  }

  @Post()
  @Roles('admin', 'encargado')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new rubro' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() data: CreateRubroDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles('admin', 'encargado')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rubro' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateRubroDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete rubro (validates no active children)' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 400, description: 'Has active children' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}