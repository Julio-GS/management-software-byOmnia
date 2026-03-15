import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesRepository } from './repositories/categories.repository';
import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
} from '../shared/events';

/**
 * CategoriesService
 * 
 * Implements business logic for category management.
 * Uses repository pattern for data access and EventBus for cross-module communication.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly repository: CategoriesRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Create a new category.
   * Emits CategoryCreatedEvent for other modules to react.
   */
  async create(createCategoryDto: CreateCategoryDto) {
    // Repository handles uniqueness validation
    const category = await this.repository.create(createCategoryDto);

    // Emit event for sync module and other interested parties
    this.eventBus.publish(
      new CategoryCreatedEvent(
        category.id,
        category.name,
        category.description,
      ),
    );

    return category.toJSON();
  }

  /**
   * Find all categories with optional filters.
   */
  async findAll(params?: { parentId?: string; isActive?: boolean }) {
    const categories = await this.repository.findAll(params);
    return categories.map((c) => c.toJSON());
  }

  /**
   * Find a single category by ID.
   * @throws NotFoundException if category not found
   */
  async findOne(id: string) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category.toJSON();
  }

  /**
   * Update a category.
   * Emits CategoryUpdatedEvent for other modules to react.
   * @throws NotFoundException if category not found
   * @throws ConflictException if name conflicts
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Repository handles validation and uniqueness checks
    const category = await this.repository.update(id, updateCategoryDto);

    // Emit event for sync module
    this.eventBus.publish(
      new CategoryUpdatedEvent(category.id, {
        name: category.name,
        description: category.description,
      }),
    );

    return category.toJSON();
  }

  /**
   * Soft delete a category (deactivate).
   * Emits CategoryDeletedEvent for other modules to react.
   * @throws NotFoundException if category not found
   */
  async remove(id: string) {
    // Repository handles soft delete
    const category = await this.repository.softDelete(id);

    // Emit event for sync module
    this.eventBus.publish(
      new CategoryDeletedEvent(category.id, category.name),
    );

    return category.toJSON();
  }
}
