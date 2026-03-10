import Database from 'better-sqlite3';
import { ProductsRepository, InventoryRepository, CreateInventoryMovementDTO } from '@omnia/local-db';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * Inventory movement types
 */
export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

/**
 * Parameters for creating an inventory movement
 */
export interface CreateMovementParams {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
  userId?: string;
}

/**
 * Result of creating an inventory movement
 */
export interface MovementResult {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  createdAt: string;
}

/**
 * Local inventory service - handles stock movements offline
 * 
 * Manages inventory movements (ENTRY, EXIT, ADJUSTMENT) and updates product stock atomically
 */
export class LocalInventoryService {
  private productsRepo: ProductsRepository;
  private inventoryRepo: InventoryRepository;
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.productsRepo = new ProductsRepository(db);
    this.inventoryRepo = new InventoryRepository(db);
  }

  /**
   * Create an inventory movement and update product stock
   * 
   * Movement types:
   * - ENTRY: Add stock (e.g., purchase, return from customer)
   * - EXIT: Remove stock (e.g., sale, damaged goods)
   * - ADJUSTMENT: Direct stock correction (can be + or -)
   * 
   * @param params Movement parameters
   * @returns Movement result with previous and new stock
   */
  async createMovement(params: CreateMovementParams): Promise<MovementResult> {
    try {
      const { productId, type, quantity, reason, reference, notes, userId } = params;

      // Validate product exists
      const product = this.productsRepo.findById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Calculate new stock based on movement type
      const previousStock = product.stock;
      const newStock = this.calculateNewStock(previousStock, type, quantity);

      // Validate new stock is not negative
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current: ${previousStock}, Requested: ${quantity}`);
      }

      // Use transaction to ensure atomicity
      const movement = this.db.transaction(() => {
        // Update product stock
        this.productsRepo.updateStock(productId, newStock);

        // Create movement record
        const movementData: CreateInventoryMovementDTO = {
          productId,
          type,
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason,
          reference,
          notes,
          userId,
        };

        const created = this.inventoryRepo.create(movementData);
        return created;
      })();

      logger.info(
        `Created ${type} movement for product ${productId}: ${previousStock} -> ${newStock}`
      );

      return {
        id: movement.id,
        productId: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        previousStock,
        newStock,
        createdAt: movement.createdAt,
      };
    } catch (error) {
      logger.error('Failed to create inventory movement:', error);
      throw new Error(`Failed to create inventory movement: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate new stock based on movement type
   * 
   * @param currentStock Current product stock
   * @param type Movement type (ENTRY, EXIT, ADJUSTMENT)
   * @param quantity Quantity to move
   * @returns New stock value
   */
  calculateNewStock(currentStock: number, type: MovementType, quantity: number): number {
    switch (type) {
      case 'ENTRY':
        // Add to stock
        return currentStock + quantity;
      
      case 'EXIT':
        // Subtract from stock
        return currentStock - quantity;
      
      case 'ADJUSTMENT':
        // Direct adjustment (quantity can be signed)
        // For now, we treat ADJUSTMENT as adding the quantity
        // In a more sophisticated system, quantity could be negative for reductions
        return currentStock + quantity;
      
      default:
        throw new Error(`Invalid movement type: ${type}`);
    }
  }

  /**
   * Get movement history for a product
   * 
   * @param productId Product ID
   * @param limit Maximum number of movements to return
   * @returns Array of movements, most recent first
   */
  async getMovements(productId: string, limit?: number): Promise<MovementResult[]> {
    try {
      const movements = this.inventoryRepo.findByProductId(productId, limit);

      return movements.map((m) => ({
        id: m.id,
        productId: m.productId,
        type: m.type,
        quantity: m.quantity,
        previousStock: 0, // Not stored in current schema
        newStock: 0, // Not stored in current schema
        createdAt: m.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get inventory movements:', error);
      throw new Error(`Failed to get inventory movements: ${(error as Error).message}`);
    }
  }

  /**
   * Get current stock for a product
   * 
   * @param productId Product ID
   * @returns Current stock quantity
   */
  async getCurrentStock(productId: string): Promise<number> {
    try {
      const product = this.productsRepo.findById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }
      return product.stock;
    } catch (error) {
      logger.error('Failed to get current stock:', error);
      throw new Error(`Failed to get current stock: ${(error as Error).message}`);
    }
  }

  /**
   * Get movements by type in a date range
   * 
   * @param type Movement type
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   * @returns Array of movements
   */
  async getMovementsByType(
    type: MovementType,
    startDate?: string,
    endDate?: string
  ): Promise<MovementResult[]> {
    try {
      const movements = this.inventoryRepo.findByType(type, startDate, endDate);

      return movements.map((m) => ({
        id: m.id,
        productId: m.productId,
        type: m.type,
        quantity: m.quantity,
        previousStock: 0,
        newStock: 0,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get movements by type:', error);
      throw new Error(`Failed to get movements by type: ${(error as Error).message}`);
    }
  }
}
