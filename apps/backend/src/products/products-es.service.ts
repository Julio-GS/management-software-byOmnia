import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { CreateProductDto } from './dto/create-product-es.dto';
import { FilterProductsDto } from './dto/filter-product.dto';
import { ProductosRepository } from './repositories/productos.repository';
import { Producto } from './entities/producto.entity';
import { ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent } from '../shared/events';

/**
 * ProductsEsService - Spanish Products Service
 * 
 * Implements CRUD for productos (products) with Spanish field names.
 * Uses repository pattern and EventBus for cross-module communication.
 * 
 * Business Rules (from design):
 * - Auto-detect F/V/P/C codes (es_codigo_especial)
 * - Auto-set requiere_precio_manual = true when es_codigo_especial
 * - Auto-set maneja_stock = false when es_codigo_especial
 */
@Injectable()
export class ProductsEsService {
  constructor(
    private readonly repository: ProductosRepository,
    private readonly eventBus: EventBus,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {
    logger.setContext(ProductsEsService.name);
  }

  /**
   * Create a new producto (product).
   * Auto-sets flags when es_codigo_especial = true
   * Emits ProductCreatedEvent for sync.
   */
  async create(dto: CreateProductDto): Promise<Producto> {
    this.logger.info({ codigo: dto.codigo }, 'Creating product');

    // Apply auto-set logic for special codes
    const producto = await this.repository.create({
      ...dto,
      // Auto-set
      requiere_precio_manual: dto.es_codigo_especial 
        ? true 
        : dto.requiere_precio_manual,
      maneja_stock: dto.es_codigo_especial 
        ? false 
        : dto.maneja_stock,
    });

    // Emit event for sync module
    this.eventBus.publish(
      new ProductCreatedEvent(
        producto.id,
        producto.detalle,
        producto.codigo,
        producto.codigo_barras,
        producto.rubro_id,
        producto.precio_venta,
      ),
    );

    return producto;
  }

  /**
   * Find all products with filters
   */
  async findAll(filters: FilterProductsDto): Promise<Producto[]> {
    const productos = await this.repository.findAll(filters);
    return productos;
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Producto> {
    const producto = await this.repository.findById(id);
    
    if (!producto) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return producto;
  }

  /**
   * Alias for findById (compatibility)
   */
  async findOne(id: string): Promise<Producto> {
    return this.findById(id);
  }

  /**
   * Find product by codigo
   */
  async findByCodigo(codigo: string): Promise<Producto> {
    const producto = await this.repository.findByCodigo(codigo);
    
    if (!producto) {
      throw new NotFoundException(`Product with code ${codigo} not found`);
    }
    
    return producto;
  }

  /**
   * Alias for findByCodigo (English compatibility)
   */
  async findBySku(sku: string): Promise<Producto> {
    return this.findByCodigo(sku);
  }

  /**
   * Find product by codigo_barras
   */
  async findByBarcode(codigo_barras: string): Promise<Producto> {
    const producto = await this.repository.findByBarcode(codigo_barras);
    
    if (!producto) {
      throw new NotFoundException(`Product with barcode ${codigo_barras} not found`);
    }
    
    return producto;
  }

  /**
   * Update a product
   */
  async update(id: string, dto: Partial<CreateProductDto>): Promise<Producto> {
    const producto = await this.repository.update(id, dto);
    
    if (!producto) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Emit event (map Spanish → English for event compatibility)
    this.eventBus.publish(
      new ProductUpdatedEvent(producto.id, {
        name: producto.detalle,
        sku: producto.codigo,
        basePrice: producto.precio_venta,
      }),
    );

    return producto;
  }

  /**
   * Soft delete a product
   */
  async remove(id: string): Promise<Producto> {
    const producto = await this.repository.softDelete(id);
    
    if (!producto) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Emit event
    this.eventBus.publish(new ProductDeletedEvent(producto.id, producto.codigo));

    return producto;
  }

  /**
   * Get products with low stock (stock < stock_minimo)
   */
  async getLowStock(): Promise<Producto[]> {
    return this.repository.findLowStock();
  }

  /**
   * Alias for getLowStock (compatibility)
   */
  async getLowStockProducts(): Promise<Producto[]> {
    return this.getLowStock();
  }

  /**
   * Get total inventory value
   */
  async getTotalInventoryValue(): Promise<{ totalValue: number }> {
    const totalValue = await this.repository.getTotalInventoryValue();
    return { totalValue };
  }

  /**
   * Bulk update prices
   */
  async bulkUpdatePrices(updates: { producto_id: string; nuevo_costo?: number; nuevo_precio?: number }[]): Promise<{ updated: number }> {
    let updated = 0;
    
    for (const u of updates) {
      await this.repository.update(u.producto_id, {
        costo: u.nuevo_costo,
        precio_venta: u.nuevo_precio,
      });
      updated++;
    }

    return { updated };
  }
}