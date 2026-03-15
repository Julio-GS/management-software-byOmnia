import { Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Product } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { CreateMovementDto } from '../dto/create-movement.dto';
import { StockAdjustmentDto } from '../dto/stock-adjustment.dto';

/**
 * InventoryRepository
 * 
 * Abstracts data access for Inventory Movements.
 * Converts between Prisma models and domain entities.
 * Handles all Prisma interactions for inventory operations.
 */
@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new inventory movement and update product stock atomically.
   * @throws NotFoundException if product not found
   */
  async createMovement(
    dto: CreateMovementDto,
    previousStock: number,
    newStock: number,
  ): Promise<InventoryMovement> {
    // Use transaction to ensure atomic stock update + movement creation
    const data = await this.prisma.$transaction(async (prisma) => {
      // Update product stock
      await prisma.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
      });

      // Create movement record
      const movement = await prisma.inventoryMovement.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.quantity,
          previousStock,
          newStock,
          reason: dto.reason,
          reference: dto.reference,
          notes: dto.notes,
          userId: dto.userId,
          deviceId: dto.deviceId,
        },
        include: {
          product: true,
          user: true,
        },
      });

      return movement;
    });

    return InventoryMovement.fromPersistence(data);
  }

  /**
   * Create a stock adjustment movement and update product stock atomically.
   * @throws NotFoundException if product not found
   */
  async adjustStock(
    dto: StockAdjustmentDto,
    previousStock: number,
  ): Promise<InventoryMovement> {
    const difference = dto.newStock - previousStock;

    const data = await this.prisma.$transaction(async (prisma) => {
      // Update product stock
      await prisma.product.update({
        where: { id: dto.productId },
        data: { stock: dto.newStock },
      });

      // Create adjustment movement record
      const movement = await prisma.inventoryMovement.create({
        data: {
          productId: dto.productId,
          type: MovementType.ADJUSTMENT,
          quantity: difference,
          previousStock,
          newStock: dto.newStock,
          reason: dto.reason,
          userId: dto.userId,
        },
        include: {
          product: true,
          user: true,
        },
      });

      return movement;
    });

    return InventoryMovement.fromPersistence(data);
  }

  /**
   * Find a product by ID.
   * @returns Product data or null if not found
   */
  async findProductById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
    }) as Promise<Product | null>;
  }

  /**
   * Get movement history for a specific product.
   * @throws NotFoundException if product not found
   */
  async getProductHistory(productId: string, limit?: number): Promise<InventoryMovement[]> {
    const data = await this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: {
        product: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return data.map((item) => InventoryMovement.fromPersistence(item));
  }

  /**
   * Get all movements with optional filters.
   */
  async getAllMovements(params?: {
    type?: MovementType;
    startDate?: Date;
    endDate?: Date;
    productId?: string;
  }): Promise<InventoryMovement[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.productId) {
      where.productId = params.productId;
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    const data = await this.prisma.inventoryMovement.findMany({
      where,
      include: {
        product: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return data.map((item) => InventoryMovement.fromPersistence(item));
  }

  /**
   * Get current stock level for a product.
   * @throws NotFoundException if product not found
   */
  async getCurrentStock(productId: string): Promise<number> {
    const product = await this.findProductById(productId);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return product.stock;
  }

  /**
   * Get products with low stock (below minimum threshold).
   * Products are considered "low stock" when: stock <= minStock
   * @param threshold Optional custom threshold to use instead of minStock
   */
  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    // Use raw SQL for this query since Prisma doesn't support column comparisons
    const query = threshold !== undefined
      ? `SELECT * FROM products WHERE stock <= $1 AND "isActive" = true ORDER BY stock ASC`
      : `SELECT * FROM products WHERE stock <= "minStock" AND "isActive" = true ORDER BY stock ASC`;

    const params = threshold !== undefined ? [threshold] : [];
    
    return this.prisma.$queryRawUnsafe<Product[]>(query, ...params);
  }
}
