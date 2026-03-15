import { ApiClient, ApiClientConfig } from './client.js';
import { AuthService } from './auth.service.js';
import { ProductsService } from './products.service.js';
import { CategoriesService } from './categories.service.js';
import { InventoryService } from './inventory.service.js';
import { PricingService } from './pricing.service.js';
import { SalesService } from './sales.service.js';
import { ReportsService } from './reports.service.js';
import { SyncService } from './sync.service.js';
import { DashboardService } from './dashboard.service.js';

/**
 * Main API client for OMNIA Management System
 * 
 * Provides unified interface to all backend services.
 * 
 * @example
 * ```typescript
 * const client = new OmniaApiClient({
 *   baseURL: 'http://localhost:3001/api/v1',
 *   getToken: async () => localStorage.getItem('access_token'),
 *   onUnauthorized: () => router.push('/login')
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
  public dashboard: DashboardService;

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
    this.dashboard = new DashboardService(this.client);
  }

  /**
   * Get the underlying ApiClient instance for advanced usage
   */
  getClient(): ApiClient {
    return this.client;
  }
}

// Export main class
export { ApiClient, type ApiClientConfig } from './client.js';

// Export individual service classes for advanced usage
export { AuthService } from './auth.service.js';
export { ProductsService } from './products.service.js';
export { CategoriesService } from './categories.service.js';
export { InventoryService } from './inventory.service.js';
export { PricingService } from './pricing.service.js';
export { SalesService } from './sales.service.js';
export { ReportsService } from './reports.service.js';
export { SyncService } from './sync.service.js';
export { DashboardService } from './dashboard.service.js';

// Re-export shared types for convenience
export * from '@omnia/shared-types';
