import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { BulkMovementDto, BulkMovementResponseDto, BulkMovementError } from './dto/bulk-movement.dto';
import { MovementType } from './entities/inventory-movement.entity';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryMovementEvent, PriceChangedEvent } from '../shared/events';

/**
 * InventoryService
 * 
 * Implements business logic for inventory management.
 * Uses repository pattern for data access and EventBus for cross-module communication.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly repository: InventoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Create a new inventory movement.
   * Calculates new stock based on movement type and updates product stock atomically.
   * Emits InventoryMovementEvent for other modules to react.
   * @throws NotFoundException if product not found
   * @throws BadRequestException for invalid movement type
   */
  async createMovement(createMovementDto: CreateMovementDto) {
    // Verify product exists and get current stock
    const product = await this.repository.findProductById(createMovementDto.productId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${createMovementDto.productId} not found`);
    }

    // Calculate new stock based on movement type
    const previousStock = product.stock;
    let newStock = previousStock;

    switch (createMovementDto.type) {
      case 'ENTRY':
        newStock = previousStock + Math.abs(createMovementDto.quantity);
        break;
      case 'EXIT':
        newStock = previousStock - Math.abs(createMovementDto.quantity);
        // ALLOW negative stock (offline scenarios where sync lag causes temporary negative stock)
        if (newStock < 0) {
          this.logger.warn(
            `Stock for product ${createMovementDto.productId} went negative: ${newStock}`,
          );
        }
        break;
      case 'ADJUSTMENT':
        // For adjustments, quantity can be positive or negative
        newStock = previousStock + createMovementDto.quantity;
        break;
      default:
        throw new BadRequestException(`Invalid movement type: ${createMovementDto.type}`);
    }

    // Create movement using repository (handles transaction)
    const movement = await this.repository.createMovement(
      createMovementDto,
      previousStock,
      newStock,
    );

    // Emit event for sync module and other interested parties
    this.eventBus.publish(
      new InventoryMovementEvent(
        movement.productId,
        movement.quantity,
        this.mapMovementTypeToEventType(movement.type),
        movement.reason,
        movement.newStock,
      ),
    );

    return movement.toJSON();
  }

  /**
   * Adjust stock to a specific value.
   * Creates an ADJUSTMENT movement with the difference.
   * Emits InventoryMovementEvent for other modules to react.
   * @throws NotFoundException if product not found
   */
  async adjustStock(adjustmentDto: StockAdjustmentDto) {
    // Verify product exists and get current stock
    const product = await this.repository.findProductById(adjustmentDto.productId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${adjustmentDto.productId} not found`);
    }

    const previousStock = product.stock;

    // Allow negative stock (offline scenarios)
    if (adjustmentDto.newStock < 0) {
      this.logger.warn(
        `Stock adjustment for product ${adjustmentDto.productId} resulted in negative stock: ${adjustmentDto.newStock}`,
      );
    }

    // Create adjustment using repository (handles transaction)
    const movement = await this.repository.adjustStock(adjustmentDto, previousStock);

    // Emit event for sync module
    this.eventBus.publish(
      new InventoryMovementEvent(
        movement.productId,
        movement.quantity,
        'ADJUSTMENT',
        movement.reason,
        movement.newStock,
      ),
    );

    return movement.toJSON();
  }

  /**
   * Get movement history for a specific product.
   * @throws NotFoundException if product not found
   */
  async getProductHistory(productId: string, limit?: number) {
    // Verify product exists (repository throws if not found)
    const product = await this.repository.findProductById(productId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const movements = await this.repository.getProductHistory(productId, limit);
    return movements.map((m) => m.toJSON());
  }

  /**
   * Get all movements with optional filters.
   */
  async getAllMovements(params?: {
    type?: MovementType;
    startDate?: Date;
    endDate?: Date;
    productId?: string;
  }) {
    const movements = await this.repository.getAllMovements(params);
    return movements.map((m) => m.toJSON());
  }

  /**
   * Get products with low stock (below minimum threshold).
   * @param threshold Optional custom threshold (defaults to product's minStock value)
   */
  async getLowStockProducts(threshold?: number) {
    return this.repository.getLowStockProducts(threshold);
  }

  async createBulkMovement(bulkDto: BulkMovementDto): Promise<BulkMovementResponseDto> {
    const movements: Record<string, unknown>[] = [];
    const errors: BulkMovementError[] = [];

    if (!bulkDto.items?.length) {
      throw new BadRequestException('At least one item is required');
    }

    if (bulkDto.items.length > 100) {
      throw new BadRequestException('Maximum 100 items allowed per request');
    }

    const productIds = bulkDto.items.map(item => item.productId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      throw new BadRequestException('Duplicate product IDs are not allowed');
    }

    const continueOnError = bulkDto.continueOnError ?? false;

    for (const item of bulkDto.items) {
      if (item.enabled === false) {
        continue;
      }

      try {
        const product = await this.repository.findProductById(item.productId);
        if (!product) {
          const error: BulkMovementError = {
            productId: item.productId,
            error: 'Product not found',
            code: 'PRODUCT_NOT_FOUND'
          };
          errors.push(error);
          if (!continueOnError) {
            break;
          }
          continue;
        }

        let newStock: number;
        let movementType: MovementType;
        let quantity: number;

        if (item.setStockTo !== undefined) {
          newStock = Math.max(0, item.setStockTo);
          movementType = 'ADJUSTMENT';
          quantity = newStock - product.stock;
        } else if (item.stockQuantity !== undefined) {
          movementType = item.movementType || (item.stockQuantity > 0 ? 'ENTRY' : 'EXIT');
          const absQuantity = Math.abs(item.stockQuantity);
          quantity = item.stockQuantity;

          if (movementType === 'ENTRY') {
            newStock = product.stock + absQuantity;
          } else if (movementType === 'EXIT') {
            newStock = Math.max(0, product.stock - absQuantity);
          } else {
            newStock = product.stock + item.stockQuantity;
          }
        } else {
          newStock = product.stock;
          movementType = 'ADJUSTMENT';
          quantity = 0;
        }

        // Handle price change (independent of stock)
        const currentPrice = Number(product.price);
        const newPrice = item.newPrice !== undefined ? item.newPrice : currentPrice;
        const priceChanged = item.newPrice !== undefined && item.newPrice !== currentPrice;

        const movement = await this.repository.createMovementWithPrice(
          {
            productId: item.productId,
            type: movementType,
            quantity,
            reason: bulkDto.reason,
            reference: bulkDto.reference,
            notes: bulkDto.notes,
          },
          product.stock,
          newStock,
          newPrice
        );

        movements.push(movement.toJSON());

        if (priceChanged) {
          this.eventBus.publish(
            new PriceChangedEvent(
              item.productId,
              currentPrice,
              item.newPrice!,
              bulkDto.reason || 'Bulk adjustment'
            )
          );
        }

      } catch (error) {
        const err: BulkMovementError = {
          productId: item.productId,
          error: error.message || 'Unknown error',
          code: 'PROCESSING_ERROR'
        };
        errors.push(err);

        if (!continueOnError) {
          break;
        }
      }
    }

    for (const movement of movements) {
      this.eventBus.publish(
        new InventoryMovementEvent(
          movement['productId'] as string,
          movement['quantity'] as number,
          this.mapMovementTypeToEventType(movement['type'] as MovementType),
          movement['reason'] as string,
          movement['newStock'] as number
        )
      );
    }

    return {
      success: errors.length === 0,
      movements,
      errors,
      processedCount: movements.length,
      failedCount: errors.length,
      message: errors.length === 0
        ? `Successfully processed ${movements.length} items`
        : `Processed ${movements.length} items, ${errors.length} failed`
    };
  }

  /**
   * Map MovementType to event type string.
   */
  private mapMovementTypeToEventType(type: MovementType): 'IN' | 'OUT' | 'ADJUSTMENT' {
    switch (type) {
      case 'ENTRY':
        return 'IN';
      case 'EXIT':
        return 'OUT';
      case 'ADJUSTMENT':
        return 'ADJUSTMENT';
      default:
        return 'ADJUSTMENT';
    }
  }
}
