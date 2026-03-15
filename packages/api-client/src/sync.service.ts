import { ApiClient } from './client.js';
import type { SyncStatusSummary, SyncDeltaResponse } from '@omnia/shared-types';

export class SyncService {
  constructor(private client: ApiClient) {}

  /**
   * Trigger a full sync (upload pending changes and download updates)
   */
  async sync(): Promise<SyncDeltaResponse> {
    return this.client.post<SyncDeltaResponse>('/sync');
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatusSummary> {
    return this.client.get<SyncStatusSummary>('/sync/status');
  }

  /**
   * Get sync history
   */
  async getHistory(limit: number = 10): Promise<any[]> {
    return this.client.get<any[]>('/sync/history', {
      params: { limit },
    });
  }
}
