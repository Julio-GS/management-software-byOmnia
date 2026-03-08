'use client';

import { useEffect } from 'react';
import { isElectron, getElectronAPISafe } from '@/lib/electron';
import { toast } from './use-toast';

export interface RealtimeUpdateCallbacks {
  onProductCreated?: (product: any) => void;
  onProductUpdated?: (product: any) => void;
  onProductDeleted?: (product: any) => void;
  onCategoryCreated?: (category: any) => void;
  onCategoryUpdated?: (category: any) => void;
  onCategoryDeleted?: (category: any) => void;
  onInventoryMovement?: (movement: any) => void;
  onPricingRecalculated?: (data: { type: string; count: number }) => void;
}

/**
 * Hook to listen for real-time updates from Electron WebSocket
 * Automatically shows toast notifications for pricing recalculations
 */
export function useRealtimeUpdates(callbacks?: RealtimeUpdateCallbacks) {
  useEffect(() => {
    if (!isElectron()) return;

    const api = getElectronAPISafe();
    if (!api?.on) return;

    // Product events
    if (callbacks?.onProductCreated) {
      api.on.productCreated(callbacks.onProductCreated);
    }

    if (callbacks?.onProductUpdated) {
      api.on.productUpdated(callbacks.onProductUpdated);
    }

    if (callbacks?.onProductDeleted) {
      api.on.productDeleted(callbacks.onProductDeleted);
    }

    // Category events
    if (callbacks?.onCategoryCreated) {
      api.on.categoryCreated(callbacks.onCategoryCreated);
    }

    if (callbacks?.onCategoryUpdated) {
      api.on.categoryUpdated(callbacks.onCategoryUpdated);
    }

    if (callbacks?.onCategoryDeleted) {
      api.on.categoryDeleted(callbacks.onCategoryDeleted);
    }

    // Inventory events
    if (callbacks?.onInventoryMovement) {
      api.on.inventoryMovement(callbacks.onInventoryMovement);
    }

    // Pricing events with automatic toast
    const handlePricingRecalculated = (data: { type: string; count: number }) => {
      toast({
        title: 'Prices Updated',
        description: `${data.count} product prices recalculated`,
      });
      
      callbacks?.onPricingRecalculated?.(data);
    };

    api.on.pricingRecalculated(handlePricingRecalculated);

    // Note: Electron IPC doesn't return cleanup functions, 
    // but listeners are automatically cleaned up when component unmounts
  }, [callbacks]);
}
