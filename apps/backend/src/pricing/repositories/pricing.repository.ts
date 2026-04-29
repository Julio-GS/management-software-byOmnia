import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { UpdatePrecioDto, BulkUpdateItemDto } from '../dto/pricing-crud.dto';

/**
 * PricingRepository
 * 
 * Abstracts data access for pricing operations.
 * Uses Spanish table names: productos, precios_historia, rubros
 */
@Injectable()
export class PricingRepository {
  private readonly logger = new Logger(PricingRepository.name);
  private readonly DEFAULT_GLOBAL_MARKUP = 30; // 30% default

  constructor(private readonly prisma: PrismaService) {}

  // ========== GET METHODS ==========

  /**
   * Get product by ID from Spanish table
   */
  async getProductById(productId: string): Promise<{
    id: string;
    costo: number;
    precio_venta: number;
    iva: number;
    rubro_id: string | null;
    activo: boolean;
  } | null> {
    const producto = await this.prisma.productos.findUnique({
      where: { id: productId },
      select: {
        id: true,
        costo: true,
        precio_venta: true,
        iva: true,
        rubro_id: true,
        activo: true,
      },
    });

    if (!producto) return null;

    return {
      id: producto.id,
      costo: Number(producto.costo),
      precio_venta: Number(producto.precio_venta),
      iva: Number(producto.iva),
      rubro_id: producto.rubro_id,
      activo: producto.activo ?? false,
    };
  }

  /**
   * Get global markup from first rubro (default) or a specific setting
   * For now, returns default. In production, would use a settings table.
   */
  async getGlobalMarkup(): Promise<number> {
    // Try to find a root rubro with default_markup > 0
    const rubro = await this.prisma.rubros.findFirst({
      where: {
        parent_id: null,
        activo: true,
        default_markup: { gt: 0 },
      },
      orderBy: { nivel: 'asc' },
      take: 1,
    });

    if (rubro && Number(rubro.default_markup) > 0) {
      return Number(rubro.default_markup);
    }

    return this.DEFAULT_GLOBAL_MARKUP;
  }

  /**
   * Get product markup from producto record
   * Note: productos table may not have markup field, so we calculate from precio/costo
   */
  async getProductMarkup(productId: string): Promise<{ markup: number | null; rubro_id: string | null } | null> {
    const producto = await this.prisma.productos.findUnique({
      where: { id: productId },
      select: { costo: true, precio_venta: true, rubro_id: true },
    });

    if (!producto) return null;

    const costo = Number(producto.costo);
    const precio = Number(producto.precio_venta);

    // Calculate markup: (precio - costo) / costo * 100
    let markup: number | null = null;
    if (costo > 0 && precio > 0) {
      markup = ((precio - costo) / costo) * 100;
    }

    return {
      markup,
      rubro_id: producto.rubro_id,
    };
  }

  /**
   * Get rubro markup by ID
   */
  async getRubroMarkup(rubroId: string): Promise<number | null> {
    const rubro = await this.prisma.rubros.findUnique({
      where: { id: rubroId },
      select: { default_markup: true },
    });

    if (!rubro || !rubro.default_markup) return null;
    return Number(rubro.default_markup);
  }

  /**
   * Get all products in a rubro without specific custom pricing
   */
  async getProductosInRubro(rubroId: string): Promise<Array<{ id: string; costo: number; precio_venta: number }>> {
    const productos = await this.prisma.productos.findMany({
      where: {
        rubro_id: rubroId,
        activo: true,
      },
      select: { id: true, costo: true, precio_venta: true },
    });

    return productos.map(p => ({
      id: p.id,
      costo: Number(p.costo),
      precio_venta: Number(p.precio_venta),
    }));
  }

  /**
   * Get all products that use global markup (no rubro or rubro without markup)
   */
  async getProductosUsingGlobalMarkup(): Promise<Array<{ id: string; costo: number; precio_venta: number; rubro_id: string | null }>> {
    const productos = await this.prisma.productos.findMany({
      where: {
        activo: true,
        OR: [
          { rubro_id: null },
          {
            rubros: {
              default_markup: null,
            },
          },
        ],
      },
      select: { id: true, costo: true, precio_venta: true, rubro_id: true },
    });

    return productos.map(p => ({
      id: p.id,
      costo: Number(p.costo),
      precio_venta: Number(p.precio_venta),
      rubro_id: p.rubro_id,
    }));
  }

  // ========== PRICE UPDATE METHODS ==========

