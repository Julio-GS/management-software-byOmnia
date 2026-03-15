import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

/**
 * CategoriesRepository
 * 
 * Abstracts data access for Categories.
 * Converts between Prisma models and domain entities.
 */
@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a category by ID.
   * @returns Category entity or null if not found
   */
  async findById(id: string): Promise<Category | null> {
    const data = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    return data ? Category.fromPersistence(data) : null;
  }

  /**
   * Find a category by name.
   * @returns Category entity or null if not found
   */
  async findByName(name: string): Promise<Category | null> {
    const data = await this.prisma.category.findUnique({
      where: { name },
      include: {
        parent: true,
        children: true,
      },
    });

    return data ? Category.fromPersistence(data) : null;
  }

  /**
   * Find all categories with optional filters.
   */
  async findAll(params?: {
    parentId?: string;
    isActive?: boolean;
  }): Promise<Category[]> {
    const where: any = {};

    if (params?.parentId !== undefined) {
      where.parentId = params.parentId;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const data = await this.prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return data.map((item) => Category.fromPersistence(item));
  }

  /**
   * Create a new category.
   * @throws ConflictException if category name already exists
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    // Check name uniqueness
    const existingName = await this.findByName(dto.name);
    if (existingName) {
      throw new ConflictException(`Category with name ${dto.name} already exists`);
    }

    const data = await this.prisma.category.create({
      data: dto,
      include: {
        parent: true,
        children: true,
      },
    });

    return Category.fromPersistence(data);
  }

  /**
   * Update an existing category.
   * @throws NotFoundException if category not found
   * @throws ConflictException if name conflicts
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    // Check if category exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check name uniqueness if updating name
    if (dto.name && dto.name !== existing.name) {
      const existingName = await this.findByName(dto.name);
      if (existingName && existingName.id !== id) {
        throw new ConflictException(`Category with name ${dto.name} already exists`);
      }
    }

    const data = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: {
        parent: true,
        children: true,
      },
    });

    return Category.fromPersistence(data);
  }

  /**
   * Soft delete a category (set isActive to false).
   * @throws NotFoundException if category not found
   */
  async softDelete(id: string): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const data = await this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return Category.fromPersistence(data);
  }

  /**
   * Save a domain entity back to the database.
   * Useful when business logic modifies the entity.
   */
  async save(category: Category): Promise<Category> {
    const data = await this.prisma.category.update({
      where: { id: category.id },
      data: {
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        isActive: category.isActive,
        updatedAt: category.updatedAt,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return Category.fromPersistence(data);
  }
}
