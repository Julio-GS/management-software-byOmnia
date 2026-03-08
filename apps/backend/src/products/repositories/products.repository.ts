import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

/**
 * ProductsRepository
 * 
 * Abstracts data access for Products.
 * Converts between Prisma models and domain entities.
 */
@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a product by ID.
   * @returns Product entity or null if not found
   */
  async findById(id: string): Promise<Product | null> {
    const data = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    return data ? Product.fromPersistence(data) : null;
  }

  /**
   * Find a product by SKU.
   * @returns Product entity or null if not found
   */
  async findBySku(sku: string): Promise<Product | null> {
    const data = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
      },
    });

    return data ? Product.fromPersistence(data) : null;
  }

  /**
   * Find a product by barcode.
   * @returns Product entity or null if not found
   */
  async findByBarcode(barcode: string): Promise<Product | null> {
    const data = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
      },
    });

    return data ? Product.fromPersistence(data) : null;
  }

  /**
   * Find all products with optional filters.
   */
  async findAll(params?: {
    categoryId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<Product[]> {
    const where: any = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
        { barcode: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const data = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return data.map((item) => Product.fromPersistence(item));
  }

  /**
   * Find products with low stock.
   */
  async findLowStock(): Promise<Product[]> {
    // Use raw query to compare stock with minStock column
    const data = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM products
      WHERE "isActive" = true
      AND stock <= "minStock"
      ORDER BY stock ASC
    `;

    return data.map((item) => Product.fromPersistence(item));
  }

  /**
   * Create a new product.
   * @throws ConflictException if SKU or barcode already exists
   */
  async create(dto: CreateProductDto): Promise<Product> {
    // Check SKU uniqueness
    const existingSku = await this.findBySku(dto.sku);
    if (existingSku) {
      throw new ConflictException(`Product with SKU ${dto.sku} already exists`);
    }

    // Check barcode uniqueness (if provided)
    if (dto.barcode) {
      const existingBarcode = await this.findByBarcode(dto.barcode);
      if (existingBarcode) {
        throw new ConflictException(`Product with barcode ${dto.barcode} already exists`);
      }
    }

    const data = await this.prisma.product.create({
      data: dto,
      include: {
        category: true,
      },
    });

    return Product.fromPersistence(data);
  }

  /**
   * Update an existing product.
   * @throws NotFoundException if product not found
   * @throws ConflictException if SKU or barcode conflicts
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    // Check if product exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check SKU uniqueness if updating SKU
    if (dto.sku && dto.sku !== existing.sku) {
      const existingSku = await this.findBySku(dto.sku);
      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(`Product with SKU ${dto.sku} already exists`);
      }
    }

    // Check barcode uniqueness if updating barcode
    if (dto.barcode && dto.barcode !== existing.barcode) {
      const existingBarcode = await this.findByBarcode(dto.barcode);
      if (existingBarcode && existingBarcode.id !== id) {
        throw new ConflictException(`Product with barcode ${dto.barcode} already exists`);
      }
    }

    const data = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });

    return Product.fromPersistence(data);
  }

  /**
   * Soft delete a product (set isActive to false).
   * @throws NotFoundException if product not found
   */
  async softDelete(id: string): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const data = await this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: {
        category: true,
      },
    });

    return Product.fromPersistence(data);
  }

  /**
   * Update product stock.
   * @throws NotFoundException if product not found
   * @throws ConflictException if resulting stock is negative
   */
  async updateStock(id: string, quantity: number): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const newStock = existing.stock + quantity;
    if (newStock < 0) {
      throw new ConflictException('Insufficient stock');
    }

    const data = await this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
      include: {
        category: true,
      },
    });

    return Product.fromPersistence(data);
  }

  /**
   * Save a domain entity back to the database.
   * Useful when business logic modifies the entity.
   */
  async save(product: Product): Promise<Product> {
    const data = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        cost: product.cost,
        markup: product.markup,
        stock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        categoryId: product.categoryId,
        isActive: product.isActive,
        taxRate: product.taxRate,
        imageUrl: product.imageUrl,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
      },
      include: {
        category: true,
      },
    });

    return Product.fromPersistence(data);
  }
}
