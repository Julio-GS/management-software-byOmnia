import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PromocionEntity } from '../entities/promocion.entity';
import { CreatePromocionDto, UpdatePromocionDto, FilterPromocionesDto } from '../dto/create-promocion.dto';

/**
 * PromocionesRepository
 * 
 * Abstracts data access for promotions (promociones)
 */
@Injectable()
export class PromocionesRepository {
  private readonly logger = new Logger(PromocionesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transform Prisma record to entity
   */
  private toEntity(data: any): PromocionEntity {
    return PromocionEntity.fromPersistence(data);
  }

  /**
   * Find all promotions with filters
   */
  async findAll(filters: FilterPromocionesDto = {}): Promise<{
    data: PromocionEntity[];
    total: number;
  }> {
    const where: any = {};

    if (filters.activo !== undefined) {
      where.activo = filters.activo;
    }

    if (filters.tipo) {
      where.tipo = filters.tipo;
    }

    if (filters.solo_vigentes) {
      const now = new Date();
      where.activo = true;
      where.fecha_inicio = { lte: now };
      where.fecha_fin = { gte: now };
    }

    const limit = filters.limit || 20;
    const page = filters.page || 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.promociones.findMany({
        where,
        orderBy: { prioridad: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.promociones.count({ where }),
    ]);

    return {
      data: data.map(d => this.toEntity(d)),
      total,
    };
  }

  /**
   * Find a promotion by ID
   */
  async findById(id: string): Promise<PromocionEntity | null> {
    const promocion = await this.prisma.promociones.findUnique({
      where: { id },
    });

    if (!promocion) return null;
    return this.toEntity(promocion);
  }

  /**
   * Get currently active promotions
   */
  async findVigEntes(): Promise<PromocionEntity[]> {
    const now = new Date();
    const horaActual = new Date().toTimeString().slice(0, 5); // HH:mm format
    
    const promociones = await this.prisma.promociones.findMany({
      where: {
        activo: true,
        fecha_inicio: { lte: now },
        fecha_fin: { gte: now },
      },
      orderBy: { prioridad: 'desc' },
    });

    // Filter by time if specified
    return promociones
      .filter(p => {
        if (!p.hora_inicio || !p.hora_fin) return true;
        const hi = String(p.hora_inicio).slice(0, 5);
        const hf = String(p.hora_fin).slice(0, 5);
        return horaActual >= hi && horaActual <= hf;
      })
      .map(p => this.toEntity(p));
  }

  /**
   * Get products for a promotion
   */
  async getProductos(promocionId: string): Promise<string[]> {
    const relations = await this.prisma.promociones_productos.findMany({
      where: { promocion_id: promocionId },
      select: { producto_id: true },
    });
    return relations.map(r => r.producto_id);
  }

  /**
   * Create a new promotion
   */
  async create(data: CreatePromocionDto): Promise<PromocionEntity> {
    // Validate dates
    if (new Date(data.fecha_inicio) > new Date(data.fecha_fin)) {
      throw new BadRequestException('Fecha de inicio debe ser anterior a fecha de fin');
    }

    // Validate time
    if (data.hora_inicio && data.hora_fin && data.hora_inicio >= data.hora_fin) {
      throw new BadRequestException('Hora de inicio debe ser anterior a hora de fin');
    }

    const promocion = await this.prisma.promociones.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        valor_descuento: data.valor_descuento,
        cantidad_requerida: data.cantidad_requerida,
        cantidad_bonificada: data.cantidad_bonificada,
        precio_especial: data.precio_especial,
        fecha_inicio: new Date(data.fecha_inicio),
        fecha_fin: new Date(data.fecha_fin),
        dias_semana: data.dias_semana || [],
        hora_inicio: data.hora_inicio ? `${data.hora_inicio}:00` : null,
        hora_fin: data.hora_fin ? `${data.hora_fin}:00` : null,
        cantidad_maxima_cliente: data.cantidad_maxima_cliente,
        acumulable: data.acumulable || false,
        prioridad: data.prioridad || 0,
        activo: true,
      },
    });

