import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../models';
import { nonEmptyString } from '../utils/validators';

export class CategoriesRepository extends BaseRepository<Category, CreateCategoryDTO, UpdateCategoryDTO> {
  constructor(db: Database.Database) {
    super(db, 'categories');
  }

  /**
   * Find category by name
   */
  public findByName(name: string): Category | null {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM categories WHERE name = ? AND is_deleted = 0 LIMIT 1'
      );
      const result = stmt.get(name) as Category | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Failed to find category by name: ${(error as Error).message}`);
    }
  }

  /**
   * Get all categories ordered by name
   */
  public getAllOrdered(): Category[] {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM categories WHERE is_deleted = 0 ORDER BY name ASC'
      );
      return stmt.all() as Category[];
    } catch (error) {
      throw new Error(`Failed to get ordered categories: ${(error as Error).message}`);
    }
  }

  /**
   * Count products in category
   */
  public countProducts(categoryId: string): number {
    try {
      const stmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_deleted = 0'
      );
      const result = stmt.get(categoryId) as { count: number };
      return result.count;
    } catch (error) {
      throw new Error(`Failed to count products in category: ${(error as Error).message}`);
    }
  }

  /**
   * Validate category data before create/update
   */
  protected validateCategoryData(data: CreateCategoryDTO | UpdateCategoryDTO): void {
    if ('name' in data && data.name) {
      nonEmptyString(data.name, 'Category name');
    }
  }

  public override create(data: CreateCategoryDTO): Category {
    this.validateCategoryData(data);
    
    // Check for duplicate name
    const existing = this.findByName(data.name);
    if (existing) {
      throw new Error(`Category with name "${data.name}" already exists`);
    }

    return super.create(data);
  }

  public override update(id: string, data: UpdateCategoryDTO): Category | null {
    this.validateCategoryData(data);
    
    // Check for duplicate name if name is being updated
    if (data.name) {
      const existing = this.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new Error(`Category with name "${data.name}" already exists`);
      }
    }

    return super.update(id, data);
  }

  /**
   * Override delete to prevent deletion of categories with products
   */
  public override delete(id: string): boolean {
    const productCount = this.countProducts(id);
    if (productCount > 0) {
      throw new Error(`Cannot delete category with ${productCount} products. Remove or reassign products first.`);
    }
    return super.delete(id);
  }
}
