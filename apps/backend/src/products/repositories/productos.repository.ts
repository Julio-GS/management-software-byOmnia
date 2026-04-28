import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Producto } from '../entities/producto.entity';
import { CreateProductDto } from '../dto/create-product-es.dto';
import { FilterProductsDto } from '../dto/filter-product.dto';
import { LotesRepository } from '../../lotes/repositories/lotes.repository';

/**
 * ProductosRepository - Repository for productos (products)
 * 
 * Abstracts Prisma queries for productos table.
 * Uses Spanish field names from schema.
 * Integrates with LotesModule via LotesRepository for stock tracking.
 */
@Injectable()
export class ProductosRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lotesRepository: LotesRepository,
  ) {}

  /**
   * Create a new producto
   */
  async create(dto: CreateProductDto): Promise<Producto> {
    // Check unique constraints before creating
    const existingCodigo = await this.prisma.productos.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existingCodigo) {
      throw new ConflictException(`Producto con código ${dto.codigo} ya existe`);
    }

    if (dto.codigo_barras) {
      const existingBarcode = await this.prisma.productos.findFirst({
        where: { codigo_barras: dto.codigo_barras },
      });

      if (existingBarcode) {
        throw new ConflictException(
          `Producto con código de barras ${dto.codigo_barras} ya existe`,
        );
      }
    }

    const data = await this.prisma.productos.create({
      data: {
        codigo: dto.codigo,
        codigo_alternativo: dto.codigo_alternativo,
        codigo_barras: dto.codigo_barras,
        detalle: dto.detalle,
        proveedor_id: dto.proveedor_id,
        rubro_id: dto.rubro_id,
        unidad_medida_id: dto.unidad_medida_id,
        contenido: dto.contenido,
        es_codigo_especial: dto.es_codigo_especial,
        requiere_precio_manual: dto.requiere_precio_manual,
        maneja_lotes: dto.maneja_lotes,
        costo: dto.costo,
        iva: dto.iva,
        precio_venta: dto.precio_venta,
        stock_minimo: dto.stock_minimo,
        maneja_stock: dto.maneja_stock,
      },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return Producto.fromPersistence(data);
  }

  /**
   * Find all productos with filters
   */
  async findAll(filters: FilterProductsDto): Promise<Producto[]> {
    const { page, limit, proveedor_id, rubro_id, activo, maneja_stock, es_codigo_especial, search } = filters;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (proveedor_id) {
      where.proveedor_id = proveedor_id;
    }

    if (rubro_id) {
      where.rubro_id = rubro_id;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (maneja_stock !== undefined) {
      where.maneja_stock = maneja_stock;
    }

    if (es_codigo_especial !== undefined) {
      where.es_codigo_especial = es_codigo_especial;
    }

    if (search) {
      where.OR = [
        { detalle: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { codigo_barras: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = ((page ?? 1) - 1) * (limit ?? 20);

    const data = await this.prisma.productos.findMany({
      where,
      skip,
      take: limit ?? 20,
      orderBy: { detalle: 'asc' },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return data.map((item) => Producto.fromPersistence(item));
  }

  /**
   * Find producto by ID
   */
  async findById(id: string): Promise<Producto | null> {
    const data = await this.prisma.productos.findUnique({
      where: { id },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return data ? Producto.fromPersistence(data) : null;
  }

  /**
   * Find producto by codigo
   */
  async findByCodigo(codigo: string): Promise<Producto | null> {
    const data = await this.prisma.productos.findUnique({
      where: { codigo },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return data ? Producto.fromPersistence(data) : null;
  }

  /**
   * Find producto by codigo_barras
   */
  async findByCodigoBarras(codigo_barras: string): Promise<Producto | null> {
    const data = await this.prisma.productos.findFirst({
      where: { codigo_barras },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return data ? Producto.fromPersistence(data) : null;
  }

  /**
   * Alias for findByCodigoBarras (English name for compatibility)
   */
  async findByBarcode(codigo_barras: string): Promise<Producto | null> {
    return this.findByCodigoBarras(codigo_barras);
  }

  /**
   * Alias for findByCodigo (English name for compatibility)
   */
  async findBySku(codigo: string): Promise<Producto | null> {
    return this.findByCodigo(codigo);
  }

  /**
   * Update a producto
   */
  async update(id: string, dto: Partial<CreateProductDto>): Promise<Producto> {
    const existing = await this.prisma.productos.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // Check unique constraints
    if (dto.codigo && dto.codigo !== existing.codigo) {
      const duplicate = await this.prisma.productos.findUnique({
        where: { codigo: dto.codigo },
      });

      if (duplicate) {
        throw new ConflictException(`Producto con código ${dto.codigo} ya existe`);
      }
    }

    if (dto.codigo_barras && dto.codigo_barras !== existing.codigo_barras) {
      const duplicate = await this.prisma.productos.findFirst({
        where: { codigo_barras: dto.codigo_barras },
      });

      if (duplicate) {
        throw new ConflictException(
          `Producto con código de barras ${dto.codigo_barras} ya existe`,
        );
      }
    }

    const data = await this.prisma.productos.update({
      where: { id },
      data: {
        codigo: dto.codigo,
        codigo_alternativo: dto.codigo_alternativo,
        codigo_barras: dto.codigo_barras,
        detalle: dto.detalle,
        proveedor_id: dto.proveedor_id,
        rubro_id: dto.rubro_id,
        unidad_medida_id: dto.unidad_medida_id,
        contenido: dto.contenido,
        es_codigo_especial: dto.es_codigo_especial,
        requiere_precio_manual: dto.requiere_precio_manual,
        maneja_lotes: dto.maneja_lotes,
        costo: dto.costo,
        iva: dto.iva,
        precio_venta: dto.precio_venta,
        stock_minimo: dto.stock_minimo,
        maneja_stock: dto.maneja_stock,
        updated_at: new Date(),
        // activo has default=true in Prisma schema, no need to set explicitly
      },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return Producto.fromPersistence(data);
  }

  /**
   * Soft delete a producto (set activo = false)
   */
  async softDelete(id: string): Promise<Producto> {
    const data = await this.prisma.productos.update({
      where: { id },
      data: { activo: false, updated_at: new Date() },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return Producto.fromPersistence(data);
  }

  /**
   * Find productos with low stock
   * Uses lotes aggregate to calculate total stock per producto
   * Stock bajo = total_stock < stock_minimo
   */
  async findLowStock(): Promise<Producto[]> {
    // First get all products with their lotes
    const productos = await this.prisma.productos.findMany({
      where: {
        activo: true,
        maneja_stock: true,
      },
      include: {
        lotes: {
          where: { activo: true },
        },
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    // Filter where total lote stock < stock_minimo
    const lowStockProductos = productos.filter((producto) => {
      const totalStock = producto.lotes.reduce(
        (sum, lote) => sum + lote.cantidad_actual,
        0,
      );
      const minStock = producto.stock_minimo ?? 20;
      return totalStock < minStock;
    });

    return lowStockProductos.map((item) => Producto.fromPersistence(item));
  }

  /**
   * Get total stock for a producto (sum of all lote.cantidad_actual)
   */
  async getTotalStock(productoId: string): Promise<number> {
    const lotes = await this.lotesRepository.findByProductoWithStock(productoId);
    return lotes.reduce((sum, lote) => sum + lote.cantidad_actual, 0);
  }

  /**
   * Get productos requiring manual price (F/V/P/C items)
   */
  async findRequiringManualPrice(): Promise<Producto[]> {
    const data = await this.prisma.productos.findMany({
      where: {
        activo: true,
        requiere_precio_manual: true,
      },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
      orderBy: { detalle: 'asc' },
    });

    return data.map((item) => Producto.fromPersistence(item));
  }

  /**
   * Get productos with special codes (F/V/P/C prefixed)
   */
  async findSpecialCodes(): Promise<Producto[]> {
    const data = await this.prisma.productos.findMany({
      where: {
        activo: true,
        es_codigo_especial: true,
      },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
      orderBy: { detalle: 'asc' },
    });

    return data.map((item) => Producto.fromPersistence(item));
  }

  /**
   * Save producto entity back to database
   */
  async save(producto: Producto): Promise<Producto> {
    const data = await this.prisma.productos.update({
      where: { id: producto.id },
      data: {
        codigo: producto.codigo,
        codigo_alternativo: producto.codigo_alternativo,
        codigo_barras: producto.codigo_barras,
        detalle: producto.detalle,
        proveedor_id: producto.proveedor_id,
        rubro_id: producto.rubro_id,
        unidad_medida_id: producto.unidad_medida_id,
        contenido: producto.contenido,
        es_codigo_especial: producto.es_codigo_especial,
        requiere_precio_manual: producto.requiere_precio_manual,
        maneja_lotes: producto.maneja_lotes,
        costo: producto.costo,
        iva: producto.iva,
        precio_venta: producto.precio_venta,
        stock_minimo: producto.stock_minimo,
        maneja_stock: producto.maneja_stock,
        activo: producto.activo,
        updated_at: new Date(),
      },
      include: {
        proveedores: true,
        rubros: true,
        unidades_medida: true,
      },
    });

    return Producto.fromPersistence(data);
  }

  /**
   * Get total inventory value (precio_venta * stock sum from lotes)
   */
  async getTotalInventoryValue(): Promise<number> {
    const productos = await this.prisma.productos.findMany({
      where: { activo: true },
      include: {
        lotes: {
          where: { activo: true },
        },
      },
    });

    const total = productos.reduce((sum, producto) => {
      const stock = producto.lotes.reduce(
        (s, lote) => s + lote.cantidad_actual,
        0,
      );
      return sum + Number(producto.precio_venta) * stock;
    }, 0);

    return total;
  }
}