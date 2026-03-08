'use client';

import { useState, useEffect, useCallback } from 'react';
import { isElectron, getElectronAPISafe } from '@/lib/electron';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncStatusData {
  status: SyncStatus;
  queuedItems: number;
  connected: boolean;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('offline');
  const [queuedItems, setQueuedItems] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;

    const api = getElectronAPISafe();
    if (!api?.sync) return;

    // Initial status fetch
    api.sync.getStatus().then((result) => {
      if (result.success) {
        setConnected(result.data.connected);
        setStatus(result.data.online ? 'online' : 'offline');
        setQueuedItems(result.data.queuedItems || 0);
      }
    });

    // Listen for status updates
    api.sync.onStatus((data: any) => {
      setStatus(data.status);
      setQueuedItems(data.queuedItems || 0);
      setConnected(data.connected !== false);
    });
  }, []);

  const forceSync = useCallback(async (): Promise<void> => {
    if (!isElectron()) {
      throw new Error('Sync API only available in Electron environment');
    }

    const api = getElectronAPISafe();
    if (!api?.sync) {
      throw new Error('Sync API not available');
    }

    setStatus('syncing');
    
    const result = await api.sync.forceSync();
    
    if (!result.success) {
      setStatus('error');
      throw new Error(result.error || 'Failed to sync');
    }
    
    setStatus('online');
  }, []);

  const clearQueue = useCallback(async (): Promise<void> => {
    if (!isElectron()) {
      throw new Error('Sync API only available in Electron environment');
    }

    const api = getElectronAPISafe();
    if (!api?.sync) {
      throw new Error('Sync API not available');
    }

    const result = await api.sync.clearQueue();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to clear queue');
    }

    setQueuedItems(0);
  }, []);

  return { 
    status, 
    queuedItems, 
    connected,
    forceSync,
    clearQueue,
    isAvailable: isElectron(),
  };
}
