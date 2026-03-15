"use client"

import { useState, useEffect, useCallback } from "react"
import type { DashboardMetrics } from "@omnia/shared-types"
import { apiClient } from "@/lib/api-client-instance"

interface UseDashboardMetricsReturn {
  data: DashboardMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch dashboard metrics
 * 
 * Aggregates data from 4 API endpoints:
 * - GET /reports/sales-summary → totalSales
 * - GET /reports/low-stock → lowStockCount
 * - GET /reports/top-products → topProducts[]
 * - GET /products/total-value → inventoryValue
 */
export function useDashboardMetrics(): UseDashboardMetricsReturn {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const metrics = await apiClient.dashboard.getMetrics();
      setData(metrics);
    } catch (err) {
      console.error('[useDashboardMetrics] Error fetching dashboard metrics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard metrics'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}
