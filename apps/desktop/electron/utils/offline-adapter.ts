import { syncService } from '../sync/sync-service';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * Options for online/offline routing
 */
export interface OnlineOfflineOptions {
  /**
   * Force offline mode regardless of actual online status
   * Useful for testing offline functionality
   */
  forceOffline?: boolean;
  
  /**
   * Log when fallback to offline mode occurs
   */
  logFallback?: boolean;
}

/**
 * Adapter utility to route requests between online (backend API) and offline (local services)
 * 
 * This function checks the online status and routes to the appropriate handler:
 * - Online: Execute onlineHandler (calls backend via apiClient)
 * - Offline: Execute offlineHandler (uses local services and SQLite)
 * 
 * @template T The return type of both handlers
 * @param onlineHandler Function to execute when online (calls backend)
 * @param offlineHandler Function to execute when offline (uses local DB)
 * @param options Optional configuration for routing behavior
 * @returns Promise resolving to the result from either handler
 * 
 * @example
 * ```typescript
 * const result = await handleOnlineOffline(
 *   // Online: call backend
 *   async () => apiClient.pricing.calculatePrice({ cost: 100, productId: '123' }),
 *   // Offline: use local service
 *   async () => localPricingService.calculatePrice({ cost: 100, productId: '123' }),
 *   { logFallback: true }
 * );
 * ```
 */
export async function handleOnlineOffline<T>(
  onlineHandler: () => Promise<T>,
  offlineHandler: () => Promise<T>,
  options?: OnlineOfflineOptions
): Promise<T> {
  const { forceOffline = false, logFallback = false } = options || {};

  // Determine if we should use online or offline mode
  const isOnline = !forceOffline && syncService.getOnlineStatus();

  if (isOnline) {
    try {
      // Try online handler first
      return await onlineHandler();
    } catch (error) {
      // If online handler fails, fall back to offline
      if (logFallback) {
        logger.warn('Online handler failed, falling back to offline mode:', error);
      }
      return await offlineHandler();
    }
  } else {
    // Use offline handler directly
    if (logFallback && !forceOffline) {
      logger.info('Device is offline, using local services');
    }
    return await offlineHandler();
  }
}
