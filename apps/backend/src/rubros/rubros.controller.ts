import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards, Put, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RubrosService } from './rubros.service';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto, FilterRubrosDto } from './dto/update-rubro.dto';
import { UserRole } from '../auth/enums/user-role.enum';
import { PricingService } from '../pricing/pricing.service';
import { UpdateMarkupDto } from '../pricing/dto/update-markup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('rubros')
@Controller('/rubros')
export class RubrosController {
  constructor(
    private readonly service: RubrosService,
    private readonly pricingService: PricingService,
  ) {}

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
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new rubro' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() data: CreateRubroDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rubro' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateRubroDto) {
    return this.service.update(id, data);
  }

  @Put(':id/markup')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update rubro markup',
    description: 'Updates rubro markup and triggers price recalculation for all products in the rubro'
  })
  @ApiResponse({ status: 200, description: 'Rubro markup updated and prices recalculated' })
  @ApiResponse({ status: 404, description: 'Rubro not found' })
  async updateRubroMarkup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMarkupDto: UpdateMarkupDto,
  ) {
    // Update the rubro markup
    const rubro = await this.service.update(id, {
      default_markup: updateMarkupDto.markup,
    });

    // Trigger price recalculation for products in this rubro
    const productsUpdated = await this.pricingService.recalculatePricesForCategory(id);

    return {
      message: `Rubro markup actualizado y ${productsUpdated} precios recalculados`,
      rubro,
      productsUpdated,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete rubro (validates no active children)' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 400, description: 'Has active children' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}