import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ISalesRepository } from './sales.repository.interface';
import { Sale } from '../entities/sale.entity';
import { RepositoryException } from '../../shared/exceptions/repository.exception';
import { MovementType } from '@prisma/client';

/**
 * SalesRepository
 * 
 * Concrete implementation of ISalesRepository using Prisma.
 * Handles data persistence for Sales with transaction support.
 */
@Injectable()
export class SalesRepository implements ISalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new sale.
   * @throws RepositoryException on database errors
   */
  async create(dto: {
    saleNumber: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      productName: string;
    }>;
    total: number;
    paymentMethod: string;
    status: string;
    userId?: string;
  }): Promise<Sale> {
    try {
      const data = await this.prisma.sale.create({
        data: {
          saleNumber: dto.saleNumber,
          totalAmount: dto.total,
          subtotal: dto.total,
          taxAmount: 0,
          discountAmount: 0,
          paymentMethod: dto.paymentMethod,
          status: dto.status,
          cashierId: dto.userId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              taxAmount: 0,
              discount: 0,
              totalAmount: item.subtotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return Sale.fromPersistence(data);
    } catch (error) {
      throw new RepositoryException(
        'Failed to create sale',
        500,
        { originalError: error instanceof Error ? error.message : 'Unknown error' },
      );
    }
  }

  /**
   * Find a sale by ID.
   * @returns Sale entity or null if not found
   */
  async findById(id: string): Promise<Sale | null> {
    const data = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    return data ? Sale.fromPersistence(data) : null;
  }

  /**
   * Update an existing sale.
   * @throws RepositoryException if sale not found or on database errors
   */
  async update(
    id: string,
    updateData: Partial<{
      status: string;
      cancelledAt: Date;
    }>,
  ): Promise<Sale> {
    try {
      const data = await this.prisma.sale.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });

      return Sale.fromPersistence(data);
    } catch (error) {
      throw new RepositoryException(
        'Failed to update sale',
        500,
        { originalError: error instanceof Error ? error.message : 'Unknown error' },
      );
    }
  }

  /**
   * Cancel a sale (updates status and sets cancelledAt).
   * Restores stock and creates inventory movements.
   * @throws RepositoryException if sale not found or already cancelled
   */
  async cancel(id: string, userId: string): Promise<Sale> {
    return this.prisma.$transaction(async (tx) => {
      // Fetch sale with items
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) {
        throw new RepositoryException(`Sale ${id} not found`, 404);
      }

      if (sale.status !== 'completed') {
        throw new RepositoryException(
          `Sale ${sale.saleNumber} cannot be cancelled: current status is ${sale.status}`,
          409,
        );
      }

      // Restore stock for each item
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) continue; // Defensive: product deleted after sale

        // Increment stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Create inventory movement record
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.ENTRY,
            quantity: item.quantity,
            previousStock: product.stock,
            newStock: product.stock + item.quantity,
            reason: 'Sale cancellation',
            reference: sale.saleNumber,
            userId,
          },
        });
      }

      // Update sale status
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: 'cancelled',
        },
        include: { items: true },
      });

      return Sale.fromPersistence(updatedSale);
    });
  }

  /**
   * Find sales by date range.
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const data = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return data.map((item) => Sale.fromPersistence(item));
  }

  /**
   * Find all sales with optional filters.
   */
  async findAll(filters?: {
    status?: string;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Sale[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const data = await this.prisma.sale.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return data.map((item) => Sale.fromPersistence(item));
  }
}
