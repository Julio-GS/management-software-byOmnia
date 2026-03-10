import { ApiClient } from './client.js';
import type {
  PricingStrategy,
  UpdateGlobalMarkupDto,
  CalculatePriceDto,
  PriceCalculationResult,
} from '@omnia/shared-types';

export class PricingService {
  constructor(private client: ApiClient) {}

  /**
   * Get global markup configuration
   */
  async getGlobalMarkup(): Promise<PricingStrategy> {
    return this.client.get<PricingStrategy>(
      '/pricing/global-markup'
    );
  }

  /**
   * Update global markup
   */
  async updateGlobalMarkup(dto: UpdateGlobalMarkupDto): Promise<PricingStrategy> {
    return this.client.patch<PricingStrategy>(
      '/pricing/global-markup',
      dto
    );
  }

  /**
   * Calculate price for a product (supports product-specific or global markup)
   */
  async calculatePrice(
    dto: CalculatePriceDto
  ): Promise<PriceCalculationResult> {
    return this.client.post<PriceCalculationResult>(
      '/pricing/calculate',
      dto
    );
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string): Promise<any[]> {
    return this.client.get<any[]>(
      `/pricing/history/${productId}`
    );
  }
}
