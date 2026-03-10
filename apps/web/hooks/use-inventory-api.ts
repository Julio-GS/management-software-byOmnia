'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client-instance';
import type { 
  InventoryMovement, 
  CreateInventoryMovementRequest 
} from '@omnia/shared-types';

/**
 * Inventory API Hook
 * 
 * Unified hook for both web and Electron environments.
 * Uses the centralized API client which automatically handles environment detection.
 */
export function useInventoryAPI() {
  const createMovement = useCallback(async (
    params: CreateInventoryMovementRequest
  ): Promise<InventoryMovement> => {
    return await apiClient.inventory.createMovement(params);
  }, []);

  const getMovements = useCallback(
    async (
      productId: string, 
      type?: 'ENTRY' | 'EXIT' | 'ADJUSTMENT', 
      limit = 50
    ): Promise<InventoryMovement[]> => {
      return await apiClient.inventory.getMovements(productId, type, limit);
    },
    []
  );

  const getLowStockProducts = useCallback(
    async (threshold?: number) => {
      return await apiClient.inventory.getLowStock(threshold);
    },
    []
  );

  return { 
    createMovement, 
    getMovements,
    getLowStockProducts,
  };
}
