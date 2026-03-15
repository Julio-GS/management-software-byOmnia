'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client-instance';
import type { PriceCalculationResult, PricingStrategy } from '@omnia/shared-types';

// Export the type alias for components
export type PriceCalculation = PriceCalculationResult;

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
    async (markup: number): Promise<void> => {
      await apiClient.pricing.updateGlobalMarkup({ markup });
    }, 
    []
  );

  const getPriceHistory = useCallback(
    async (productId: string, limit?: number) => {
      return await apiClient.pricing.getPriceHistory(productId);
    },
    []
  );

  return { 
    calculatePrice, 
    updateGlobalMarkup, 
    getPriceHistory,
  };
}
