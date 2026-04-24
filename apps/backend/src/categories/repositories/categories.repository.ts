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
    const data = await this.prisma.rubros.findUnique({
      where: { id },
      include: {
        rubros: true, // parent
        other_rubros: true, // children
      },
    });

    return data ? Category.fromPersistence(data) : null;
  }

  /**
   * Find a category by name.
   * @returns Category entity or null if not found
   */
  async findByName(name: string): Promise<Category | null> {
    const data = await this.prisma.rubros.findFirst({
      where: { nombre: name },
      include: {
        rubros: true, // parent
        other_rubros: true, // children
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
      where.parent_id = params.parentId;
    }

    if (params?.isActive !== undefined) {
      where.activo = params.isActive;
    }

    const data = await this.prisma.rubros.findMany({
      where,
      include: {
        rubros: true, // parent
        other_rubros: true, // children
        _count: {
          select: { productos: true },
        },
      },
      orderBy: {
        nombre: 'asc',
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

    const data = await this.prisma.rubros.create({
      data: {
        nombre: dto.name,
        descripcion: dto.description,
        parent_id: dto.parentId,
        default_markup: dto.defaultMarkup,
        activo: dto.isActive ?? true,
      },
      include: {
        rubros: true, // parent
        other_rubros: true, // children
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

    const data = await this.prisma.rubros.update({
      where: { id },
      data: {
        nombre: dto.name,
        descripcion: dto.description,
        parent_id: dto.parentId,
        default_markup: dto.defaultMarkup,
        activo: dto.isActive,
      },
      include: {
        rubros: true, // parent
        other_rubros: true, // children
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

    const data = await this.prisma.rubros.update({
      where: { id },
      data: {
        activo: false,
      },
      include: {
        rubros: true, // parent
        other_rubros: true, // children
      },
    });

    return Category.fromPersistence(data);
  }

  /**
   * Save a domain entity back to the database.
   * Useful when business logic modifies the entity.
   */
  async save(category: Category): Promise<Category> {
    const data = await this.prisma.rubros.update({
      where: { id: category.id },
      data: {
        nombre: category.name,
        descripcion: category.description,
        parent_id: category.parentId,
        activo: category.isActive,
        updated_at: category.updatedAt,
      },
      include: {
        rubros: true, // parent
        other_rubros: true, // children
      },
    });

    return Category.fromPersistence(data);
  }
}
