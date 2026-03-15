/**
 * Sync Types for Omnia Management System
 * 
 * Types for synchronization between offline devices
 * and the backend server.
 */

import { BaseEntity } from './common.types';

/**
 * Entity types that can be synchronized
 */
export type SyncEntityType = 'product' | 'sale' | 'inventory' | 'category' | 'user';

/**
 * Sync operations
 */
export type SyncOperation = 'create' | 'update' | 'delete';

/**
 * Sync status
 */
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'conflict';

/**
 * Sync log entity - records synchronization events
 */
export interface SyncLog extends BaseEntity {
  deviceId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  status: SyncStatus;
  data: any;
  error: string | null;
  retryCount: number;
  lastRetryAt: string | null;
}

/**
 * DTO for creating a sync log
 */
export interface CreateSyncLogDto {
  deviceId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  data?: any;
}

/**
 * Sync delta request - get changes since timestamp
 */
export interface SyncDeltaRequest {
  deviceId: string;
  lastSyncTimestamp: string;
  entityTypes?: SyncEntityType[];
}

/**
 * Sync delta response - changes to apply
 */
export interface SyncDeltaResponse {
  timestamp: string;
  changes: Array<{
    entityType: SyncEntityType;
    operation: SyncOperation;
    entityId: string;
    data: any;
  }>;
  hasMore: boolean;
}

/**
 * Sync queue item (for offline operations)
 */
export interface SyncQueueItem {
  id: string;
  deviceId: string;
  entityType: SyncEntityType;
  operation: SyncOperation;
  entityId: string;
  data: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
}

/**
 * Sync status summary
 */
export interface SyncStatusSummary {
  deviceId: string;
  lastSyncAt: string | null;
  pendingChanges: number;
  failedChanges: number;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Conflict resolution
 */
export interface SyncConflict {
  entityType: SyncEntityType;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  timestamp: string;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 'local' | 'remote' | 'merge' | 'manual';

/**
 * Resolve conflict DTO
 */
export interface ResolveSyncConflictDto {
  entityType: SyncEntityType;
  entityId: string;
  resolution: ConflictResolution;
  mergedData?: any;
}
