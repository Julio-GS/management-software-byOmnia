import { Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { PriceCalculationResultDto } from './dto/price-calculation-result.dto';
import { PricingRepository } from './repositories/pricing.repository';
import { PricingRecalculatedEvent } from '../shared/events';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly repository: PricingRepository,
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
      if (!categoryId && productData?.categoryId) {
        categoryId = productData.categoryId;
      }
    }

    // 2. Try category-level markup
    if (categoryId) {
      const categoryMarkup = await this.repository.getCategoryMarkup(categoryId);

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
   */
  async updateGlobalMarkup(percentage: number): Promise<void> {
    await this.repository.updateGlobalMarkup(percentage);
    this.logger.log(`Global markup updated to ${percentage}%`);
  }

  /**
   * Recalculate prices for all products in a category when category markup changes
   * Only updates products that:
   * - Don't have a product-specific markup (rely on category/global markup)
   * - Are not soft-deleted (deletedAt IS NULL)
   */
  async recalculatePricesForCategory(categoryId: string): Promise<number> {
    // Get all products in the category that don't have a product-specific markup
    const products = await this.repository.getProductsInCategoryWithoutMarkup(categoryId);

    this.logger.log(
      `Recalculating prices for ${products.length} products in category ${categoryId}`,
    );

    // Update each product's price
    let updated = 0;
    for (const product of products) {
      const priceResult = await this.calculatePrice(
        product.cost,
        product.id,
        categoryId,
      );

      await this.repository.updateProductPrice(product.id, priceResult.suggestedPrice);

      // Emit event for each product price update
      this.eventBus.publish(
        new PricingRecalculatedEvent(
          product.id,
          product.cost,
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
    const products = await this.repository.getProductsUsingGlobalMarkup();

    this.logger.log(
      `Recalculating prices for ${products.length} products using global markup`,
    );

    // Update each product's price
    let updated = 0;
    for (const product of products) {
      const priceResult = await this.calculatePrice(
        product.cost,
        product.id,
        product.categoryId || undefined,
      );

      await this.repository.updateProductPrice(product.id, priceResult.suggestedPrice);

      // Emit event for each product price update
      this.eventBus.publish(
        new PricingRecalculatedEvent(
          product.id,
          product.cost,
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
    const product = await this.repository.getProductForPriceCalculation(productId);

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (product.deletedAt) {
      this.logger.warn(`Skipping price recalculation for soft-deleted product ${productId}`);
      return;
    }

    const priceResult = await this.calculatePrice(
      product.cost,
      productId,
      product.categoryId || undefined,
    );

    await this.repository.updateProductPrice(productId, priceResult.suggestedPrice);

    this.logger.log(`Updated price for product ${productId} to ${priceResult.suggestedPrice}`);

    // Emit event for product price update
    this.eventBus.publish(
      new PricingRecalculatedEvent(
        productId,
        product.cost,
        priceResult.markupPercentage,
        priceResult.suggestedPrice,
        new Date(),
      ),
    );
  }
}