    // Add products if provided
    if (data.productos_ids && data.productos_ids.length > 0) {
      for (const productoId of data.productos_ids) {
        await this.prisma.promociones_productos.create({
          data: {
            promocion_id: promocion.id,
            producto_id: productoId,
          },
        });
      }
    }

    this.logger.log(`Created promotion ${promocion.id}`);
    return this.toEntity(promocion);
  }

  /**
   * Update a promotion
   */
  async update(id: string, data: UpdatePromocionDto): Promise<PromocionEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Promoción ${id} no encontrada`);
    }

    // Handle date/time validation conditionally
    const updateData: any = {};
    
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.valor_descuento !== undefined) updateData.valor_descuento = data.valor_descuento;
    if (data.cantidad_requerida !== undefined) updateData.cantidad_requerida = data.cantidad_requerida;
    if (data.cantidad_bonificada !== undefined) updateData.cantidad_bonificada = data.cantidad_bonificada;
    if (data.precio_especial !== undefined) updateData.precio_especial = data.precio_especial;
    if (data.fecha_inicio !== undefined) updateData.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_fin !== undefined) updateData.fecha_fin = new Date(data.fecha_fin);
    if (data.dias_semana !== undefined) updateData.dias_semana = data.dias_semana;
    if (data.hora_inicio !== undefined) updateData.hora_inicio = data.hora_inicio ? `${data.hora_inicio}:00` : null;
    if (data.hora_fin !== undefined) updateData.hora_fin = data.hora_fin ? `${data.hora_fin}:00` : null;
    if (data.cantidad_maxima_cliente !== undefined) updateData.cantidad_maxima_cliente = data.cantidad_maxima_cliente;
    if (data.acumulable !== undefined) updateData.acumulable = data.acumulable;
    if (data.prioridad !== undefined) updateData.prioridad = data.prioridad;
    if (data.activo !== undefined) updateData.activo = data.activo;

    const updated = await this.prisma.promociones.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated promotion ${id}`);
    return this.toEntity(updated);
  }

  /**
   * Soft delete a promotion
   */
  async softDelete(id: string): Promise<PromocionEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Promoción ${id} no encontrada`);
    }

    const updated = await this.prisma.promociones.update({
      where: { id },
      data: { activo: false },
    });

    this.logger.log(`Soft deleted promotion ${id}`);
    return this.toEntity(updated);
  }

  /**
   * Add products to a promotion
   */
  async addProductos(promocionId: string, productoIds: string[]): Promise<void> {
    for (const productoId of productoIds) {
      // Check if already exists
      const existing = await this.prisma.promociones_productos.findUnique({
        where: {
          promocion_id_producto_id: {
            promocion_id: promocionId,
            producto_id: productoId,
          },
        },
      });

      if (!existing) {
        await this.prisma.promociones_productos.create({
          data: {
            promocion_id: promocionId,
            producto_id: productoId,
          },
        });
      }
    }
    this.logger.log(`Added ${productoIds.length} products to promotion ${promocionId}`);
  }

  /**
   * Remove products from a promotion
   */
  async removeProductos(promocionId: string, productoIds: string[]): Promise<void> {
    for (const productoId of productoIds) {
      await this.prisma.promociones_productos.deleteMany({
        where: {
          promocion_id: promocionId,
          producto_id: productoId,
        },
      });
    }
    this.logger.log(`Removed ${productoIds.length} products from promotion ${promocionId}`);
  }

  /**
   * Clear all products from a promotion
   */
  async clearProductos(promocionId: string): Promise<void> {
    await this.prisma.promociones_productos.deleteMany({
      where: { promocion_id: promocionId },
    });
    this.logger.log(`Cleared all products from promotion ${promocionId}`);
  }
}