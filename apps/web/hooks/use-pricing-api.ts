'use client';

import { useCallback } from 'react';
import { isElectron, getElectronAPISafe } from '@/lib/electron';

export interface PriceCalculation {
  calculatedPrice: number;
  suggestedPrice: number;
  markupPercentage: number;
  markupSource: 'product' | 'category' | 'global';
}

export function usePricingAPI() {
  const calculatePrice = useCallback(
    async (cost: number, productId?: string, categoryId?: string): Promise<PriceCalculation> => {
      if (!isElectron()) {
        throw new Error('Pricing API only available in Electron environment');
      }

      const api = getElectronAPISafe();
      if (!api?.pricing) {
        throw new Error('Pricing API not available');
      }

      const result = await api.pricing.calculate({ cost, productId, categoryId });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to calculate price');
      }

      return result.data as PriceCalculation;
    },
    []
  );

  const updateGlobalMarkup = useCallback(async (percentage: number): Promise<void> => {
    if (!isElectron()) {
      throw new Error('Pricing API only available in Electron environment');
    }

    const api = getElectronAPISafe();
    if (!api?.pricing) {
      throw new Error('Pricing API not available');
    }

    const result = await api.pricing.updateGlobalMarkup({ percentage });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update global markup');
    }
  }, []);

  const recalculateCategory = useCallback(async (categoryId: string): Promise<number> => {
    if (!isElectron()) {
      throw new Error('Pricing API only available in Electron environment');
    }

    const api = getElectronAPISafe();
    if (!api?.pricing) {
      throw new Error('Pricing API not available');
    }

    const result = await api.pricing.recalculateCategory({ categoryId });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to recalculate category prices');
    }

    return result.data.count;
  }, []);

  return { 
    calculatePrice, 
    updateGlobalMarkup, 
    recalculateCategory,
    isAvailable: isElectron(),
  };
}
