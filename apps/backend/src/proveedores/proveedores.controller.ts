import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { FilterProveedoresDto } from './dto/filter-proveedores.dto';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('proveedores')
@Controller('api/v1/proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all proveedores' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of proveedores' })
  async findAll(@Query() filters: FilterProveedoresDto) {
    return this.service.findAll(filters);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search proveedores by name or razon_social' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') query: string) {
    return this.service.search(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one proveedor by ID' })
  @ApiResponse({ status: 200, description: 'Proveedor found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new proveedor' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() data: CreateProveedorDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update proveedor' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateProveedorDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete proveedor' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}