import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventBus } from '@nestjs/cqrs';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ISalesRepository } from './repositories/sales.repository.interface';
import { SaleCreatedEvent } from '../shared/events/sale-created.event';
import { SaleCancelledEvent } from '../shared/events/sale-cancelled.event';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('ISalesRepository') private readonly salesRepository: ISalesRepository,
    private readonly eventBus: EventBus,
  ) {}

  async create(createSaleDto: CreateSaleDto) {
    // Validate items array
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    const saleNumber = await this.generateSaleNumber();

    // Create sale using repository
    const sale = await this.salesRepository.create({
      saleNumber,
      items: createSaleDto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
        productName: '', // Will be populated by repository
      })),
      total: createSaleDto.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
      paymentMethod: createSaleDto.paymentMethod,
      status: 'COMPLETED',
      userId: createSaleDto.cashierId,
    });

    // Emit event for sync module
    this.eventBus.publish(
      new SaleCreatedEvent(
        sale.id,
        sale.saleNumber,
        sale.total,
        sale.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotal,
        })),
        sale.paymentMethod,
        sale.createdAt,
        createSaleDto.cashierId,
      ),
    );

    return sale.toJSON();
  }

  async findAll(params?: { status?: string; startDate?: Date; endDate?: Date }) {
    const sales = await this.salesRepository.findAll(params);
    return sales.map((sale) => sale.toJSON());
  }

  async findOne(id: string) {
    const sale = await this.salesRepository.findById(id);

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
    const sale = await this.salesRepository.cancel(id, userId);

    // Emit event for sync module
    this.eventBus.publish(
      new SaleCancelledEvent(
        sale.id,
        'Cancelled by user',
        new Date(),
        userId,
      ),
    );

    return sale.toJSON();
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
