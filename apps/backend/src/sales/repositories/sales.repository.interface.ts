import { Sale } from '../entities/sale.entity';

/**
 * ISalesRepository
 * 
 * Repository interface for Sales data access.
 * Defines contracts for persistence operations without exposing Prisma dependencies.
 */
export interface ISalesRepository {
  /**
   * Create a new sale.
   * @throws RepositoryException on database errors
   */
  create(dto: {
    saleNumber: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      productName: string;
    }>;
    total: number;
    paymentMethod: string;
    status: string;
    userId?: string;
  }): Promise<Sale>;

  /**
   * Find a sale by ID.
   * @returns Sale entity or null if not found
   */
  findById(id: string): Promise<Sale | null>;

  /**
   * Update an existing sale.
   * @throws RepositoryException if sale not found or on database errors
   */
  update(id: string, data: Partial<{
    status: string;
  }>): Promise<Sale>;

  /**
   * Cancel a sale (updates status and sets cancelledAt).
   * @throws RepositoryException if sale not found or already cancelled
   */
  cancel(id: string, userId: string): Promise<Sale>;

  /**
   * Find sales by date range.
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;

  /**
   * Find all sales with optional filters.
   */
  findAll(filters?: {
    status?: string;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Sale[]>;
}
