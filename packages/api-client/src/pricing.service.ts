import { ApiClient } from './client';
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
    const response = await this.client.get<PricingStrategy>(
      '/pricing/global-markup'
    );
    return response.data!;
  }

  /**
   * Update global markup
   */
  async updateGlobalMarkup(dto: UpdateGlobalMarkupDto): Promise<PricingStrategy> {
    const response = await this.client.patch<PricingStrategy>(
      '/pricing/global-markup',
      dto
    );
    return response.data!;
  }

  /**
   * Calculate price for a product (supports product-specific or global markup)
   */
  async calculatePrice(
    dto: CalculatePriceDto
  ): Promise<PriceCalculationResult> {
    const response = await this.client.post<PriceCalculationResult>(
      '/pricing/calculate',
      dto
    );
    return response.data!;
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string): Promise<any[]> {
    const response = await this.client.get<any[]>(
      `/pricing/history/${productId}`
    );
    return response.data!;
  }
}
