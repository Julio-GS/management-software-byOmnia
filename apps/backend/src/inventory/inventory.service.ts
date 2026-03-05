import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovement(createMovementDto: CreateMovementDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createMovementDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${createMovementDto.productId} not found`);
    }

    // Calculate new stock based on movement type
    const previousStock = product.stock;
    let newStock = previousStock;

    switch (createMovementDto.type) {
      case 'in':
        newStock = previousStock + createMovementDto.quantity;
        break;
      case 'out':
        newStock = previousStock - createMovementDto.quantity;
        if (newStock < 0) {
          throw new BadRequestException('Insufficient stock for OUT movement');
        }
        break;
      case 'adjustment':
      case 'transfer':
        newStock = previousStock + createMovementDto.quantity;
        break;
      default:
        throw new BadRequestException(`Invalid movement type: ${createMovementDto.type}`);
    }

    // Use transaction to update stock and create movement record atomically
    return this.prisma.$transaction(async (prisma) => {
      // Update product stock
      await prisma.product.update({
        where: { id: createMovementDto.productId },
        data: { stock: newStock },
      });

      // Create movement record
      const movement = await prisma.inventoryMovement.create({
        data: {
          productId: createMovementDto.productId,
          type: createMovementDto.type,
          quantity: createMovementDto.quantity,
          previousStock,
          newStock,
          reason: createMovementDto.reason,
          reference: createMovementDto.reference,
          notes: createMovementDto.notes,
          userId: createMovementDto.userId,
          deviceId: createMovementDto.deviceId,
        },
        include: {
          product: true,
        },
      });

      return movement;
    });
  }

  async getProductHistory(productId: string, limit?: number) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async adjustStock(adjustmentDto: StockAdjustmentDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: adjustmentDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${adjustmentDto.productId} not found`);
    }

    if (adjustmentDto.newStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    const previousStock = product.stock;
    const difference = adjustmentDto.newStock - previousStock;

    // Use transaction to update stock and create movement record
    return this.prisma.$transaction(async (prisma) => {
      // Update product stock
      await prisma.product.update({
        where: { id: adjustmentDto.productId },
        data: { stock: adjustmentDto.newStock },
      });

      // Create adjustment movement record
      const movement = await prisma.inventoryMovement.create({
        data: {
          productId: adjustmentDto.productId,
          type: 'adjustment',
          quantity: difference,
          previousStock,
          newStock: adjustmentDto.newStock,
          reason: adjustmentDto.reason,
        },
        include: {
          product: true,
        },
      });

      return movement;
    });
  }

  async getAllMovements(params?: { type?: string; startDate?: Date; endDate?: Date }) {
    const where: any = {};

    if (params?.type) {
      where.type = params.type;
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

    return this.prisma.inventoryMovement.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
