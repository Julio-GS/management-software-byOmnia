import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InventoryRepository } from './repositories/inventory.repository';
import { StockMovement } from './entities/inventory-movement.entity';

/**
 * InventoryService - Spanish field names
 * 
 * Implements business logic for inventory (movimientos_stock).
 * Integrates with LotesModule for batch tracking.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly repository: InventoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Get all stock movements with filters
   */
  async getMovimientos(params?: {
    tipo_movimiento?: string;
    producto_id?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    limit?: number;
    offset?: number;
  }): Promise<StockMovement[]> {
    return this.repository.findAll(params);
  }

  /**
   * Get a single movimiento by ID
   */
  async getMovimientoById(id: string): Promise<StockMovement> {
    const movimiento = await this.repository.findById(id);
    
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }
    
    return movimiento;
  }

  /**
   * Get movement history for a producto
   */
  async getMovimientosByProducto(productoId: string, limit?: number): Promise<StockMovement[]> {
    return this.repository.findByProducto(productoId, limit);
  }

  /**
   * Record an entrada (stock entry)
   * Creates movimiento_stock record and updates lote quantity
   */
  async registrarEntrada(params: {
    producto_id: string;
    lote_id: string;
    cantidad: number;
    referencia?: string;
    observaciones?: string;
    usuario_id?: string;
  }): Promise<StockMovement> {
    if (!params.producto_id) {
      throw new BadRequestException('Producto ID es requerido');
    }
    if (!params.lote_id) {
      throw new BadRequestException('Lote ID es requerido');
    }
    if (params.cantidad <= 0) {
      throw new BadRequestException('Cantidad debe ser mayor a 0');
    }

    this.logger.log({ 
      producto_id: params.producto_id, 
      lote_id: params.lote_id, 
      cantidad: params.cantidad 
    }, 'Registrando entrada de stock');

    return this.repository.recordEntrada(
      params.producto_id,
      params.lote_id,
      params.cantidad,
      {
        referencia: params.referencia,
        observaciones: params.observaciones,
        usuario_id: params.usuario_id,
      },
    );
  }

  /**
   * Record an ajuste (stock adjustment)
   */
  async registrarAjuste(params: {
    producto_id: string;
    newStock: number;
    lote_id?: string;
    referencia?: string;
    observaciones?: string;
    usuario_id?: string;
  }): Promise<StockMovement> {
    if (!params.producto_id) {
      throw new BadRequestException('Producto ID es requerido');
    }
    if (params.newStock < 0) {
      throw new BadRequestException('Stock no puede ser negativo');
    }

    this.logger.log({
      producto_id: params.producto_id,
      newStock: params.newStock,
    }, 'Registrando ajuste de stock');

    return this.repository.recordAjuste(
      params.producto_id,
      params.newStock,
      {
        lote_id: params.lote_id,
        referencia: params.referencia,
        observaciones: params.observaciones,
        usuario_id: params.usuario_id,
      },
    );
  }

  /**
   * Record merma (shrinkage/loss)
   */
  async registrarMerma(params: {
    producto_id: string;
    lote_id: string;
    cantidad: number;
    referencia?: string;
    observaciones?: string;
    usuario_id?: string;
  }): Promise<StockMovement> {
    if (!params.producto_id) {
      throw new BadRequestException('Producto ID es requerido');
    }
    if (!params.lote_id) {
      throw new BadRequestException('Lote ID es requerido');
    }
    if (params.cantidad <= 0) {
      throw new BadRequestException('Cantidad debe ser mayor a 0');
    }

    this.logger.log({
      producto_id: params.producto_id,
      lote_id: params.lote_id,
      cantidad: params.cantidad,
    }, 'Registrando merma');

    return this.repository.recordMerma(
      params.producto_id,
      params.lote_id,
      params.cantidad,
      {
        referencia: params.referencia,
        observaciones: params.observaciones,
        usuario_id: params.usuario_id,
      },
    );
  }

  /**
   * Get total stock for a producto (sum from lotes)
   */
  async getTotalStock(productoId: string): Promise<number> {
    return this.repository.getTotalStock(productoId);
  }

  /**
   * Get productos with low stock
   * Returns products where total stock < stock_minimo
   */
  async getLowStock(): Promise<any[]> {
    return this.repository.findLowStock();
  }

  /**
   * Create general stock movement (for non-lote tracking)
   */
  async createMovimiento(params: {
    producto_id: string;
    tipo_movimiento: string;
    cantidad: number;
    lote_id?: string;
    referencia?: string;
    observaciones?: string;
    usuario_id?: string;
  }): Promise<StockMovement> {
    return this.repository.createMovimiento(params);
  }

  /**
   * English alias for createMovimiento()
   * Adapts English parameters to Spanish
   */
  async createMovement(params: {
    productId: string;
    quantity: number;
    type: string;
    reason?: string;
  }): Promise<StockMovement> {
    return this.createMovimiento({
      producto_id: params.productId,
      tipo_movimiento: params.type,
      cantidad: params.quantity,
      referencia: params.reason,
    });
  }

  /**
   * English alias for registrarAjuste()
   */
  async adjustStock(adjustmentDto: any): Promise<StockMovement> {
    return this.registrarAjuste({
      producto_id: adjustmentDto.productId,
      newStock: adjustmentDto.newStock || adjustmentDto.quantity,
      referencia: adjustmentDto.reason,
      usuario_id: adjustmentDto.userId,
    });
  }

  /**
   * English alias for bulk movements
   */
  async createBulkMovement(bulkMovementDto: any): Promise<any> {
    const results = [];
    for (const item of bulkMovementDto.items || []) {
      try {
        const movement = await this.createMovement({
          productId: item.productId,
          quantity: item.quantity,
          type: item.type || 'ENTRY',
          reason: item.reason,
        });
        results.push({ success: true, productId: item.productId, movement });
      } catch (error) {
        results.push({ success: false, productId: item.productId, error: error.message });
      }
    }
    return {
      success: results.every(r => r.success),
      results,
    };
  }

  /**
   * English alias for getMovimientos()
   */
  async getAllMovements(params?: any): Promise<StockMovement[]> {
    return this.getMovimientos({
      tipo_movimiento: params?.type,
      producto_id: params?.productId,
      fecha_inicio: params?.startDate,
      fecha_fin: params?.endDate,
    });
  }

  /**
   * English alias for getLowStock()
   */
  async getLowStockProducts(threshold?: number): Promise<any[]> {
    return this.getLowStock();
  }

  /**
   * English alias for getMovimientosByProducto()
   */
  async getProductHistory(productId: string, limit?: number): Promise<StockMovement[]> {
    return this.getMovimientosByProducto(productId, limit);
  }
}