import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { Devolucion } from '../entities/devolucion.entity';
import { FilterDevolucionesDto } from '../dto';

/**
 * DevolucionesRepository - Repository for devoluciones (refunds/returns)
 * 
 * Abstracts Prisma queries for devoluciones table.
 * Handles all database operations related to product returns.
 */
@Injectable()
export class DevolucionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all devoluciones with filters and pagination
   */
  async findAll(filters: FilterDevolucionesDto): Promise<{ data: Devolucion[]; total: number }> {
    const { page = 1, limit = 20, venta_id, producto_id, tipo_devolucion, fecha_desde, fecha_hasta } = filters;

    const where: Prisma.devolucionesWhereInput = {};

    if (venta_id) {
      where.venta_id = venta_id;
    }

    if (producto_id) {
      where.producto_id = producto_id;
    }

    if (tipo_devolucion) {
      where.tipo_devolucion = tipo_devolucion;
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) {
        where.fecha.gte = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        where.fecha.lte = new Date(fecha_hasta);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.devoluciones.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          productos: { select: { codigo: true, detalle: true } },
          ventas: { select: { numero_ticket: true } },
          usuarios: { select: { username: true } },
        },
      }),
      this.prisma.devoluciones.count({ where }),
    ]);

    return {
      data: data.map((item) => Devolucion.fromPersistence(item)),
      total,
    };
  }

  /**
   * Find devolucion by ID with all relations
   */
  async findById(id: string): Promise<Devolucion | null> {
    const data = await this.prisma.devoluciones.findUnique({
      where: { id },
      include: {
        productos: true,
        ventas: true,
        lotes: { select: { numero_lote: true } },
        usuarios: { select: { username: true } },
      },
    });

    return data ? Devolucion.fromPersistence(data) : null;
  }

  /**
   * Find all devoluciones for a specific venta
   */
  async findByVenta(ventaId: string): Promise<Devolucion[]> {
    const data = await this.prisma.devoluciones.findMany({
      where: { venta_id: ventaId },
      orderBy: { fecha: 'desc' },
      include: {
        productos: { select: { codigo: true, detalle: true } },
      },
    });

    return data.map((item) => Devolucion.fromPersistence(item));
  }

  /**
   * Get total cantidad devuelta for a producto in a venta
   * Used for validating available cantidad for new devoluciones
   */
  async getTotalDevuelto(ventaId: string, productoId: string): Promise<number> {
    const result = await this.prisma.devoluciones.aggregate({
      where: { venta_id: ventaId, producto_id: productoId },
      _sum: { cantidad: true },
    });

    return Number(result._sum.cantidad) || 0;
  }

  /**
   * Create a new devolucion within a transaction
   * @param data - Devolucion data to create
   * @param tx - Prisma transaction client
   */
  async create(
    data: {
      venta_id: string;
      producto_id: string;
      lote_id: string | null;
      cantidad: number;
      monto_devuelto: number;
      tipo_devolucion: string;
      medio_devolucion: string;
      usuario_id: string;
      motivo: string;
      observaciones?: string | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<Devolucion> {
    const devolucion = await tx.devoluciones.create({
      data: {
        venta_id: data.venta_id,
        producto_id: data.producto_id,
        lote_id: data.lote_id,
        cantidad: data.cantidad,
        monto_devuelto: data.monto_devuelto,
        tipo_devolucion: data.tipo_devolucion,
        medio_devolucion: data.medio_devolucion,
        usuario_id: data.usuario_id,
        motivo: data.motivo,
        observaciones: data.observaciones,
      },
    });

    return Devolucion.fromPersistence(devolucion);
  }
}
