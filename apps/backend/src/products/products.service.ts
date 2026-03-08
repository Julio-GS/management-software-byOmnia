import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './repositories/products.repository';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../shared/events';

/**
 * ProductsService
 * 
 * Implements business logic for product management.
 * Uses repository pattern for data access and EventBus for cross-module communication.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly repository: ProductsRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Create a new product.
   * Emits ProductCreatedEvent for other modules to react.
   */
  async create(createProductDto: CreateProductDto) {
    // Repository handles uniqueness validation
    const product = await this.repository.create(createProductDto);

    // Emit event for sync module and other interested parties
    this.eventBus.publish(
      new ProductCreatedEvent(
        product.id,
        product.name,
        product.sku,
        product.barcode,
        product.categoryId,
        product.price,
      ),
    );

    return product.toJSON();
  }

  /**
   * Find all products with optional filters.
   */
  async findAll(params?: { categoryId?: string; isActive?: boolean; search?: string }) {
    const products = await this.repository.findAll(params);
    return products.map((p) => p.toJSON());
  }

  /**
   * Find a single product by ID.
   * @throws NotFoundException if product not found
   */
  async findOne(id: string) {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product.toJSON();
  }

  /**
   * Find a product by SKU.
   * @throws NotFoundException if product not found
   */
  async findBySku(sku: string) {
    const product = await this.repository.findBySku(sku);

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return product.toJSON();
  }

  /**
   * Find a product by barcode.
   * @throws NotFoundException if product not found
   */
  async findByBarcode(barcode: string) {
    const product = await this.repository.findByBarcode(barcode);

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return product.toJSON();
  }

  /**
   * Update a product.
   * Emits ProductUpdatedEvent for other modules to react.
   * @throws NotFoundException if product not found
   * @throws ConflictException if SKU or barcode conflicts
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Repository handles validation and uniqueness checks
    const product = await this.repository.update(id, updateProductDto);

    // Emit event for sync module
    this.eventBus.publish(
      new ProductUpdatedEvent(product.id, {
        name: product.name,
        sku: product.sku,
        basePrice: product.price,
      }),
    );

    return product.toJSON();
  }

  /**
   * Soft delete a product (deactivate).
   * Emits ProductDeletedEvent for other modules to react.
   * @throws NotFoundException if product not found
   */
  async remove(id: string) {
    // Repository handles soft delete
    const product = await this.repository.softDelete(id);

    // Emit event for sync module
    this.eventBus.publish(new ProductDeletedEvent(product.id, product.sku));

    return product.toJSON();
  }

  /**
   * Update product stock.
   * Uses domain entity business logic for stock validation.
   * @throws NotFoundException if product not found
   * @throws ConflictException if insufficient stock
   */
  async updateStock(id: string, quantity: number) {
    // Get product entity
    const product = await this.repository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Use domain entity business logic
    if (quantity > 0) {
      product.addStock(quantity);
    } else if (quantity < 0) {
      product.removeStock(Math.abs(quantity));
    }
    // If quantity is 0, do nothing

    // Save updated entity
    const updatedProduct = await this.repository.save(product);

    // Emit event for sync module
    this.eventBus.publish(
      new ProductUpdatedEvent(updatedProduct.id, {
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        basePrice: updatedProduct.price,
      }),
    );

    return updatedProduct.toJSON();
  }

  /**
   * Get products with low stock.
   */
  async getLowStockProducts() {
    const products = await this.repository.findLowStock();
    return products.map((p) => p.toJSON());
  }
}
