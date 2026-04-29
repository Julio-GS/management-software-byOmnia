import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LotesRepository } from './repositories/lotes.repository';
import { FefoAlgorithmService, LoteSelection } from './services/fefo-algorithm.service';
import { Lote } from './entities/lote.entity';

/**
 * LotesService - Spanish Lots Service
 * 
 * Implements CRUD for lotes (batches) with FEFO algorithm.
 */
@Injectable()
export class LotesService {
  constructor(
    private readonly repository: LotesRepository,
    private readonly fefoService: FefoAlgorithmService,
    private readonly logger: PinoLogger,
  ) {
    logger.setContext(LotesService.name);
  }

  /**
   * Create a new lote (batch)
   */
  async create(dto: {
    producto_id: string;
    numero_lote?: string;
    fecha_vencimiento?: Date;
    cantidad_inicial: number;
  }): Promise<Lote> {
    this.logger.info({ producto_id: dto.producto_id }, 'Creating lote');
    return this.repository.create(dto);
  }

  /**
   * Find all lotes with filters
   */
  async findAll(filters: {
    producto_id?: string;
    activo?: boolean;
    solo_con_stock?: boolean;
  }): Promise<Lote[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Find lote by ID
   */
  async findById(id: string): Promise<Lote> {
    const lote = await this.repository.findById(id);
    
    if (!lote) {
      throw new NotFoundException(`Lote with ID ${id} not found`);
    }
    
    return lote;
  }

  /**
   * Update a lote
   */
  async update(
    id: string,
    dto: {
      numero_lote?: string;
      fecha_vencimiento?: Date;
      activo?: boolean;
    },
  ): Promise<Lote> {
    const lote = await this.repository.update(id, dto);
    
    if (!lote) {
      throw new NotFoundException(`Lote with ID ${id} not found`);
    }

    return lote;
  }

  /**
   * Soft delete a lote
   */
  async remove(id: string): Promise<Lote> {
    const lote = await this.repository.softDelete(id);
    
    if (!lote) {
      throw new NotFoundException(`Lote with ID ${id} not found`);
    }

    return lote;
  }

  /**
   * Get lots expiring soon
   */
  async getProximosVencer(dias: number = 15): Promise<Lote[]> {
    return this.repository.findProximosVencer(dias);
  }

  /**
   * Get expired lots
   */
  async getVencidos(): Promise<Lote[]> {
    return this.repository.findVencidos();
  }

  /**
   * Select lots for sale using FEFO algorithm
   * 
   * Returns array of selected lots with quantities to deduct
   */
  async selectForSale(
    productoId: string,
    cantidadRequerida: number,
  ): Promise<LoteSelection[]> {
    // Get available lots for product
    const lotes = await this.repository.findByProductoWithStock(productoId);
    
    if (lotes.length === 0) {
      throw new NotFoundException(`No lots available for product ${productoId}`);
    }

    // Apply FEFO algorithm
    return this.fefoService.selectLotesForSale(lotes, cantidadRequerida);
  }

  /**
   * Deduct stock from selected lots (for sales)
   */
  async deductFromLotes(selections: LoteSelection[]): Promise<void> {
    for (const selection of selections) {
      await this.repository.updateStock(
        selection.lote_id,
        -selection.cantidad_tomada,
      );
    }
  }

  /**
   * Add stock to a lote
   */
  async addStock(loteId: string, cantidad: number): Promise<Lote> {
    const lote = await this.repository.updateStock(loteId, cantidad);
    return lote;
  }

  /**
   * Calculate total stock for a product
   */
  async getTotalStock(productoId: string): Promise<number> {
    const lotes = await this.repository.findByProductoWithStock(productoId);
    return this.fefoService.calculateTotalStock(lotes);
  }
}