import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockMovement, TipoMovimiento } from '../entities/inventory-movement.entity';
import { LotesRepository } from '../../lotes/repositories/lotes.repository';

interface CreateMovimientoParams {
  producto_id: string;
  lote_id?: string;
  tipo_movimiento: string;
  cantidad: number;
  referencia?: string;
  observaciones?: string;
  usuario_id?: string;
}

/**
 * InventoryRepository - Repository for movimientos_stock
 * 
 * Abstracts Prisma queries using Spanish field names.
 * Integrates with LotesModule for stock management.
 */
@Injectable()
export class InventoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lotesRepository: LotesRepository,
  ) {}

  /**
   * Create a stock movement (movimiento_stock)
   * Creates movement record only - stock is managed via LotesModule
   */
  async createMovimiento(dto: CreateMovimientoParams): Promise<StockMovement> {
    const data = await this.prisma.movimientos_stock.create({
      data: {
        producto_id: dto.producto_id,
        lote_id: dto.lote_id,
        tipo_movimiento: dto.tipo_movimiento,
        cantidad: dto.cantidad,
        referencia: dto.referencia,
        observaciones: dto.observaciones,
        usuario_id: dto.usuario_id,
      },
      include: {
        productos: true,
        lotes: true,
      },
    });

    return StockMovement.fromPersistence(data);
  }

  /**
   * Find all movimientos with filters
   */
  async findAll(params?: {
    tipo_movimiento?: string;
    producto_id?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    limit?: number;
    offset?: number;
  }): Promise<StockMovement[]> {
    const where: any = {};

    if (params?.tipo_movimiento) {
      where.tipo_movimiento = params.tipo_movimiento;
    }

    if (params?.producto_id) {
      where.producto_id = params.producto_id;
    }

    if (params?.fecha_inicio || params?.fecha_fin) {
      where.fecha = {};
      if (params.fecha_inicio) {
        where.fecha.gte = params.fecha_inicio;
      }
      if (params.fecha_fin) {
        where.fecha.lte = params.fecha_fin;
      }
    }

    const data = await this.prisma.movimientos_stock.findMany({
      where,
      include: {
        productos: true,
        lotes: true,
      },
      orderBy: { fecha: 'desc' },
      take: params?.limit || 20,
      skip: params?.offset || 0,
    });

    return data.map((item) => StockMovement.fromPersistence(item));
  }

  /**
   * Find movimiento by ID
   */
  async findById(id: string): Promise<StockMovement | null> {
    const data = await this.prisma.movimientos_stock.findUnique({
      where: { id },
      include: {
        productos: true,
        lotes: true,
      },
    });

    return data ? StockMovement.fromPersistence(data) : null;
  }

  /**
   * Get movement history for a producto
   */
  async findByProducto(productoId: string, limit?: number): Promise<StockMovement[]> {
    const data = await this.prisma.movimientos_stock.findMany({
      where: { producto_id: productoId },
      include: {
        productos: true,
        lotes: true,
      },
      orderBy: { fecha: 'desc' },
      take: limit || 20,
    });

    return data.map((item) => StockMovement.fromPersistence(item));
  }

  /**
   * Record entry movement (ENTRADA) - adds stock to lote
   */
  async recordEntrada(
    productoId: string,
    loteId: string,
    cantidad: number,
    params?: {
      referencia?: string;
      observaciones?: string;
      usuario_id?: string;
    },
  ): Promise<StockMovement> {
    // Create movement record
    const movimiento = await this.createMovimiento({
      producto_id: productoId,
      lote_id: loteId,
      tipo_movimiento: 'ENTRADA',
      cantidad,
      referencia: params?.referencia,
      observaciones: params?.observaciones,
      usuario_id: params?.usuario_id,
    });

    // Update lote quantity
    await this.lotesRepository.updateStock(loteId, cantidad);

    return movimiento;
  }

  /**
   * Record adjustment (AJUSTE) - modifies stock directly
   */
  async recordAjuste(
    productoId: string,
    newStock: number,
    params?: {
      lote_id?: string;
      referencia?: string;
      observaciones?: string;
      usuario_id?: string;
    },
  ): Promise<StockMovement> {
    // For products with lotes, need to calculate difference
    if (params?.lote_id) {
      const lote = await this.lotesRepository.findById(params.lote_id);
      if (!lote) {
        throw new NotFoundException(`Lote no encontrado`);
      }

      const diferencia = newStock - lote.cantidad_actual;

      const movimiento = await this.createMovimiento({
        producto_id: productoId,
        lote_id: params.lote_id,
        tipo_movimiento: 'AJUSTE',
        cantidad: diferencia,
        referencia: params?.referencia,
        observaciones: params?.observaciones,
        usuario_id: params?.usuario_id,
      });

      await this.lotesRepository.updateStock(params.lote_id, diferencia);

      return movimiento;
    }

    // For products without lotes - create adjustment with reason
    const movimiento = await this.createMovimiento({
      producto_id: productoId,
      tipo_movimiento: 'AJUSTE',
      cantidad: newStock,
      referencia: params?.referencia,
      observaciones: params?.observaciones,
      usuario_id: params?.usuario_id,
    });

    return movimiento;
  }

  /**
   * Record shrinkage (MERMA)
   */
  async recordMerma(
    productoId: string,
    loteId: string,
    cantidad: number,
    params?: {
      referencia?: string;
      observaciones?: string;
      usuario_id?: string;
    },
  ): Promise<StockMovement> {
    const movimiento = await this.createMovimiento({
      producto_id: productoId,
      lote_id: loteId,
      tipo_movimiento: 'MERMA',
      cantidad,
      referencia: params?.referencia,
      observaciones: params?.observaciones,
      usuario_id: params?.usuario_id,
    });

    // Deduct from lote
    await this.lotesRepository.updateStock(loteId, -cantidad);

    return movimiento;
  }

  /**
   * Get total stock for a producto (from lotes)
   */
  async getTotalStock(productoId: string): Promise<number> {
    const lotes = await this.lotesRepository.findByProductoWithStock(productoId);
    return lotes.reduce((sum, lote) => sum + lote.cantidad_actual, 0);
  }

  /**
   * Find productos with low stock
   * Uses lotes aggregate where cantidad_actual < stock_minimo
   */
  async findLowStock(): Promise<any[]> {
    const productos = await this.prisma.productos.findMany({
      where: { activo: true, maneja_stock: true },
      include: {
        lotes: { where: { activo: true } },
        proveedores: true,
        rubros: true,
      },
    });

    return productos
      .filter((producto) => {
        const totalStock = producto.lotes.reduce(
          (sum, lote) => sum + lote.cantidad_actual,
          0,
        );
        return totalStock < (producto.stock_minimo || 20);
      })
      .map((producto) => ({
        id: producto.id,
        codigo: producto.codigo,
        detalle: producto.detalle,
        stock_minimo: producto.stock_minimo,
        stock_actual: producto.lotes.reduce(
          (sum, lote) => sum + lote.cantidad_actual,
          0,
        ),
      }));
  }

  /**
   * Count movements
   */
  async count(params?: {
    tipo_movimiento?: string;
    producto_id?: string;
  }): Promise<number> {
    const where: any = {};

    if (params?.tipo_movimiento) {
      where.tipo_movimiento = params.tipo_movimiento;
    }

    if (params?.producto_id) {
      where.producto_id = params.producto_id;
    }

    return this.prisma.movimientos_stock.count({ where });
  }
}