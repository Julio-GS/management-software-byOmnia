import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    // Validate items array
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    // Generate unique sale number
    const saleNumber = await this.generateSaleNumber();

    // Use transaction to create sale, items, and update stock atomically
    return this.prisma.$transaction(async (prisma) => {
      // Validate stock availability and calculate totals
      let subtotal = 0;
      let taxAmount = 0;

      const itemsData = [];

      for (const item of createSaleDto.items) {
        // Fetch product with stock check
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`Product ${product.name} is not active`);
        }

        // Check stock availability
        if (product.stock < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        // Calculate item totals
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemDiscount = item.discount || 0;
        const itemTaxAmount = ((itemSubtotal - itemDiscount) * Number(product.taxRate)) / 100;
        const itemTotal = itemSubtotal - itemDiscount + itemTaxAmount;

        subtotal += itemSubtotal;
        taxAmount += itemTaxAmount;

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
          taxAmount: itemTaxAmount,
          discount: itemDiscount,
          totalAmount: itemTotal,
        });

        // Update product stock
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Calculate final totals
      const discountAmount = createSaleDto.discountAmount || 0;
      const totalAmount = subtotal - discountAmount + taxAmount;

      // Create sale with items
      const sale = await prisma.sale.create({
        data: {
          saleNumber,
          totalAmount,
          subtotal,
          taxAmount,
          discountAmount,
          paymentMethod: createSaleDto.paymentMethod,
          customerId: createSaleDto.customerId,
          customerName: createSaleDto.customerName,
          customerEmail: createSaleDto.customerEmail,
          notes: createSaleDto.notes,
          cashierId: createSaleDto.cashierId,
          deviceId: createSaleDto.deviceId,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return sale;
    });
  }

  async findAll(params?: { status?: string; startDate?: Date; endDate?: Date }) {
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
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

    return this.prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async findBySaleNumber(saleNumber: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { saleNumber },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with number ${saleNumber} not found`);
    }

    return sale;
  }

  async cancel(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundException(`Sale ${id} not found`);
      }

      if (sale.status !== 'completed') {
        throw new ConflictException(
          `Sale ${sale.saleNumber} cannot be cancelled: current status is ${sale.status}`,
        );
      }

      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) continue; // defensive: product deleted after sale

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

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

      return tx.sale.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
          items: {
            include: { product: true },
          },
        },
      });
    });
  }

  private async generateSaleNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `SALE-${year}${month}${day}`;

    // Get the count of sales today
    const count = await this.prisma.sale.count({
      where: {
        saleNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }
}
