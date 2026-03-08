/**
 * Product Domain Entity
 * 
 * Represents the core business concept of a Product in the Omnia Management System.
 * Encapsulates business rules and validation logic.
 */
export class Product {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null,
    public sku: string,
    public barcode: string | null,
    private _price: number,
    private _cost: number,
    public markup: number | null,
    private _stock: number,
    public minStock: number,
    public maxStock: number | null,
    public categoryId: string | null,
    public isActive: boolean,
    public taxRate: number,
    public imageUrl: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null = null,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new Product from user input.
   */
  static create(params: {
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    price: number;
    cost: number;
    markup?: number;
    stock?: number;
    minStock?: number;
    maxStock?: number;
    categoryId?: string;
    taxRate?: number;
    imageUrl?: string;
    isActive?: boolean;
  }): Product {
    return new Product(
      crypto.randomUUID(),
      params.name,
      params.description ?? null,
      params.sku,
      params.barcode ?? null,
      params.price,
      params.cost,
      params.markup ?? null,
      params.stock ?? 0,
      params.minStock ?? 0,
      params.maxStock ?? null,
      params.categoryId ?? null,
      params.isActive ?? true,
      params.taxRate ?? 0,
      params.imageUrl ?? null,
      new Date(),
      new Date(),
      null,
    );
  }

  /**
   * Factory method to reconstruct a Product from persistence (Prisma).
   */
  static fromPersistence(data: any): Product {
    return new Product(
      data.id,
      data.name,
      data.description,
      data.sku,
      data.barcode,
      // Convert Prisma Decimal to number
      typeof data.price === 'object' ? Number(data.price) : data.price,
      typeof data.cost === 'object' ? Number(data.cost) : data.cost,
      data.markup ? (typeof data.markup === 'object' ? Number(data.markup) : data.markup) : null,
      data.stock,
      data.minStock,
      data.maxStock,
      data.categoryId,
      data.isActive,
      typeof data.taxRate === 'object' ? Number(data.taxRate) : data.taxRate,
      data.imageUrl,
      data.createdAt,
      data.updatedAt,
      data.deletedAt,
    );
  }

  // Getters
  get price(): number {
    return this._price;
  }

  get cost(): number {
    return this._cost;
  }

  get stock(): number {
    return this._stock;
  }

  /**
   * Calculate profit margin percentage.
   */
  getProfitMargin(): number {
    if (this._cost === 0) return 0;
    return ((this._price - this._cost) / this._cost) * 100;
  }

  /**
   * Calculate final price with tax.
   */
  getPriceWithTax(): number {
    return this._price * (1 + this.taxRate / 100);
  }

  /**
   * Check if product is low on stock.
   */
  isLowStock(): boolean {
    return this._stock <= this.minStock;
  }

  /**
   * Check if product is out of stock.
   */
  isOutOfStock(): boolean {
    return this._stock === 0;
  }

  /**
   * Check if product can be sold (active and has stock).
   */
  canBeSold(): boolean {
    return this.isActive && this._stock > 0;
  }

  /**
   * Update product price.
   */
  updatePrice(newPrice: number): void {
    this.validatePrice(newPrice);
    this._price = newPrice;
    this.updatedAt = new Date();
  }

  /**
   * Update product cost.
   */
  updateCost(newCost: number): void {
    this.validateCost(newCost);
    this._cost = newCost;
    this.updatedAt = new Date();
  }

  /**
   * Update pricing (both cost and price).
   */
  updatePricing(newCost: number, newPrice: number): void {
    this.validateCost(newCost);
    this.validatePrice(newPrice);
    this._cost = newCost;
    this._price = newPrice;
    this.updatedAt = new Date();
  }

  /**
   * Add stock quantity.
   * @throws Error if resulting stock exceeds maxStock
   */
  addStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const newStock = this._stock + quantity;

    if (this.maxStock !== null && newStock > this.maxStock) {
      throw new Error(`Cannot add stock: would exceed maximum stock (${this.maxStock})`);
    }

    this._stock = newStock;
    this.updatedAt = new Date();
  }

  /**
   * Remove stock quantity.
   * @throws Error if insufficient stock
   */
  removeStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (this._stock < quantity) {
      throw new Error(`Insufficient stock: available ${this._stock}, requested ${quantity}`);
    }

    this._stock -= quantity;
    this.updatedAt = new Date();
  }

  /**
   * Set stock to exact value (for inventory adjustments).
   */
  setStock(newStock: number): void {
    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }

    if (this.maxStock !== null && newStock > this.maxStock) {
      throw new Error(`Stock cannot exceed maximum stock (${this.maxStock})`);
    }

    this._stock = newStock;
    this.updatedAt = new Date();
  }

  /**
   * Update product details.
   */
  update(changes: {
    name?: string;
    description?: string;
    barcode?: string;
    markup?: number;
    minStock?: number;
    maxStock?: number;
    categoryId?: string;
    taxRate?: number;
    imageUrl?: string;
  }): void {
    if (changes.name !== undefined) {
      this.name = changes.name;
    }
    if (changes.description !== undefined) {
      this.description = changes.description;
    }
    if (changes.barcode !== undefined) {
      this.barcode = changes.barcode;
    }
    if (changes.markup !== undefined) {
      this.markup = changes.markup;
    }
    if (changes.minStock !== undefined) {
      this.minStock = changes.minStock;
    }
    if (changes.maxStock !== undefined) {
      this.maxStock = changes.maxStock;
    }
    if (changes.categoryId !== undefined) {
      this.categoryId = changes.categoryId;
    }
    if (changes.taxRate !== undefined) {
      this.validateTaxRate(changes.taxRate);
      this.taxRate = changes.taxRate;
    }
    if (changes.imageUrl !== undefined) {
      this.imageUrl = changes.imageUrl;
    }

    this.updatedAt = new Date();
  }

  /**
   * Activate product.
   */
  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * Deactivate product (soft delete).
   */
  deactivate(): void {
    this.isActive = false;
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Validate all business rules.
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Product name is required');
    }

    if (!this.sku || this.sku.trim().length === 0) {
      throw new Error('Product SKU is required');
    }

    this.validatePrice(this._price);
    this.validateCost(this._cost);

    if (this._stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    if (this.minStock < 0) {
      throw new Error('Minimum stock cannot be negative');
    }

    if (this.maxStock !== null && this.maxStock < this.minStock) {
      throw new Error('Maximum stock cannot be less than minimum stock');
    }

    this.validateTaxRate(this.taxRate);
  }

  /**
   * Validate price value.
   */
  private validatePrice(price: number): void {
    if (price < 0) {
      throw new Error('Price cannot be negative');
    }
  }

  /**
   * Validate cost value.
   */
  private validateCost(cost: number): void {
    if (cost < 0) {
      throw new Error('Cost cannot be negative');
    }
  }

  /**
   * Validate tax rate.
   */
  private validateTaxRate(taxRate: number): void {
    if (taxRate < 0 || taxRate > 100) {
      throw new Error('Tax rate must be between 0 and 100');
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
      sku: this.sku,
      barcode: this.barcode,
      price: this._price,
      cost: this._cost,
      markup: this.markup,
      stock: this._stock,
      minStock: this.minStock,
      maxStock: this.maxStock,
      categoryId: this.categoryId,
      isActive: this.isActive,
      taxRate: this.taxRate,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
