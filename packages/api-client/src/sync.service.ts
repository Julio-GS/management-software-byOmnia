import { ApiClient } from './client';
import type { SyncStatusSummary, SyncDeltaResponse } from '@omnia/shared-types';

export class SyncService {
  constructor(private client: ApiClient) {}

  /**
   * Trigger a full sync (upload pending changes and download updates)
   */
  async sync(): Promise<SyncDeltaResponse> {
    const response = await this.client.post<SyncDeltaResponse>('/sync');
    return response.data!;
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatusSummary> {
    const response = await this.client.get<SyncStatusSummary>('/sync/status');
    return response.data!;
  }

  /**
   * Get sync history
   */
  async getHistory(limit: number = 10): Promise<any[]> {
    const response = await this.client.get<any[]>('/sync/history', {
      params: { limit },
    });
    return response.data!;
  }
}
