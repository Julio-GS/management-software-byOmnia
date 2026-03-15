"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
  DollarSign,
  ShoppingCart,
  PackageMinus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
} from "lucide-react"
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics"
import { formatCurrency, formatNumber } from "@/shared/utils/utils"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Button } from "@/shared/components/ui/button"

interface StatCard {
  title: string
  value: string
  change?: string
  trend?: "up" | "down"
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

export function DashboardMobileView() {
  const { data, isLoading, error, refetch } = useDashboardMetrics()
  const haptic = useHapticFeedback()

  const handleRefresh = async () => {
    haptic.trigger("light")
    await refetch()
    haptic.trigger("success")
  }

  // Build alerts from real low stock data
  const alerts = data?.lowStockItems.slice(0, 5).map((item, index) => ({
    id: item.id,
    type: "stock" as const,
    message: `${item.name} - Stock crítico`,
    detail: `${item.currentStock} unid. / min: ${item.minStock}`,
    time: `Hace ${(index + 1) * 15} min`,
  })) || []

  // Build stats from real data
  const stats: StatCard[] = data ? [
    {
      title: "Ventas Totales",
      value: formatCurrency(data.totalSales),
      change: data.changeVsYesterday > 0 ? `+${data.changeVsYesterday.toFixed(1)}%` : `${data.changeVsYesterday.toFixed(1)}%`,
      trend: data.changeVsYesterday >= 0 ? "up" : "down",
      icon: DollarSign,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Productos Bajo Stock",
      value: formatNumber(data.lowStockCount),
      icon: PackageMinus,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-600",
    },
    {
      title: "Valor Inventario",
      value: formatCurrency(data.inventoryValue),
      change: data.inventoryChange > 0 ? `+${data.inventoryChange.toFixed(1)}%` : `${data.inventoryChange.toFixed(1)}%`,
      trend: data.inventoryChange >= 0 ? "up" : "down",
      icon: TrendingUp,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      title: "Transacciones",
      value: formatNumber(data.transactionCount),
      change: data.changeVsYesterday > 0 ? `+${data.changeVsYesterday.toFixed(1)}%` : `${data.changeVsYesterday.toFixed(1)}%`,
      trend: data.changeVsYesterday >= 0 ? "up" : "down",
      icon: ShoppingCart,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
    },
  ] : []

  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive mb-2">
            Error al cargar datos
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {error.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('es-AR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-9 w-9"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* KPI Cards - Vertical Stack */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-muted rounded mb-2" />
                      <div className="h-6 w-32 bg-muted rounded" />
                    </div>
                    <div className="h-12 w-12 bg-muted rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          stats.map((stat) => (
            <Card 
              key={stat.title} 
              className="border-border bg-card shadow-sm active:scale-[0.98] transition-transform"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left: Title and Value */}
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {stat.title}
                    </span>
                    <span className="font-mono text-xl font-bold text-card-foreground">
                      {stat.value}
                    </span>
                    {stat.change && (
                      <div className="flex items-center gap-1 mt-1">
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="h-3 w-3 text-success-foreground" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-destructive" />
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            stat.trend === "up"
                              ? "text-success-foreground"
                              : "text-destructive"
                          }`}
                        >
                          {stat.change}
                        </span>
                        <span className="text-xs text-muted-foreground">vs. ayer</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Icon */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.iconBg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Alerts Section */}
      {data && data.lowStockCount > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Alertas Críticas
            </h2>
            <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-xs" variant="outline">
              {data.lowStockCount}
            </Badge>
          </div>

          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <Card 
                key={alert.id}
                className="border-border bg-card shadow-sm active:scale-[0.98] transition-transform"
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                      <PackageMinus className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-medium text-card-foreground truncate">
                        {alert.message}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {alert.detail}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {alert.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for alerts */}
      {data && data.lowStockCount === 0 && (
        <Card className="border-dashed border-2 mt-2">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Sin alertas críticas</p>
              <p className="text-xs text-muted-foreground">
                Todos los productos tienen stock suficiente
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
