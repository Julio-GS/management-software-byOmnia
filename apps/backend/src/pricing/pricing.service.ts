import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { PriceCalculationResultDto } from './dto/price-calculation-result.dto';
import { PricingRepository } from './repositories/pricing.repository';
import { MarkupCalculatorService } from './services/markup-calculator.service';
import { PricingRecalculatedEvent } from '../shared/events';
import { UpdatePrecioDto, BulkUpdatePreciosDto, FilterPreciosHistoriaDto, ApplyMarkupToRubroDto } from './dto/pricing-crud.dto';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly repository: PricingRepository,
    private readonly markupCalculator: MarkupCalculatorService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Calculate price based on cost and markup hierarchy
   * Priority: Product markup > Category markup > Global markup
   */
  async calculatePrice(
    cost: number,
    productId?: string,
    categoryId?: string,
  ): Promise<PriceCalculationResultDto> {
    const markup = await this.getApplicableMarkup(productId, categoryId);
    
    // Calculate price with markup: price = cost * (1 + markup/100)
    const calculatedPrice = cost * (1 + markup.percentage / 100);
    
    // Suggest rounded price
    const suggestedPrice = this.suggestRoundedPrice(calculatedPrice);

    return {
      calculatedPrice: Math.round(calculatedPrice * 100) / 100, // Round to 2 decimals
      suggestedPrice,
      markupPercentage: markup.percentage,
      markupSource: markup.source,
    };
  }

  /**
   * Suggest a rounded price based on smart rounding rules
   * Rules:
   * - Prices < 100: round to nearest 10
   * - Prices 100-1000: round to nearest 50
   * - Prices > 1000: round to nearest 100
   */
  suggestRoundedPrice(calculatedPrice: number): number {
    if (calculatedPrice < 100) {
      // Round to nearest 10: 87 -> 90, 93 -> 90
      return Math.round(calculatedPrice / 10) * 10;
    } else if (calculatedPrice < 1000) {
      // Round to nearest 50: 847 -> 850, 870 -> 900
      return Math.round(calculatedPrice / 50) * 50;
    } else {
      // Round to nearest 100: 1847 -> 1900, 1950 -> 2000
      return Math.round(calculatedPrice / 100) * 100;
    }
  }

  /**
   * Get the applicable markup percentage for a product
   * Returns the markup from the highest priority level available
   */
  async getApplicableMarkup(
    productId?: string,
    categoryId?: string,
  ): Promise<{ percentage: number; source: 'product' | 'category' | 'global' }> {
    // 1. Try product-level markup
    if (productId) {
      const productData = await this.repository.getProductMarkup(productId);

      if (productData?.markup) {
        return {
          percentage: productData.markup,
          source: 'product',
        };
      }

      // If product has no markup but has a category, use that categoryId
      if (!categoryId && productData?.rubro_id) {
        categoryId = productData.rubro_id;
      }
    }

    // 2. Try category-level markup
    if (categoryId) {
      const categoryMarkup = await this.repository.getRubroMarkup(categoryId);

      if (categoryMarkup) {
        return {
          percentage: categoryMarkup,
          source: 'category',
        };
      }
    }

    // 3. Fall back to global markup
    const globalMarkup = await this.repository.getGlobalMarkup();
    return {
      percentage: globalMarkup,
      source: 'global',
    };
  }

  /**
   * Update the global markup setting
   * TODO: Implement when global settings table is added
   */
  async updateGlobalMarkup(percentage: number): Promise<void> {
    // await this.repository.updateGlobalMarkup(percentage);
    this.logger.warn(`updateGlobalMarkup not implemented - would update to ${percentage}%`);
  }

  /**
   * Recalculate prices for all products in a category when category markup changes
   * Only updates products that:
   * - Don't have a product-specific markup (rely on category/global markup)
   * - Are not soft-deleted (deletedAt IS NULL)
   */
  async recalculatePricesForCategory(categoryId: string): Promise<number> {
    // Get all products in the category that don't have a product-specific markup
    const products = await this.repository.getProductosInRubro(categoryId);

    this.logger.log(
      `Recalculating prices for ${products.length} products in category ${categoryId}`,
    );

    // Update each product's price
    let updated = 0;
    for (const product of products) {
      const priceResult = await this.calculatePrice(
        product.costo,
        product.id,
        categoryId,
      );

      await this.repository.setProductPrice(product.id, priceResult.suggestedPrice);

      // Emit event for each product price update
      this.eventBus.publish(
        new PricingRecalculatedEvent(
          product.id,
          product.costo,
          priceResult.markupPercentage,
          priceResult.suggestedPrice,
          new Date(),
        ),
      );

      updated++;
    }

    this.logger.log(`Successfully updated ${updated} product prices`);

    return updated;
  }

  /**
   * Recalculate prices for ALL products when global markup changes
   * Only updates products that:
   * - Don't have product-specific markup
   * - Don't belong to a category with markup
   * - Are not soft-deleted (deletedAt IS NULL)
   */
  async recalculatePricesGlobal(): Promise<number> {
    // Get all products that rely on global markup
    const products = await this.repository.getProductosUsingGlobalMarkup();

    this.logger.log(
      `Recalculating prices for ${products.length} products using global markup`,
    );

    // Update each product's price
    let updated = 0;
    for (const product of products) {
      const priceResult = await this.calculatePrice(
        product.costo,
        product.id,
        product.rubro_id || undefined,
      );

      await this.repository.setProductPrice(product.id, priceResult.suggestedPrice);

      // Emit event for each product price update
      this.eventBus.publish(
        new PricingRecalculatedEvent(
          product.id,
          product.costo,
          priceResult.markupPercentage,
          priceResult.suggestedPrice,
          new Date(),
        ),
      );

      updated++;
    }

    this.logger.log(`Successfully updated ${updated} product prices`);

    return updated;
  }

  /**
   * Recalculate price for a single product
   * Useful when cost changes or markup is removed
   */
  async recalculatePriceForProduct(productId: string): Promise<void> {
    const product = await this.repository.getProductById(productId);

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (!product.activo) {
      this.logger.warn(`Skipping price recalculation for inactive product ${productId}`);
      return;
    }

    const priceResult = await this.calculatePrice(
      product.costo,
      productId,
      product.rubro_id || undefined,
    );

    await this.repository.setProductPrice(productId, priceResult.suggestedPrice);

    this.logger.log(`Updated price for product ${productId} to ${priceResult.suggestedPrice}`);

// Emit event for product price update
    this.eventBus.publish(
      new PricingRecalculatedEvent(
        productId,
        product.costo,
        priceResult.markupPercentage,
        priceResult.suggestedPrice,
        new Date(),
      ),
    );
  }

  // ========== NEW METHODS FOR PHASE 4 ==========

  /**
   * Update price/cost for a product with history tracking
   */
  async updatePrice(productId: string, data: UpdatePrecioDto): Promise<void> {
    const producto = await this.repository.getProductById(productId);
    if (!producto) {
      throw new NotFoundException(`Producto ${productId} no encontrado`);
    }
    
    if (!producto.activo) {
      throw new BadRequestException('No se puede modificar precio de producto inactivo');
    }

    await this.repository.updatePrice(productId, data);
    this.logger.log(`Price updated for product ${productId}`);
  }

  /**
   * Bulk update prices
   */
  async bulkUpdatePrices(data: BulkUpdatePreciosDto): Promise<{ updated: number; failed: number }> {
    const result = await this.repository.bulkUpdatePrices(data.updates);
    this.logger.log(`Bulk update completed: ${result.updated} updated, ${result.failed} failed`);
    return result;
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string, limit = 20): Promise<Array<{
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
    return this.repository.getPriceHistoryByProduct(productId, limit);
  }

  /**
   * Get all price history with filters
   */
  async getAllPriceHistory(filters: FilterPreciosHistoriaDto): Promise<{
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
    return this.repository.getAllPriceHistory({
      producto_id: filters.producto_id,
      fecha_desde: filters.fecha_desde,
      fecha_hasta: filters.fecha_hasta,
      limit: filters.limit,
      offset: ((filters.page || 1) - 1) * (filters.limit || 20),
    });
  }

  /**
   * Calculate price from cost + markup + IVA
   */
  calculatePriceWithIva(costo: number, markup: number, iva: number): number {
    return this.markupCalculator.calculatePrice(costo, markup, iva);
  }

  /**
   * Get default markup for a rubro
   */
  async getDefaultMarkupByRubro(rubroId: string): Promise<number> {
    return this.repository.getDefaultMarkupByRubro(rubroId);
  }

  /**
   * Apply markup to all products in a rubro
   */
  async applyMarkupToRubro(rubroId: string, markup: number): Promise<number> {
    const count = await this.repository.applyMarkupToRubro(rubroId, markup);
    this.logger.log(`Applied ${markup}% markup to ${count} products in rubro ${rubroId}`);
    return count;
  }
}
