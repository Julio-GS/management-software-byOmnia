import { useState, useEffect } from 'react';

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  productsSold: number;
  avgTransactionValue: number;
  changeVsYesterday: number;
}

export interface TopProduct {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  categoryName?: string;
}

export interface StockRotation {
  productId: string;
  productName: string;
  averageDailySales: number;
  currentStock: number;
  daysUntilStockout: number;
  rotationRate: number;
}

export interface RevenueByCategory {
  categoryId: string;
  categoryName: string;
  revenue: number;
  salesCount: number;
  percentage: number;
}

export interface SalesTrend {
  date: string;
  sales: number;
  revenue: number;
  productsSold: number;
}

export interface DashboardMetrics {
  summary: SalesSummary | null;
  topProducts: TopProduct[];
  lowStock: LowStockProduct[];
  stockRotation: StockRotation[];
  revenueByCategory: RevenueByCategory[];
  salesTrends: SalesTrend[];
}

export function useDashboardMetrics(refreshInterval: number = 30000) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    summary: null,
    topProducts: [],
    lowStock: [],
    stockRotation: [],
    revenueByCategory: [],
    salesTrends: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && window.electron) {
        // Fetch all metrics in parallel
        const [summary, topProducts, lowStock, stockRotation, revenueByCategory, salesTrends] =
          await Promise.all([
            window.electron.invoke('api:get', '/reports/sales-summary?period=today'),
            window.electron.invoke('api:get', '/reports/top-products?limit=5'),
            window.electron.invoke('api:get', '/reports/low-stock'),
            window.electron.invoke('api:get', '/reports/stock-rotation'),
            window.electron.invoke('api:get', '/reports/revenue-by-category'),
            window.electron.invoke('api:get', '/reports/sales-trends?days=7'),
          ]);

        setMetrics({
          summary: summary || null,
          topProducts: topProducts || [],
          lowStock: lowStock || [],
          stockRotation: stockRotation || [],
          revenueByCategory: revenueByCategory || [],
          salesTrends: salesTrends || [],
        });
      } else {
        // Fallback for web environment (fetch from API directly)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const [summary, topProducts, lowStock, stockRotation, revenueByCategory, salesTrends] =
          await Promise.all([
            fetch(`${baseUrl}/reports/sales-summary?period=today`).then((r) => r.json()),
            fetch(`${baseUrl}/reports/top-products?limit=5`).then((r) => r.json()),
            fetch(`${baseUrl}/reports/low-stock`).then((r) => r.json()),
            fetch(`${baseUrl}/reports/stock-rotation`).then((r) => r.json()),
            fetch(`${baseUrl}/reports/revenue-by-category`).then((r) => r.json()),
            fetch(`${baseUrl}/reports/sales-trends?days=7`).then((r) => r.json()),
          ]);

        setMetrics({
          summary,
          topProducts,
          lowStock,
          stockRotation,
          revenueByCategory,
          salesTrends,
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { metrics, loading, error, refresh: fetchMetrics };
}