  /**
   * Update product price/cost with history tracking
   */
  async updatePrice(productId: string, data: UpdatePrecioDto): Promise<void> {
    const producto = await this.getProductById(productId);
    if (!producto) throw new NotFoundException(`Producto ${productId} no encontrado`);

    const updateData: any = {};
    
    if (data.nuevo_costo !== undefined) {
      updateData.costo = new Decimal(data.nuevo_costo);
    }
    
    if (data.nuevo_precio !== undefined) {
      updateData.precio_venta = new Decimal(data.nuevo_precio);
    }

    if (Object.keys(updateData).length === 0) return;

    // Update the product
    await this.prisma.productos.update({
      where: { id: productId },
      data: updateData,
    });

    // Get the updated product to record history
    const updated = await this.getProductById(productId);
    if (!updated) return;

    // Create price history record
    await this.prisma.precios_historia.create({
      data: {
        producto_id: productId,
        precio_anterior: new Decimal(producto.precio_venta),
        costo_anterior: new Decimal(producto.costo),
        precio_nuevo: updated.precio_venta > 0 ? new Decimal(updated.precio_venta) : null,
        costo_nuevo: updated.costo > 0 ? new Decimal(updated.costo) : null,
        motivo: data.motivo || 'Actualización manual',
        tipo_cambio: data.nuevo_costo !== undefined && data.nuevo_precio !== undefined 
          ? 'ambos' 
          : data.nuevo_costo !== undefined 
            ? 'costo' 
            : 'precio',
      },
    });
  }

  /**
   * Bulk update prices
   */
  async bulkUpdatePrices(updates: BulkUpdateItemDto[]): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const item of updates) {
      try {
        await this.updatePrice(item.producto_id, {
          nuevo_costo: item.nuevo_costo,
          nuevo_precio: item.nuevo_precio,
          motivo: item.motivo,
        });
        updated++;
      } catch (error) {
        this.logger.error(`Failed to update price for ${item.producto_id}: ${error}`);
        failed++;
      }
    }

    return { updated, failed };
  }

  /**
   * Set product price directly (for calculated prices from markup)
   */
  async setProductPrice(productId: string, price: number): Promise<void> {
    await this.prisma.productos.update({
      where: { id: productId },
      data: { precio_venta: new Decimal(price) },
    });
  }

  // ========== PRICE HISTORY METHODS ==========

  /**
   * Get price history for a product
   */
  async getPriceHistoryByProduct(productId: string, limit = 20): Promise<Array<{
    id: string;
    producto_id: string;
    precio_anterior: number | null;
    precio_nuevo: number | null;
    costo_anterior: number | null;
    costo_nuevo: number | null;
    motivo: string | null;
    tipo_cambio: string | null;
    fecha_cambio: Date;
  }>> {
    const records = await this.prisma.precios_historia.findMany({
      where: { producto_id: productId },
      orderBy: { fecha_cambio: 'desc' },
      take: limit,
    });

    return records.map(r => ({
      id: r.id,
      producto_id: r.producto_id,
      precio_anterior: r.precio_anterior ? Number(r.precio_anterior) : null,
      precio_nuevo: r.precio_nuevo ? Number(r.precio_nuevo) : null,
      costo_anterior: r.costo_anterior ? Number(r.costo_anterior) : null,
      costo_nuevo: r.costo_nuevo ? Number(r.costo_nuevo) : null,
      motivo: r.motivo,
      tipo_cambio: r.tipo_cambio,
      fecha_cambio: r.fecha_cambio || new Date(),
    }));
  }

  /**
   * Get all price history with filters
   */
  async getAllPriceHistory(filters: {
    producto_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: Array<{
      id: string;
      producto_id: string;
      precio_anterior: number | null;
      precio_nuevo: number | null;
      motivo: string | null;
      tipo_cambio: string | null;
      fecha_cambio: Date;
    }>;
    total: number;
  }> {
    const where: any = {};

    if (filters.producto_id) {
      where.producto_id = filters.producto_id;
    }

    if (filters.fecha_desde || filters.fecha_hasta) {
      where.fecha_cambio = {};
      if (filters.fecha_desde) {
        (where.fecha_cambio as any).gte = new Date(filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        (where.fecha_cambio as any).lte = new Date(filters.fecha_hasta);
      }
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const [data, total] = await Promise.all([
      this.prisma.precios_historia.findMany({
        where,
        orderBy: { fecha_cambio: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.precios_historia.count({ where }),
    ]);

    return {
      data: data.map(r => ({
        id: r.id,
        producto_id: r.producto_id,
        precio_anterior: r.precio_anterior ? Number(r.precio_anterior) : null,
        precio_nuevo: r.precio_nuevo ? Number(r.precio_nuevo) : null,
        motivo: r.motivo,
        tipo_cambio: r.tipo_cambio,
        fecha_cambio: r.fecha_cambio || new Date(),
      })),
      total,
    };
  }

  // ========== RUBRO MARKUP METHODS ==========

  /**
   * Get default markup for a rubro
   */
  async getDefaultMarkupByRubro(rubroId: string): Promise<number> {
    const rubro = await this.prisma.rubros.findUnique({
      where: { id: rubroId },
      select: { default_markup: true },
    });

    if (rubro && rubro.default_markup && Number(rubro.default_markup) > 0) {
      return Number(rubro.default_markup);
    }

    return this.DEFAULT_GLOBAL_MARKUP;
  }

  /**
   * Apply markup to all products in a rubro
   */
  async applyMarkupToRubro(rubroId: string, markup: number): Promise<number> {
    const productos = await this.getProductosInRubro(rubroId);
    
    let count = 0;
    for (const producto of productos) {
      const nuevoPrecio = producto.costo * (1 + markup / 100);
      await this.setProductPrice(producto.id, nuevoPrecio);
      count++;
    }

    return count;
  }
}