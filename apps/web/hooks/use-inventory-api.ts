'use client';

import { useCallback } from 'react';
import { isElectron, getElectronAPISafe } from '@/lib/electron';

export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  notes?: string;
  userId?: string;
  createdAt: string;
}

export interface CreateMovementParams {
  productId: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
  userId?: string;
}

export function useInventoryAPI() {
  const createMovement = useCallback(async (params: CreateMovementParams): Promise<InventoryMovement> => {
    if (!isElectron()) {
      throw new Error('Inventory API only available in Electron environment');
    }

    const api = getElectronAPISafe();
    if (!api?.inventory) {
      throw new Error('Inventory API not available');
    }

    const result = await api.inventory.createMovement(params);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create inventory movement');
    }

    return result.data as InventoryMovement;
  }, []);

  const getMovements = useCallback(
    async (productId: string, type?: 'ENTRY' | 'EXIT' | 'ADJUSTMENT', limit = 50): Promise<InventoryMovement[]> => {
      if (!isElectron()) {
        throw new Error('Inventory API only available in Electron environment');
      }

      const api = getElectronAPISafe();
      if (!api?.inventory) {
        throw new Error('Inventory API not available');
      }

      const result = await api.inventory.getMovements({ productId, type, limit });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get inventory movements');
      }

      return result.data as InventoryMovement[];
    },
    []
  );

  return { 
    createMovement, 
    getMovements,
    isAvailable: isElectron(),
  };
}
