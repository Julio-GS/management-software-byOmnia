import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { MovementType } from './entities/inventory-movement.entity';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryMovementEvent } from '../shared/events';

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
