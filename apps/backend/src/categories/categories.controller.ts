import { Controller, Get, Post, Body, Patch, Param, Delete, Put, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateMarkupDto } from '../pricing/dto/update-markup.dto';
import { PricingService } from '../pricing/pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly pricingService: PricingService,
  ) {}

  @Post()
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new category' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update category' })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Put(':id/markup')
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update category markup',
    description: 'Updates category markup and triggers price recalculation for all products in the category that rely on it',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category markup updated and prices recalculated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Category markup updated and 15 prices recalculated' },
        category: { type: 'object' },
        productsUpdated: { type: 'number', example: 15 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategoryMarkup(
    @Param('id') id: string,
    @Body() updateMarkupDto: UpdateMarkupDto,
  ) {
    // Update the category markup
    const category = await this.categoriesService.update(id, {
      defaultMarkup: updateMarkupDto.markup,
    });

    // Trigger price recalculation for products in this category
    const productsUpdated = await this.pricingService.recalculatePricesForCategory(id);

    return {
      message: `Category markup updated and ${productsUpdated} prices recalculated`,
      category,
      productsUpdated,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
