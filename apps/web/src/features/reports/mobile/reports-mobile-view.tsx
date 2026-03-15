"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShoppingCart,
  Download,
  BarChart,
  LineChart,
  TrendingUp as TrendingUpIcon,
} from "lucide-react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
} from "recharts"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

const weeklySalesData = [
  { day: "Lun", ventas: 385200, transacciones: 132 },
  { day: "Mar", ventas: 412500, transacciones: 148 },
  { day: "Mie", ventas: 398700, transacciones: 141 },
  { day: "Jue", ventas: 445100, transacciones: 159 },
  { day: "Vie", ventas: 523800, transacciones: 187 },
  { day: "Sab", ventas: 612300, transacciones: 218 },
  { day: "Dom", ventas: 487250, transacciones: 164 },
]

const monthlyTrendData = [
  { month: "Sep", ventas: 8200000 },
  { month: "Oct", ventas: 9100000 },
  { month: "Nov", ventas: 9800000 },
  { month: "Dic", ventas: 12500000 },
  { month: "Ene", ventas: 10200000 },
  { month: "Feb", ventas: 11400000 },
]

const topProducts = [
  { rank: 1, name: "Leche Entera La Serenisima 1L", units: 487, revenue: 608750, trend: "up" as const },
  { rank: 2, name: "Coca-Cola 2.25L", units: 312, revenue: 733200, trend: "up" as const },
  { rank: 3, name: "Pan Lactal Bimbo 500g", units: 289, revenue: 606900, trend: "down" as const },
  { rank: 4, name: "Aceite Girasol Cocinero 1.5L", units: 198, revenue: 683100, trend: "up" as const },
  { rank: 5, name: "Fideos Matarazzo Spaghetti 500g", units: 176, revenue: 332640, trend: "down" as const },
]

const cashierPerformance = [
  { name: "Maria Garcia", transactions: 164, total: 487250, avgTicket: 2971, shift: "Manana" },
  { name: "Carlos Lopez", transactions: 142, total: 423100, avgTicket: 2979, shift: "Tarde" },
  { name: "Ana Rodriguez", transactions: 138, total: 398500, avgTicket: 2888, shift: "Manana" },
  { name: "Pedro Martinez", transactions: 121, total: 345200, avgTicket: 2853, shift: "Noche" },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold text-card-foreground">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function ReportsMobileView() {
  const haptic = useHapticFeedback()
  const [period, setPeriod] = useState("week")
  const [activeTab, setActiveTab] = useState<"summary" | "products" | "cashiers" | "trend">("summary")

  const totalWeekly = weeklySalesData.reduce((acc, d) => acc + d.ventas, 0)
  const totalTransactions = weeklySalesData.reduce((acc, d) => acc + d.transacciones, 0)
  const avgTicket = Math.round(totalWeekly / totalTransactions)

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    haptic.trigger("light")
  }

  const handleTabChange = (tab: "summary" | "products" | "cashiers" | "trend") => {
    setActiveTab(tab)
    haptic.trigger("light")
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Reportes</h1>
        </div>
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
        <button
          onClick={() => handleTabChange("summary")}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            activeTab === "summary" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => handleTabChange("products")}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            activeTab === "products" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => handleTabChange("cashiers")}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            activeTab === "cashiers" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Cajeros
        </button>
        <button
          onClick={() => handleTabChange("trend")}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            activeTab === "trend" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Tendencia
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="flex flex-col gap-4">
          {/* KPI Cards */}
          <div className="flex flex-col gap-3">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Ventas Semana</span>
                    <span className="font-mono text-xl font-bold text-card-foreground">
                      {formatCurrency(totalWeekly)}
                    </span>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-success-foreground" />
                  <span className="text-xs font-semibold text-success-foreground">+8.3%</span>
                  <span className="text-xs text-muted-foreground">vs. semana anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Transacciones</span>
                    <span className="font-mono text-xl font-bold text-card-foreground">
                      {totalTransactions.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-chart-2/10">
                    <ShoppingCart className="h-5 w-5 text-chart-2" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-success-foreground" />
                  <span className="text-xs font-semibold text-success-foreground">+5.1%</span>
                  <span className="text-xs text-muted-foreground">vs. semana anterior</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Ticket Promedio</span>
                    <span className="font-mono text-lg font-bold text-card-foreground">
                      {formatCurrency(avgTicket)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-success-foreground" />
                    <span className="text-xs font-semibold text-success-foreground">+3.0%</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Cajeros Activos</span>
                    <span className="font-mono text-lg font-bold text-card-foreground">
                      {cashierPerformance.length}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">-1</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Weekly Chart */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ventas por Dia</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={weeklySalesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.005 250)" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 10 }}
                      tickFormatter={formatCurrencyShort}
                      dx={-4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ventas" fill="oklch(0.45 0.12 250)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top 5 Productos</h2>
          </div>
          {topProducts.map((product) => (
            <Card key={product.rank} className="border-border bg-card shadow-sm active:scale-[0.98] transition-transform">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                    {product.rank}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium text-card-foreground truncate">
                      {product.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{product.units} unidades</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold text-card-foreground">
                      {formatCurrency(product.revenue)}
                    </span>
                    {product.trend === "up" ? (
                      <Badge className="border-success/30 bg-success/10 text-success-foreground text-[10px]" variant="outline">
                        <ArrowUpRight className="mr-1 h-2.5 w-2.5" />
                        Sube
                      </Badge>
                    ) : (
                      <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]" variant="outline">
                        <ArrowDownRight className="mr-1 h-2.5 w-2.5" />
                        Baja
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cashiers Tab */}
      {activeTab === "cashiers" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Rendimiento Cajeros</h2>
          {cashierPerformance.map((cashier, index) => (
            <Card key={cashier.name} className="border-border bg-card shadow-sm active:scale-[0.98] transition-transform">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chart-4/10 font-semibold text-chart-4 text-sm">
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-sm font-medium text-card-foreground">
                      {cashier.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] w-fit">
                      {cashier.shift}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold text-card-foreground">
                      {formatCurrency(cashier.total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {cashier.transactions} trans.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Tab */}
      {activeTab === "trend" && (
        <div className="flex flex-col gap-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tendencia Mensual</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={monthlyTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.005 250)" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 10 }}
                      tickFormatter={formatCurrencyShort}
                      dx={-4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      stroke="oklch(0.45 0.12 250)"
                      strokeWidth={2.5}
                      dot={{ fill: "oklch(0.45 0.12 250)", strokeWidth: 0, r: 4 }}
                      activeDot={{ fill: "oklch(0.45 0.12 250)", strokeWidth: 0, r: 6 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
