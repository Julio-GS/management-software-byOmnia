import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PricingRepository
 * 
 * Abstracts data access for pricing operations.
 * Handles interactions with products, categories, settings, and price history.
 */
@Injectable()
export class PricingRepository {
  private readonly logger = new Logger(PricingRepository.name);
  private readonly DEFAULT_GLOBAL_MARKUP = 30; // 30% default if no setting exists

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get global markup setting from the database.
   */
  async getGlobalMarkup(): Promise<number> {
    try {
      const setting = await this.prisma.settings.findUnique({
        where: { key: 'globalMarkup' },
      });

      if (setting && typeof setting.value === 'number') {
        return setting.value;
      }

      // If the value is stored as JSON, extract the number
      if (setting && typeof setting.value === 'object') {
        const value = setting.value as Record<string, unknown>;
        if (typeof value === 'number') {
          return value;
        }
      }

      this.logger.warn('Global markup setting not found, using default');
      return this.DEFAULT_GLOBAL_MARKUP;
    } catch (error) {
      this.logger.error('Error fetching global markup, using default', error);
      return this.DEFAULT_GLOBAL_MARKUP;
    }
  }

  /**
   * Update the global markup setting.
   */
  async updateGlobalMarkup(percentage: number): Promise<void> {
    await this.prisma.settings.upsert({
      where: { key: 'globalMarkup' },
      update: { value: percentage },
      create: {
        key: 'globalMarkup',
        value: percentage,
      },
    });

    this.logger.log(`Global markup updated to ${percentage}%`);
  }

  /**
   * Get product markup by ID.
   * Returns null if product not found or has no markup.
   */
  async getProductMarkup(productId: string): Promise<{ markup: number | null; categoryId: string | null } | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { markup: true, categoryId: true },
    });

    if (!product) {
      return null;
    }

    return {
      markup: product.markup ? Number(product.markup) : null,
      categoryId: product.categoryId,
    };
  }

  /**
   * Get category markup by ID.
   * Returns null if category not found or has no markup.
   */
  async getCategoryMarkup(categoryId: string): Promise<number | null> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { defaultMarkup: true },
    });

    return category?.defaultMarkup ? Number(category.defaultMarkup) : null;
  }

  /**
   * Get product details for price calculation.
   */
  async getProductForPriceCalculation(productId: string): Promise<{
    id: string;
    cost: number;
    categoryId: string | null;
    deletedAt: Date | null;
  } | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, cost: true, categoryId: true, deletedAt: true },
    });

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      cost: Number(product.cost),
      categoryId: product.categoryId,
      deletedAt: product.deletedAt,
    };
  }

  /**
   * Get all products in a category without specific markup (for bulk recalculation).
   */
  async getProductsInCategoryWithoutMarkup(categoryId: string): Promise<Array<{ id: string; cost: number }>> {
    const products = await this.prisma.product.findMany({
      where: {
        categoryId,
        markup: null, // Only products without specific markup
        deletedAt: null, // Only active products (not soft-deleted)
      },
      select: { id: true, cost: true },
    });

    return products.map(p => ({
      id: p.id,
      cost: Number(p.cost),
    }));
  }

  /**
   * Get all products that rely on global markup (for bulk recalculation).
   */
  async getProductsUsingGlobalMarkup(): Promise<Array<{ id: string; cost: number; categoryId: string | null }>> {
    const products = await this.prisma.product.findMany({
      where: {
        markup: null, // No product-specific markup
        deletedAt: null, // Only active products (not soft-deleted)
        OR: [
          { categoryId: null }, // No category assigned
          {
            category: {
              defaultMarkup: null, // Category exists but has no markup
            },
          },
        ],
      },
      select: { id: true, cost: true, categoryId: true },
    });

    return products.map(p => ({
      id: p.id,
      cost: Number(p.cost),
      categoryId: p.categoryId,
    }));
  }

  /**
   * Update product price.
   */
  async updateProductPrice(productId: string, price: number): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { price: new Decimal(price) },
    });
  }

  // NOTE: Price history methods commented out until priceHistory table is added to Prisma schema
  // These methods will be activated when price history tracking is implemented in the database

  /**
   * Create a price history record.
   * TODO: Uncomment when priceHistory table is added to Prisma schema
   */
  // async createPriceHistory(history: PriceHistory): Promise<PriceHistory> {
  //   const data = await this.prisma.priceHistory.create({
  //     data: {
  //       id: history.id,
  //       productId: history.productId,
  //       oldPrice: new Decimal(history.oldPrice),
  //       newPrice: new Decimal(history.newPrice),
  //       changeType: history.changeType,
  //       changedBy: history.changedBy,
  //       reason: history.reason,
  //       timestamp: history.timestamp,
  //     },
  //   });
  //
  //   return PriceHistory.fromPersistence(data);
  // }

  /**
   * Get price history for a specific product.
   * TODO: Uncomment when priceHistory table is added to Prisma schema
   */
  // async getPriceHistoryByProduct(productId: string): Promise<PriceHistory[]> {
  //   const records = await this.prisma.priceHistory.findMany({
  //     where: { productId },
  //     orderBy: { timestamp: 'desc' },
  //   });
  //
  //   return records.map(record => PriceHistory.fromPersistence(record));
  // }

  /**
   * Get all price history records (with optional limit).
   * TODO: Uncomment when priceHistory table is added to Prisma schema
   */
  // async getAllPriceHistory(limit?: number): Promise<PriceHistory[]> {
  //   const records = await this.prisma.priceHistory.findMany({
  //     orderBy: { timestamp: 'desc' },
  //     take: limit,
  //   });
  //
  //   return records.map(record => PriceHistory.fromPersistence(record));
  // }
}
