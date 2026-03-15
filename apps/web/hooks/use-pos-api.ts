'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client-instance';
import type { Product, CreateSaleDto, Sale, CancelSaleResponse } from '@omnia/shared-types';

/**
 * POS API Hook
 *
 * Provides all API calls needed for the Point of Sale screen:
 * - Product search by name/SKU/barcode
 * - Barcode lookup
 * - Sale creation
 * - Sale cancellation
 *
 * isLoading and error are shared across all methods.
 * Methods that are "safe" (search, barcode) return empty/null on error.
 * Methods that mutate state (createSale, cancelSale) throw so the caller can handle.
 */
export function usePosApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search products by query string (name, SKU or barcode).
   * Returns an empty array on error — does NOT throw.
   */
  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.products.getAll(
        { search: query, active: true },
        { limit: 10 }
      );
      return response.items;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al buscar productos';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Find a product by its barcode.
   * Returns null on 404 — throws on other errors.
   */
  const findByBarcode = useCallback(async (barcode: string): Promise<Product | null> => {
    setIsLoading(true);
    setError(null);
    try {
      // ProductsService.getByBarcode already handles 404 → null
      return await apiClient.products.getByBarcode(barcode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al buscar por codigo de barras';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new sale (POS checkout).
   * THROWS on error — caller is responsible for handling.
   */
  const createSale = useCallback(async (dto: CreateSaleDto): Promise<Sale> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiClient.sales.create(dto);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la venta';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancel an existing sale.
   * THROWS on error — caller is responsible for handling.
   */
  const cancelSale = useCallback(async (saleId: string): Promise<CancelSaleResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiClient.sales.cancel(saleId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la venta';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    searchProducts,
    findByBarcode,
    createSale,
    cancelSale,
  };
}
