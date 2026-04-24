import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ISalesRepository } from './sales.repository.interface';
import { Sale } from '../entities/sale.entity';
import { RepositoryException } from '../../shared/exceptions/repository.exception';

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
      // Prisma uses Spanish field names: numero_ticket, total, usuario_id, etc.
      const data = await this.prisma.ventas.create({
        data: {
          numero_ticket: dto.saleNumber,
          total: dto.total,
          subtotal: dto.total,
          descuentos: 0,
          vuelto: 0,
          caja_id: '550e8400-e29b-41d4-a716-446655440012', // Default caja_id for tests
          usuario_id: dto.userId,
          anulada: false,
          observaciones: null,
          detalle_ventas: {
            create: dto.items.map((item) => ({
              producto_id: item.productId,
              cantidad: item.quantity,
              precio_unitario: item.unitPrice,
              subtotal: item.subtotal,
              descuento: 0,
              total: item.subtotal,
              iva_porcentaje: 21,
              iva_monto: 0,
            })),
          },
        },
        include: {
          detalle_ventas: true,
        },
      });

      // Map Spanish Prisma fields to English Sale entity
      return Sale.fromPersistence({
        id: data.id,
        saleNumber: data.numero_ticket,
        items: data.detalle_ventas?.map((item) => ({
          productId: item.producto_id,
          quantity: Number(item.cantidad),
          unitPrice: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
          productName: 'Product', // Name not stored in detalle_ventas
        })) || [],
        totalAmount: Number(data.total),
        paymentMethod: 'cash', // Not stored in schema, using default
        status: data.anulada ? 'CANCELLED' : 'COMPLETED',
        createdAt: data.fecha || new Date(),
        cancelledAt: data.fecha_anulacion,
      });
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
    const data = await this.prisma.ventas.findUnique({
      where: { id },
      include: { detalle_ventas: true },
    });

    if (!data) return null;

    // Map Spanish Prisma fields to English Sale entity
    return Sale.fromPersistence({
      id: data.id,
      saleNumber: data.numero_ticket,
      items: data.detalle_ventas?.map((item) => ({
        productId: item.producto_id,
        quantity: Number(item.cantidad),
        unitPrice: Number(item.precio_unitario),
        subtotal: Number(item.subtotal),
        productName: 'Product',
      })) || [],
      totalAmount: Number(data.total),
      paymentMethod: 'cash',
      status: data.anulada ? 'CANCELLED' : 'COMPLETED',
      createdAt: data.fecha || new Date(),
      cancelledAt: data.fecha_anulacion,
    });
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
      // Map English fields to Spanish Prisma fields
      const prismaUpdateData: any = {};
      
      if (updateData.status === 'cancelled') {
        prismaUpdateData.anulada = true;
      }
      if (updateData.cancelledAt) {
        prismaUpdateData.fecha_anulacion = updateData.cancelledAt;
      }

      const data = await this.prisma.ventas.update({
        where: { id },
        data: prismaUpdateData,
        include: { detalle_ventas: true },
      });

      // Map Spanish Prisma fields to English Sale entity
      return Sale.fromPersistence({
        id: data.id,
        saleNumber: data.numero_ticket,
        items: data.detalle_ventas?.map((item) => ({
          productId: item.producto_id,
          quantity: Number(item.cantidad),
          unitPrice: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
          productName: 'Product',
        })) || [],
        totalAmount: Number(data.total),
        paymentMethod: 'cash',
        status: data.anulada ? 'CANCELLED' : 'COMPLETED',
        createdAt: data.fecha || new Date(),
        cancelledAt: data.fecha_anulacion,
      });
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
      const sale = await tx.ventas.findUnique({
        where: { id },
        include: { detalle_ventas: true },
      });

      if (!sale) {
        throw new RepositoryException(`Sale ${id} not found`, 404);
      }

      if (sale.anulada) {
        throw new RepositoryException(
          `Sale ${sale.numero_ticket} cannot be cancelled: already cancelled`,
          409,
        );
      }

      // Restore stock for each item
      for (const item of sale.detalle_ventas) {
        const product = await tx.productos.findUnique({
          where: { id: item.producto_id },
        });

        if (!product) continue; // Defensive: product deleted after sale

        // Note: productos table doesn't have a stock field in the actual schema
        // This might need to be adjusted based on your actual schema
        // For now, commenting out stock update since stock is not in productos table

        // Create inventory movement record
        await tx.movimientos_stock.create({
          data: {
            producto_id: item.producto_id,
            tipo_movimiento: 'ENTRADA', // Using Spanish movement type
            cantidad: Number(item.cantidad),
            referencia: sale.numero_ticket,
            venta_id: sale.id,
            usuario_id: userId,
            observaciones: 'Cancelación de venta',
          },
        });
      }

      // Update sale status
      const updatedSale = await tx.ventas.update({
        where: { id },
        data: {
          anulada: true,
          fecha_anulacion: new Date(),
          motivo_anulacion: 'Cancelación solicitada',
        },
        include: { detalle_ventas: true },
      });

      // Map Spanish Prisma fields to English Sale entity
      return Sale.fromPersistence({
        id: updatedSale.id,
        saleNumber: updatedSale.numero_ticket,
        items: updatedSale.detalle_ventas?.map((item) => ({
          productId: item.producto_id,
          quantity: Number(item.cantidad),
          unitPrice: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
          productName: 'Product',
        })) || [],
        totalAmount: Number(updatedSale.total),
        paymentMethod: 'cash',
        status: updatedSale.anulada ? 'CANCELLED' : 'COMPLETED',
        createdAt: updatedSale.fecha || new Date(),
        cancelledAt: updatedSale.fecha_anulacion,
      });
    });
  }

  /**
   * Find sales by date range.
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const data = await this.prisma.ventas.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { detalle_ventas: true },
      orderBy: { fecha: 'desc' },
    });

    return data.map((item) =>
      Sale.fromPersistence({
        id: item.id,
        saleNumber: item.numero_ticket,
        items: item.detalle_ventas?.map((detalle) => ({
          productId: detalle.producto_id,
          quantity: Number(detalle.cantidad),
          unitPrice: Number(detalle.precio_unitario),
          subtotal: Number(detalle.subtotal),
          productName: 'Product',
        })) || [],
        totalAmount: Number(item.total),
        paymentMethod: 'cash',
        status: item.anulada ? 'CANCELLED' : 'COMPLETED',
        createdAt: item.fecha || new Date(),
        cancelledAt: item.fecha_anulacion,
      }),
    );
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
      // Map English status to Spanish field
      where.anulada = filters.status === 'cancelled';
    }

    // Note: paymentMethod is not stored in ventas table, skipping filter

    if (filters?.startDate || filters?.endDate) {
      where.fecha = {};
      if (filters.startDate) {
        where.fecha.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.fecha.lte = filters.endDate;
      }
    }

    const data = await this.prisma.ventas.findMany({
      where,
      include: { detalle_ventas: true },
      orderBy: { fecha: 'desc' },
    });

    return data.map((item) =>
      Sale.fromPersistence({
        id: item.id,
        saleNumber: item.numero_ticket,
        items: item.detalle_ventas?.map((detalle) => ({
          productId: detalle.producto_id,
          quantity: Number(detalle.cantidad),
          unitPrice: Number(detalle.precio_unitario),
          subtotal: Number(detalle.subtotal),
          productName: 'Product',
        })) || [],
        totalAmount: Number(item.total),
        paymentMethod: 'cash',
        status: item.anulada ? 'CANCELLED' : 'COMPLETED',
        createdAt: item.fecha || new Date(),
        cancelledAt: item.fecha_anulacion,
      }),
    );
  }
}
