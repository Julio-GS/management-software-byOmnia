import { Injectable, Logger } from '@nestjs/common';
import { PromocionesRepository } from './repositories/promociones.repository';
import { PromocionEntity } from './entities/promocion.entity';
import { CreatePromocionDto, UpdatePromocionDto, FilterPromocionesDto, AddProductsToPromocionDto } from './dto/create-promocion.dto';

@Injectable()
export class PromocionesService {
  private readonly logger = new Logger(PromocionesService.name);

  constructor(private readonly repository: PromocionesRepository) {}

  /**
   * Find all promotions with filters
   */
  async findAll(filters: FilterPromocionesDto = {}): Promise<{
    data: PromocionEntity[];
    total: number;
  }> {
    return this.repository.findAll(filters);
  }

  /**
   * Find a promotion by ID
   */
  async findById(id: string): Promise<PromocionEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new Error(`Promoción ${id} no encontrada`);
    }
    return entity;
  }

  /**
   * Get currently active promotions
   */
  async findVigentes(): Promise<PromocionEntity[]> {
    return this.repository.findVigEntes();
  }

  /**
   * Get products for a promotion
   */
  async getProductos(promocionId: string): Promise<string[]> {
    return this.repository.getProductos(promocionId);
  }

  /**
   * Create a new promotion
   */
  async create(data: CreatePromocionDto): Promise<PromocionEntity> {
    return this.repository.create(data);
  }

  /**
   * Update a promotion
   */
  async update(id: string, data: UpdatePromocionDto): Promise<PromocionEntity> {
    return this.repository.update(id, data);
  }

  /**
   * Soft delete a promotion (deactivate)
   */
  async softDelete(id: string): Promise<PromocionEntity> {
    return this.repository.softDelete(id);
  }

  /**
   * Add products to a promotion
   */
  async addProductos(promocionId: string, data: AddProductsToPromocionDto): Promise<void> {
    return this.repository.addProductos(promocionId, data.productos_ids);
  }

  /**
   * Remove products from a promotion
   */
  async removeProductos(promocionId: string, data: AddProductsToPromocionDto): Promise<void> {
    return this.repository.removeProductos(promocionId, data.productos_ids);
  }

  /**
   * Clear all products from a promotion
   */
  async clearProductos(promocionId: string): Promise<void> {
    return this.repository.clearProductos(promocionId);
  }
}