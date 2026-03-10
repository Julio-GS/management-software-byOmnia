import Database from 'better-sqlite3';
import { ProductsRepository, Product } from '@omnia/local-db';
import { getLogger } from '../utils/logger';
import { LocalPricingService } from './local-pricing.service';

const logger = getLogger();

/**
 * Parameters for searching products
 */
export interface SearchParams {
  search?: string;
  categoryId?: string;
  inStock?: boolean;
}

/**
 * Local products service - handles product operations offline
 * 
 * Provides product search, barcode lookup, and markup management
 */
export class LocalProductsService {
  private productsRepo: ProductsRepository;
  private pricingService: LocalPricingService;

  constructor(db: Database.Database) {
    this.productsRepo = new ProductsRepository(db);
    this.pricingService = new LocalPricingService(db);
  }

  /**
   * Search products by barcode
   * 
   * @param barcode Product barcode
   * @returns Product if found, null otherwise
   */
  async searchByBarcode(barcode: string): Promise<Product | null> {
    try {
      if (!barcode || barcode.trim() === '') {
        throw new Error('Barcode cannot be empty');
      }

      const product = this.productsRepo.findByBarcode(barcode.trim());
      
      if (product) {
        logger.debug(`Found product by barcode ${barcode}: ${product.name}`);
      } else {
        logger.debug(`No product found with barcode ${barcode}`);
      }

      return product;
    } catch (error) {
      logger.error('Failed to search by barcode:', error);
      throw new Error(`Failed to search by barcode: ${(error as Error).message}`);
    }
  }

  /**
   * Search products by name or barcode
   * 
   * @param params Search parameters
   * @returns Array of matching products
   */
  async search(params: SearchParams): Promise<Product[]> {
    try {
      const { search, categoryId, inStock } = params;

      const products = this.productsRepo.search({
        search,
        categoryId,
        inStock,
      });

      logger.debug(`Found ${products.length} products matching search criteria`);

      return products;
    } catch (error) {
      logger.error('Failed to search products:', error);
      throw new Error(`Failed to search products: ${(error as Error).message}`);
    }
  }

  /**
   * Get all products
   * 
   * @returns Array of all products
   */
  async getAll(): Promise<Product[]> {
    try {
      const products = this.productsRepo.findAll();
      logger.debug(`Retrieved ${products.length} products`);
      return products;
    } catch (error) {
      logger.error('Failed to get all products:', error);
      throw new Error(`Failed to get all products: ${(error as Error).message}`);
    }
  }

  /**
   * Get product by ID
   * 
   * @param productId Product ID
   * @returns Product if found, null otherwise
   */
  async getById(productId: string): Promise<Product | null> {
    try {
      const product = this.productsRepo.findById(productId);
      return product;
    } catch (error) {
      logger.error('Failed to get product by ID:', error);
      throw new Error(`Failed to get product by ID: ${(error as Error).message}`);
    }
  }

  /**
   * Get products by category
   * 
   * @param categoryId Category ID
   * @returns Array of products in category
   */
  async getByCategory(categoryId: string): Promise<Product[]> {
    try {
      const products = this.productsRepo.findByCategory(categoryId);
      logger.debug(`Found ${products.length} products in category ${categoryId}`);
      return products;
    } catch (error) {
      logger.error('Failed to get products by category:', error);
      throw new Error(`Failed to get products by category: ${(error as Error).message}`);
    }
  }

  /**
   * Update product markup and recalculate price
   * 
   * When a product-specific markup is set:
   * 1. Store the markup in settings
   * 2. Recalculate the product price using the new markup
   * 3. Update the product price in the database
   * 
   * @param productId Product ID
   * @param markupPercentage Markup percentage (or null to remove product markup)
   * @returns Updated product
   */
  async updateMarkup(productId: string, markupPercentage: number | null): Promise<Product> {
    try {
      // Validate product exists
      const product = this.productsRepo.findById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Update markup in settings
      await this.pricingService.updateProductMarkup(productId, markupPercentage);

      // Recalculate price with new markup
      const cost = parseFloat(product.cost || '0');
      const priceResult = await this.pricingService.calculatePrice({
        cost,
        productId,
        categoryId: product.categoryId || undefined,
      });

      // Update product price
      const updated = this.productsRepo.update(productId, {
        price: priceResult.suggestedPrice.toString(),
      });

      if (!updated) {
        throw new Error('Failed to update product price');
      }

      logger.info(
        `Updated markup for product ${productId} to ${markupPercentage}%, new price: ${priceResult.suggestedPrice}`
      );

      return updated;
    } catch (error) {
      logger.error('Failed to update product markup:', error);
      throw new Error(`Failed to update product markup: ${(error as Error).message}`);
    }
  }

  /**
   * Get low stock products
   * 
   * @param threshold Stock threshold (default: 10)
   * @returns Array of products with stock below threshold
   */
  async getLowStock(threshold: number = 10): Promise<Product[]> {
    try {
      const products = this.productsRepo.getLowStock(threshold);
      logger.debug(`Found ${products.length} products with low stock`);
      return products;
    } catch (error) {
      logger.error('Failed to get low stock products:', error);
      throw new Error(`Failed to get low stock products: ${(error as Error).message}`);
    }
  }
}
