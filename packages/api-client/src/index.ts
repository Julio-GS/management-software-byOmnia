import { ApiClient, ApiClientConfig } from './client';
import { AuthService } from './auth.service';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { InventoryService } from './inventory.service';
import { PricingService } from './pricing.service';
import { SalesService } from './sales.service';
import { ReportsService } from './reports.service';
import { SyncService } from './sync.service';

/**
 * Main API client for OMNIA Management System
 * 
 * Auto-detects environment (web vs desktop) and provides unified interface
 * to all backend services.
 * 
 * @example
 * ```typescript
 * // Web usage
 * const client = new OmniaApiClient({
 *   baseURL: 'http://localhost:3001/api/v1',
 *   getToken: async () => localStorage.getItem('access_token'),
 *   onUnauthorized: () => router.push('/login')
 * });
 * 
 * // Desktop usage
 * const client = new OmniaApiClient({
 *   baseURL: process.env.API_URL,
 *   getToken: async () => getStoredTokens()?.access_token || null,
 *   environment: 'desktop'
 * });
 * 
 * // Use services
 * const products = await client.products.getAll();
 * const sale = await client.sales.create(saleData);
 * ```
 */
export class OmniaApiClient {
  public auth: AuthService;
  public products: ProductsService;
  public categories: CategoriesService;
  public inventory: InventoryService;
  public pricing: PricingService;
  public sales: SalesService;
  public reports: ReportsService;
  public sync: SyncService;

  private client: ApiClient;

  constructor(config: ApiClientConfig) {
    this.client = new ApiClient(config);

    // Initialize all services
    this.auth = new AuthService(this.client);
    this.products = new ProductsService(this.client);
    this.categories = new CategoriesService(this.client);
    this.inventory = new InventoryService(this.client);
    this.pricing = new PricingService(this.client);
    this.sales = new SalesService(this.client);
    this.reports = new ReportsService(this.client);
    this.sync = new SyncService(this.client);
  }

  /**
   * Get the underlying ApiClient instance for advanced usage
   */
  getClient(): ApiClient {
    return this.client;
  }
}

// Export main class
export { ApiClient, type ApiClientConfig } from './client';

// Export individual service classes for advanced usage
export { AuthService } from './auth.service';
export { ProductsService } from './products.service';
export { CategoriesService } from './categories.service';
export { InventoryService } from './inventory.service';
export { PricingService } from './pricing.service';
export { SalesService } from './sales.service';
export { ReportsService } from './reports.service';
export { SyncService } from './sync.service';

// Re-export shared types for convenience
export * from '@omnia/shared-types';
