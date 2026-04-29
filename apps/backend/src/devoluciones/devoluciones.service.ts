import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../database/prisma.service';
import { DevolucionesRepository } from './repositories/devoluciones.repository';
import { BusinessException } from '../shared/exceptions/business.exception';
import { DevolucionCreatedEvent } from '../shared/events';
import { CreateDevolucionDto, FilterDevolucionesDto, DevolucionResponseDto } from './dto';
import { Prisma } from '@prisma/client';

/**
 * DevolucionesService - Business logic for product returns/refunds
 * 
 * Implements critical business rules:
 * 1. Validate cantidad disponible (cantidad_devolver <= cantidad_vendida - SUM(devoluciones_previas))
 * 2. Return product to SAME lote it came from
 * 3. Calculate monto_devuelto with discount applied proportionally
 * 4. Handle multiple partial returns
 * 5. Reject returns from cancelled sales (anulada = true)
 * 6. Create movimiento_stock to increment stock
 */
@Injectable()
export class DevolucionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: DevolucionesRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Validate that cantidad_devolver is within available cantidad
   * Business Rule: cantidad_devolver <= cantidad_vendida - SUM(devoluciones_previas)
   */
  async validateCantidadDisponible(
    ventaId: string,
    productoId: string,
    cantidadDevolver: number,
  ): Promise<void> {
    const result = await this.prisma.$queryRaw<
      Array<{ cantidad_vendida: number; cantidad_ya_devuelta: number; disponible: number }>
    >`
      SELECT 
        dv.cantidad AS cantidad_vendida,
        COALESCE(SUM(d.cantidad), 0) AS cantidad_ya_devuelta,
        (dv.cantidad - COALESCE(SUM(d.cantidad), 0)) AS disponible
      FROM detalle_ventas dv
      LEFT JOIN devoluciones d 
        ON dv.venta_id = d.venta_id 
        AND dv.producto_id = d.producto_id
      WHERE dv.venta_id = ${ventaId}::uuid 
        AND dv.producto_id = ${productoId}::uuid
      GROUP BY dv.cantidad
    `;

    if (!result.length || Number(result[0].disponible) < cantidadDevolver) {
      throw new BusinessException(
        `Cantidad no disponible para devolución. Máximo disponible: ${
          result[0]?.disponible || 0
        }`,
        'CANTIDAD_NO_DISPONIBLE',
        {
          disponible: result[0]?.disponible || 0,
          solicitado: cantidadDevolver,
        },
      );
    }
  }

  /**
   * Get the original lote_id from detalle_venta
   * Business Rule: Product returns to the SAME lote it came from
   */
  async getLoteOriginal(ventaId: string, productoId: string): Promise<string | null> {
    const detalleVenta = await this.prisma.detalle_ventas.findFirst({
      where: { venta_id: ventaId, producto_id: productoId },
      select: { lote_id: true },
    });

    return detalleVenta?.lote_id || null;
  }

  /**
   * Calculate monto_devuelto with discount applied proportionally
   * Business Rule: monto = (total / cantidad) * cantidad_devolver
   * where total already includes discount: total = subtotal - descuento
   */
  async calcularMontoDevuelto(
    ventaId: string,
    productoId: string,
    cantidadDevolver: number,
  ): Promise<number> {
    const detalleVenta = await this.prisma.detalle_ventas.findFirst({
      where: { venta_id: ventaId, producto_id: productoId },
    });

    if (!detalleVenta) {
      throw new NotFoundException('Producto no encontrado en venta');
    }

    // Precio con descuento aplicado = total / cantidad
    const precioConDescuento = Number(detalleVenta.total) / Number(detalleVenta.cantidad);

    return precioConDescuento * cantidadDevolver;
  }

  /**
   * Create a new devolucion with full transaction flow
   * 
   * Transaction steps:
   * 1. Validate venta exists and is not anulada
   * 2. Validate cantidad disponible
   * 3. Get lote original
   * 4. Calculate monto devuelto
   * 5. Create devolucion record
   * 6. Create movimiento_stock (tipo: 'devolucion', cantidad positive)
   * 7. Emit DevolucionCreatedEvent
   */
  async createDevolucion(
    dto: CreateDevolucionDto,
    userId: string,
  ): Promise<DevolucionResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        // STEP 1: Validate venta exists and is not anulada
        const venta = await tx.ventas.findUnique({
          where: { id: dto.venta_id },
        });

        if (!venta) {
          throw new NotFoundException('Venta no encontrada');
        }

        if (venta.anulada) {
          throw new BusinessException(
            'No se puede devolver producto de una venta anulada',
            'VENTA_ANULADA',
          );
        }

        // STEP 2: Validate cantidad disponible
        await this.validateCantidadDisponible(dto.venta_id, dto.producto_id, dto.cantidad);

        // STEP 3: Get lote original (producto vuelve al MISMO lote)
        const loteId = await this.getLoteOriginal(dto.venta_id, dto.producto_id);

        // STEP 4: Calculate monto devuelto (with discount applied)
        const montoDevuelto = await this.calcularMontoDevuelto(
          dto.venta_id,
          dto.producto_id,
          dto.cantidad,
        );

        // STEP 5: Create devolucion
        const devolucion = await tx.devoluciones.create({
          data: {
            venta_id: dto.venta_id,
            producto_id: dto.producto_id,
            lote_id: loteId,
            cantidad: dto.cantidad,
            monto_devuelto: montoDevuelto,
            tipo_devolucion: dto.tipo_devolucion,
            medio_devolucion: dto.medio_devolucion,
            usuario_id: userId,
            motivo: dto.motivo,
            observaciones: dto.observaciones,
          },
        });

        // STEP 6: Create movimiento_stock (devolucion incrementa stock)
        await tx.movimientos_stock.create({
          data: {
            producto_id: dto.producto_id,
            lote_id: loteId,
            tipo_movimiento: 'devolucion',
            cantidad: dto.cantidad, // Positive quantity (increments stock)
            referencia: `Devolucion venta ${venta.numero_ticket}`,
            venta_id: dto.venta_id,
            usuario_id: userId,
          },
        });

        // STEP 7: Emit event
        this.eventBus.publish(
          new DevolucionCreatedEvent(
            devolucion.id,
            devolucion.venta_id,
            devolucion.producto_id,
            devolucion.lote_id,
            Number(devolucion.cantidad),
            Number(devolucion.monto_devuelto),
            devolucion.tipo_devolucion,
            devolucion.fecha || new Date(),
            userId,
          ),
        );

        // STEP 8: Return response with relations
        const devolucionCompleta = await this.repository.findById(devolucion.id);
        return this.mapToResponseDto(devolucionCompleta!);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 5000,
      },
    );
  }

  /**
   * Find all devoluciones with filters
   */
  async findAll(filters: FilterDevolucionesDto) {
    return this.repository.findAll(filters);
  }

  /**
   * Find devolucion by ID
   */
  async findOne(id: string) {
    const devolucion = await this.repository.findById(id);

    if (!devolucion) {
      throw new NotFoundException(`Devolucion con ID ${id} no encontrada`);
    }

    return devolucion;
  }

  /**
   * Find all devoluciones for a specific venta
   */
  async findByVenta(ventaId: string) {
    return this.repository.findByVenta(ventaId);
  }

  /**
   * Map Devolucion entity to response DTO
   */
  private mapToResponseDto(devolucion: any): DevolucionResponseDto {
    return {
      devolucion: {
        id: devolucion.id,
        venta_id: devolucion.venta_id,
        producto_id: devolucion.producto_id,
        lote_id: devolucion.lote_id,
        cantidad: Number(devolucion.cantidad),
        monto_devuelto: Number(devolucion.monto_devuelto),
        tipo_devolucion: devolucion.tipo_devolucion,
        medio_devolucion: devolucion.medio_devolucion,
        motivo: devolucion.motivo,
        observaciones: devolucion.observaciones,
        fecha: devolucion.fecha,
        usuario_id: devolucion.usuario_id,
      },
      producto: {
        codigo: devolucion.productos?.codigo,
        detalle: devolucion.productos?.detalle,
      },
      venta: devolucion.ventas
        ? {
            numero_ticket: devolucion.ventas.numero_ticket,
          }
        : undefined,
      lote: devolucion.lotes
        ? {
            numero_lote: devolucion.lotes.numero_lote,
          }
        : null,
    };
  }
}
