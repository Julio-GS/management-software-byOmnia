import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Prisma Service
 * 
 * Extended PrismaClient with:
 * - Transaction helpers with custom isolation levels
 * - Lifecycle hooks (connect/disconnect)
 * 
 * NOTE: Soft delete middleware requires Prisma Client Extensions.
 * Implementation moved to individual repositories to avoid global side effects.
 * 
 * Usage:
 * ```typescript
 * // Transaction with helper
 * await prisma.runInTransaction(async (tx) => {
 *   await tx.productos.create({ data: {...} });
 *   await tx.movimientos_inventario.create({ data: {...} });
 * }, { isolationLevel: 'Serializable' });
 * ```
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Run a callback within a database transaction
   * 
   * @param callback Function to execute within transaction context
   * @param options Transaction options (isolationLevel, maxWait, timeout)
   * @returns Result of the callback function
   * 
   * @example
   * ```typescript
   * const result = await prisma.runInTransaction(async (tx) => {
   *   const product = await tx.productos.create({ data: {...} });
   *   await tx.movimientos_inventario.create({ data: {...} });
   *   return product;
   * }, { isolationLevel: 'Serializable' });
   * ```
   */
  async runInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      isolationLevel?: Prisma.TransactionIsolationLevel;
      maxWait?: number;
      timeout?: number;
    },
  ): Promise<T> {
    return this.$transaction(callback, options);
  }

  /**
   * Enable soft delete behavior (placeholder for documentation)
   * 
   * NOTE: Actual soft-delete implementation should be done via:
   * 1. Prisma Client Extensions ($extends), OR
   * 2. Repository-level WHERE filters (deleted_at IS NULL)
   * 
   * This method is a no-op for now. Migration to Client Extensions
   * will be done in Phase 2.
   */
  enableSoftDelete(): void {
    // Placeholder for future Prisma Client Extension implementation
    // See: https://www.prisma.io/docs/orm/prisma-client/client-extensions
  }
}
