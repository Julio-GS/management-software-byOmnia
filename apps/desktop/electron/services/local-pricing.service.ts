import Database from 'better-sqlite3';
import { ProductsRepository, CategoriesRepository, SettingsRepository } from '@omnia/local-db';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * Parameters for price calculation
 */
export interface PriceCalculationParams {
  cost: number;
  productId?: string;
  categoryId?: string;
}

/**
 * Result of price calculation
 */
export interface PriceCalculationResult {
  calculatedPrice: number;
  suggestedPrice: number;
  markupPercentage: number;
  markupSource: 'product' | 'category' | 'global';
}

/**
 * Local pricing service - replicates backend pricing logic for offline mode
 * 
 * Implements the same markup hierarchy as backend:
 * 1. Product-specific markup (highest priority)
 * 2. Category markup
 * 3. Global markup (fallback)
 */
export class LocalPricingService {
  private productsRepo: ProductsRepository;
  private categoriesRepo: CategoriesRepository;
  private settingsRepo: SettingsRepository;

  constructor(db: Database.Database) {
    this.productsRepo = new ProductsRepository(db);
    this.categoriesRepo = new CategoriesRepository(db);
    this.settingsRepo = new SettingsRepository(db);
  }

  /**
   * Calculate price based on cost and markup hierarchy
   * Matches backend PricingService.calculatePrice() exactly
   * 
   * @param params Cost, optional productId and categoryId
   * @returns Calculated price, suggested rounded price, markup info
   */
  async calculatePrice(params: PriceCalculationParams): Promise<PriceCalculationResult> {
    try {
      const { cost, productId, categoryId } = params;

      // Get applicable markup using hierarchy
      const markup = await this.getApplicableMarkup(productId, categoryId);

      // Calculate price with markup: price = cost * (1 + markup/100)
      const calculatedPrice = cost * (1 + markup.percentage / 100);

      // Suggest rounded price using smart rounding rules
      const suggestedPrice = this.suggestRoundedPrice(calculatedPrice);

      return {
        calculatedPrice: Math.round(calculatedPrice * 100) / 100, // Round to 2 decimals
        suggestedPrice,
        markupPercentage: markup.percentage,
        markupSource: markup.source,
      };
    } catch (error) {
      logger.error('Failed to calculate price:', error);
      throw new Error(`Price calculation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the applicable markup percentage for a product
   * Implements the same hierarchy as backend:
   * 1. Product markup (if set)
   * 2. Category markup (if product belongs to category and category has markup)
   * 3. Global markup (fallback)
   * 
   * @param productId Optional product ID
   * @param categoryId Optional category ID
   * @returns Markup percentage and source
   */
  async getApplicableMarkup(
    productId?: string,
    categoryId?: string
  ): Promise<{ percentage: number; source: 'product' | 'category' | 'global' }> {
    try {
      // 1. Try product-level markup
      if (productId) {
        const product = this.productsRepo.findById(productId);
        
        if (product) {
          // Check if product has a markup field (stored as custom property)
          const productMarkup = await this.getProductMarkup(productId);
          
          if (productMarkup !== null && productMarkup !== undefined) {
            return {
              percentage: productMarkup,
              source: 'product',
            };
          }

          // If product has no markup but has a category, use that categoryId
          if (!categoryId && product.categoryId) {
            categoryId = product.categoryId;
          }
        }
      }

      // 2. Try category-level markup
      if (categoryId) {
        const categoryMarkup = await this.getCategoryMarkup(categoryId);
        
        if (categoryMarkup !== null && categoryMarkup !== undefined) {
          return {
            percentage: categoryMarkup,
            source: 'category',
          };
        }
      }

      // 3. Fall back to global markup
      const globalMarkup = await this.getGlobalMarkup();
      return {
        percentage: globalMarkup,
        source: 'global',
      };
    } catch (error) {
      logger.error('Failed to get applicable markup:', error);
      // If all else fails, return 0% markup from global
      return {
        percentage: 0,
        source: 'global',
      };
    }
  }

  /**
   * Suggest a rounded price based on smart rounding rules
   * Matches backend PricingService.suggestRoundedPrice() exactly
   * 
   * Rules:
   * - Prices < 100: round to nearest 10
   * - Prices 100-1000: round to nearest 50
   * - Prices > 1000: round to nearest 100
   * 
   * @param calculatedPrice The calculated price before rounding
   * @returns Rounded price suggestion
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
   * Recalculate prices for all products in a category
   * Only updates products without product-specific markup
   * 
   * @param categoryId Category ID
   * @returns Number of products updated
   */
  async recalculateCategoryPrices(categoryId: string): Promise<number> {
    try {
      // Get all products in the category
      const products = this.productsRepo.findByCategory(categoryId);

      logger.info(`Recalculating prices for ${products.length} products in category ${categoryId}`);

      let updated = 0;
      for (const product of products) {
        // Only update if product has no product-specific markup
        const productMarkup = await this.getProductMarkup(product.id);
        
        if (productMarkup === null || productMarkup === undefined) {
          const cost = parseFloat(product.cost || '0');
          const priceResult = await this.calculatePrice({
            cost,
            productId: product.id,
            categoryId,
          });

          // Update product price
          this.productsRepo.update(product.id, {
            price: priceResult.suggestedPrice.toString(),
          });

          updated++;
        }
      }

      logger.info(`Successfully updated ${updated} product prices`);
      return updated;
    } catch (error) {
      logger.error('Failed to recalculate category prices:', error);
      throw new Error(`Failed to recalculate category prices: ${(error as Error).message}`);
    }
  }

  /**
   * Get product-specific markup percentage
   * Note: Product markup is stored in settings with key "product_markup:{productId}"
   * 
   * @param productId Product ID
   * @returns Markup percentage or null if not set
   */
  private async getProductMarkup(productId: string): Promise<number | null> {
    try {
      const markup = this.settingsRepo.getValue<number>(`product_markup:${productId}`);
      return markup;
    } catch {
      return null;
    }
  }

  /**
   * Get category markup percentage
   * Note: Category markup is stored in settings with key "category_markup:{categoryId}"
   * 
   * @param categoryId Category ID
   * @returns Markup percentage or null if not set
   */
  private async getCategoryMarkup(categoryId: string): Promise<number | null> {
    try {
      const markup = this.settingsRepo.getValue<number>(`category_markup:${categoryId}`);
      return markup;
    } catch {
      return null;
    }
  }

  /**
   * Get global default markup percentage
   * Note: Global markup is stored in settings with key "global_markup"
   * 
   * @returns Global markup percentage (defaults to 0 if not set)
   */
  private async getGlobalMarkup(): Promise<number> {
    try {
      const markup = this.settingsRepo.getValue<number>('global_markup');
      return markup ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Update product markup percentage
   * 
   * @param productId Product ID
   * @param percentage Markup percentage (or null to remove)
   */
  async updateProductMarkup(productId: string, percentage: number | null): Promise<void> {
    try {
      if (percentage === null) {
        this.settingsRepo.delete(`product_markup:${productId}`);
      } else {
        this.settingsRepo.set(`product_markup:${productId}`, percentage);
      }
    } catch (error) {
      logger.error('Failed to update product markup:', error);
      throw new Error(`Failed to update product markup: ${(error as Error).message}`);
    }
  }
}
