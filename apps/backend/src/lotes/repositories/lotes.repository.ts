import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Lote } from '../entities/lote.entity';

/**
 * LotesRepository - Repository for lotes
 * 
 * Abstracts Prisma queries for lotes table.
 */
@Injectable()
export class LotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new lote
   */
  async create(dto: {
    producto_id: string;
    numero_lote?: string;
    fecha_vencimiento?: Date;
    cantidad_inicial: number;
  }): Promise<Lote> {
    // Generate numero_lote if not provided
    const numeroLote = dto.numero_lote 
      ?? `LOTE-${dto.producto_id.substring(0, 8).toUpperCase()}-${Date.now()}`;

    // Validate fecha_vencimiento is future
    if (dto.fecha_vencimiento && dto.fecha_vencimiento < new Date()) {
      throw new ConflictException('Expiration date must be in the future');
    }

    const data = await this.prisma.lotes.create({
      data: {
        producto_id: dto.producto_id,
        numero_lote: numeroLote,
        fecha_vencimiento: dto.fecha_vencimiento,
        cantidad_inicial: dto.cantidad_inicial,
        cantidad_actual: dto.cantidad_inicial,
        activo: true,
      },
    });

    return Lote.fromPersistence(data);
  }

  /**
   * Find all lotes with filters
   */
  async findAll(filters: {
    producto_id?: string;
    activo?: boolean;
    solo_con_stock?: boolean;
  }): Promise<Lote[]> {
    const { producto_id, activo, solo_con_stock } = filters;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (producto_id) {
      where.producto_id = producto_id;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (solo_con_stock) {
      where.cantidad_actual = { gt: 0 };
    }

    const data = await this.prisma.lotes.findMany({
      where,
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return data.map((item) => Lote.fromPersistence(item));
  }

  /**
   * Find lote by ID
   */
  async findById(id: string): Promise<Lote | null> {
    const data = await this.prisma.lotes.findUnique({
      where: { id },
    });

    return data ? Lote.fromPersistence(data) : null;
  }

  /**
   * Find lots by product with stock (for FEFO)
   */
  async findByProductoWithStock(producto_id: string): Promise<Lote[]> {
    const data = await this.prisma.lotes.findMany({
      where: {
        producto_id,
        activo: true,
        cantidad_actual: { gt: 0 },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return data.map((item) => Lote.fromPersistence(item));
  }

  /**
   * Update a lote
   */
  async update(
    id: string,
    dto: {
      numero_lote?: string;
      fecha_vencimiento?: Date;
      cantidad_actual?: number;
      activo?: boolean;
    },
  ): Promise<Lote> {
    const existing = await this.prisma.lotes.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Lote with ID ${id} not found`);
    }

    // Validate fecha_vencimiento is future if provided
    if (dto.fecha_vencimiento && dto.fecha_vencimiento < new Date()) {
      throw new ConflictException('Expiration date must be in the future');
    }

    const data = await this.prisma.lotes.update({
      where: { id },
      data: {
        numero_lote: dto.numero_lote,
        fecha_vencimiento: dto.fecha_vencimiento,
        cantidad_actual: dto.cantidad_actual,
        activo: dto.activo,
      },
    });

    return Lote.fromPersistence(data);
  }

  /**
   * Update stock in lote (deduct for sales)
   */
  async updateStock(id: string, cantidad: number): Promise<Lote> {
    const data = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.lotes.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Lote with ID ${id} not found`);
      }

      const newCantidad = existing.cantidad_actual + cantidad;
      
      if (newCantidad < 0) {
        throw new ConflictException('Insufficient stock in lote');
      }

      return tx.lotes.update({
        where: { id },
        data: { cantidad_actual: newCantidad },
      });
    });

    return Lote.fromPersistence(data);
  }

  /**
   * Soft delete a lote
   */
  async softDelete(id: string): Promise<Lote> {
    const data = await this.prisma.lotes.update({
      where: { id },
      data: { activo: false },
    });

    return Lote.fromPersistence(data);
  }

  /**
   * Find lots expiring within days
   */
  async findProximosVencer(dias: number): Promise<Lote[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + dias);

    const data = await this.prisma.lotes.findMany({
      where: {
        activo: true,
        fecha_vencimiento: {
          lte: deadline,
          gte: new Date(),
        },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return data.map((item) => Lote.fromPersistence(item));
  }

  /**
   * Find expired lots
   */
  async findVencidos(): Promise<Lote[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await this.prisma.lotes.findMany({
      where: {
        activo: true,
        fecha_vencimiento: {
          lt: today,
        },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return data.map((item) => Lote.fromPersistence(item));
  }
}