'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client-instance';
import type { PriceCalculation, PricingStrategy } from '@omnia/shared-types';

/**
 * Pricing API Hook
 * 
 * Unified hook for both web and Electron environments.
 * Uses the centralized API client which automatically handles environment detection.
 */
export function usePricingAPI() {
  const calculatePrice = useCallback(
    async (
      cost: number, 
      productId?: string, 
      categoryId?: string
    ): Promise<PriceCalculation> => {
      return await apiClient.pricing.calculatePrice({ 
        cost, 
        productId, 
        categoryId 
      });
    },
    []
  );

  const updateGlobalMarkup = useCallback(
    async (percentage: number): Promise<void> => {
      await apiClient.pricing.updateGlobalMarkup({ percentage });
    }, 
    []
  );

  const recalculateCategory = useCallback(
    async (categoryId: string): Promise<number> => {
      const result = await apiClient.pricing.recalculateCategoryPrices(categoryId);
      return result.count;
    }, 
    []
  );

  const getPriceHistory = useCallback(
    async (productId: string, limit?: number) => {
      return await apiClient.pricing.getPriceHistory(productId, limit);
    },
    []
  );

  const getStrategies = useCallback(
    async (): Promise<PricingStrategy[]> => {
      return await apiClient.pricing.getStrategies();
    },
    []
  );

  return { 
    calculatePrice, 
    updateGlobalMarkup, 
    recalculateCategory,
    getPriceHistory,
    getStrategies,
  };
}
