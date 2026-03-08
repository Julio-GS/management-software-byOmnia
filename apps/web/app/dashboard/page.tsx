'use client';

import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { KPICard } from '@/src/features/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSignIcon,
  ShoppingCartIcon,
  PackageIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  RotateCwIcon,
} from 'lucide-react';

export default function DashboardPage() {
  const { metrics, loading, error } = useDashboardMetrics(30000);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Error al cargar métricas: {error}</p>
        </div>
      </div>
    );
  }

  const { summary, topProducts, lowStock, revenueByCategory, salesTrends } = metrics;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Métricas</h1>
        <p className="text-sm text-muted-foreground">
          Actualización automática cada 30 segundos
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Ventas Hoy"
          value={summary?.totalSales || 0}
          change={summary?.changeVsYesterday}
          icon={<ShoppingCartIcon className="h-4 w-4" />}
          type="number"
        />
        <KPICard
          title="Ingresos Hoy"
          value={summary?.totalRevenue || 0}
          change={summary?.changeVsYesterday}
          icon={<DollarSignIcon className="h-4 w-4" />}
          type="currency"
        />
        <KPICard
          title="Productos Vendidos"
          value={summary?.productsSold || 0}
          icon={<PackageIcon className="h-4 w-4" />}
          type="number"
        />
        <KPICard
          title="Alertas de Stock Bajo"
          value={lowStock.length}
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          type="number"
          status={lowStock.length === 0 ? 'good' : lowStock.length < 5 ? 'warning' : 'critical'}
        />
        <KPICard
          title="Valor Promedio de Venta"
          value={summary?.avgTransactionValue || 0}
          icon={<TrendingUpIcon className="h-4 w-4" />}
          type="currency"
        />
        <KPICard
          title="Tasa de Rotación"
          value={
            metrics.stockRotation.length > 0
              ? (
                  metrics.stockRotation.reduce((sum, item) => sum + item.rotationRate, 0) /
                  metrics.stockRotation.length
                ).toFixed(2)
              : 0
          }
          icon={<RotateCwIcon className="h-4 w-4" />}
          type="number"
          subtitle="Promedio general"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ventas (Últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('es-CO');
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') {
                      return [
                        new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(value),
                        'Ingresos',
                      ];
                    }
                    return [value, name === 'sales' ? 'Ventas' : 'Productos'];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#8884d8"
                  name="Ventas"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#82ca9d"
                  name="Ingresos"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="categoryName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Productos Más Vendidos (Hoy)</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-right p-2">Cantidad</th>
                    <th className="text-right p-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{product.name}</td>
                      <td className="text-right p-2">{product.quantitySold}</td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de ventas para hoy
            </p>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-left p-2">Categoría</th>
                    <th className="text-right p-2">Stock Actual</th>
                    <th className="text-right p-2">Stock Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 10).map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="p-2">{product.name}</td>
                      <td className="p-2">{product.categoryName || 'Sin categoría'}</td>
                      <td className="text-right p-2 font-semibold text-red-600">
                        {product.currentStock}
                      </td>
                      <td className="text-right p-2">{product.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lowStock.length > 10 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Y {lowStock.length - 10} productos más con stock bajo
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
