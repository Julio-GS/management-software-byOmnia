/**
 * Category Domain Entity
 * 
 * Represents the core business concept of a Category in the Omnia Management System.
 * Encapsulates business rules and validation logic.
 */
export class Category {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null,
    public parentId: string | null,
    public isActive: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new Category from user input.
   */
  static create(params: {
    name: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
  }): Category {
    return new Category(
      crypto.randomUUID(),
      params.name,
      params.description ?? null,
      params.parentId ?? null,
      params.isActive ?? true,
      new Date(),
      new Date(),
    );
  }

  /**
   * Factory method to reconstruct a Category from persistence (Prisma).
   */
  static fromPersistence(data: any): Category {
    return new Category(
      data.id,
      data.name,
      data.description,
      data.parentId,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );
  }

  /**
   * Update category details.
   */
  update(changes: {
    name?: string;
    description?: string;
    parentId?: string;
  }): void {
    if (changes.name !== undefined) {
      this.validateName(changes.name);
      this.name = changes.name;
    }
    if (changes.description !== undefined) {
      this.description = changes.description;
    }
    if (changes.parentId !== undefined) {
      this.parentId = changes.parentId;
    }

    this.updatedAt = new Date();
  }

  /**
   * Activate category.
   */
  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * Deactivate category (soft delete).
   */
  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Check if category can be deleted (has no products).
   * This is a business rule that should be enforced at the repository level.
   */
  canBeDeleted(): boolean {
    return this.isActive;
  }

  /**
   * Validate all business rules.
   */
  private validate(): void {
    this.validateName(this.name);
  }

  /**
   * Validate category name.
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (name.length > 100) {
      throw new Error('Category name cannot exceed 100 characters');
    }
  }

  /**
   * Convert to plain object for API responses.
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      parentId: this.parentId,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
