"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShoppingCart,
  Download,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

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

const categoryData = [
  { name: "Lacteos", value: 28, color: "oklch(0.45 0.12 250)" },
  { name: "Bebidas", value: 22, color: "oklch(0.60 0.10 180)" },
  { name: "Panificados", value: 18, color: "oklch(0.55 0.08 150)" },
  { name: "Basicos", value: 15, color: "oklch(0.70 0.10 200)" },
  { name: "Otros", value: 17, color: "oklch(0.35 0.06 250)" },
]

const topProducts = [
  { rank: 1, name: "Leche Entera La Serenisima 1L", units: 487, revenue: 608750, trend: "up" as const },
  { rank: 2, name: "Coca-Cola 2.25L", units: 312, revenue: 733200, trend: "up" as const },
  { rank: 3, name: "Pan Lactal Bimbo 500g", units: 289, revenue: 606900, trend: "down" as const },
  { rank: 4, name: "Aceite Girasol Cocinero 1.5L", units: 198, revenue: 683100, trend: "up" as const },
  { rank: 5, name: "Fideos Matarazzo Spaghetti 500g", units: 176, revenue: 332640, trend: "down" as const },
  { rank: 6, name: "Galletitas Bagley Traviata 303g", units: 165, revenue: 234300, trend: "up" as const },
  { rank: 7, name: "Yogurt Natural Activia 200g", units: 154, revenue: 150920, trend: "up" as const },
  { rank: 8, name: "Arroz Largo Fino Gallo 1kg", units: 142, revenue: 234300, trend: "down" as const },
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

function SalesTooltip({ active, payload, label }: ChartTooltipProps) {
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

function TrendTooltip({ active, payload, label }: ChartTooltipProps) {
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

export function ReportesView() {
  const [period, setPeriod] = useState("week")

  const totalWeekly = weeklySalesData.reduce((acc, d) => acc + d.ventas, 0)
  const totalTransactions = weeklySalesData.reduce((acc, d) => acc + d.transacciones, 0)
  const avgTicket = Math.round(totalWeekly / totalTransactions)

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Reportes y Estadisticas</h2>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-border text-card-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Ventas Semana</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">
                  {formatCurrency(totalWeekly)}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-success-foreground" />
              <span className="text-xs font-semibold text-success-foreground">+8.3%</span>
              <span className="text-xs text-muted-foreground">vs. semana anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Transacciones</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">
                  {totalTransactions.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <ShoppingCart className="h-5 w-5 text-chart-2" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-success-foreground" />
              <span className="text-xs font-semibold text-success-foreground">+5.1%</span>
              <span className="text-xs text-muted-foreground">vs. semana anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Ticket Promedio</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">
                  {formatCurrency(avgTicket)}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                <TrendingUp className="h-5 w-5 text-chart-3" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-success-foreground" />
              <span className="text-xs font-semibold text-success-foreground">+3.0%</span>
              <span className="text-xs text-muted-foreground">vs. semana anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Cajeros Activos</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">
                  {cashierPerformance.length}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                <Users className="h-5 w-5 text-chart-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-semibold text-destructive">-1</span>
              <span className="text-xs text-muted-foreground">vs. semana anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Weekly Sales Bar Chart */}
        <Card className="border-border bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Ventas por Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySalesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 11 }}
                    tickFormatter={formatCurrencyShort}
                    dx={-4}
                  />
                  <Tooltip content={<SalesTooltip />} />
                  <Bar
                    dataKey="ventas"
                    fill="oklch(0.45 0.12 250)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Ventas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-card-foreground">{cat.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-card-foreground">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend + Tables */}
      <Tabs defaultValue="products" className="flex-1">
        <TabsList>
          <TabsTrigger value="products">Top Productos</TabsTrigger>
          <TabsTrigger value="cashiers">Rendimiento Cajeros</TabsTrigger>
          <TabsTrigger value="trend">Tendencia Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6 w-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidades</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facturacion</TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-6">Tendencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product) => (
                    <TableRow key={product.rank} className="border-border">
                      <TableCell className="pl-6 font-mono text-sm font-bold text-muted-foreground">
                        {product.rank}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm font-medium text-card-foreground">{product.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-card-foreground">
                        {product.units.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-card-foreground">
                        {formatCurrency(product.revenue)}
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        {product.trend === "up" ? (
                          <Badge className="border-success/30 bg-success/10 text-success-foreground text-[11px]" variant="outline">
                            <ArrowUpRight className="mr-1 h-3 w-3" />
                            Sube
                          </Badge>
                        ) : (
                          <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-[11px]" variant="outline">
                            <ArrowDownRight className="mr-1 h-3 w-3" />
                            Baja
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashiers">
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cajero/a</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turno</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transacciones</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Vendido</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-6">Ticket Prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashierPerformance.map((cashier) => (
                    <TableRow key={cashier.name} className="border-border">
                      <TableCell className="pl-6 py-3">
                        <span className="text-sm font-medium text-card-foreground">{cashier.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {cashier.shift}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-card-foreground">
                        {cashier.transactions}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-card-foreground">
                        {formatCurrency(cashier.total)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-card-foreground pr-6">
                        {formatCurrency(cashier.avgTicket)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground">
                Tendencia de Ventas Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 11 }}
                      tickFormatter={formatCurrencyShort}
                      dx={-4}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      stroke="oklch(0.45 0.12 250)"
                      strokeWidth={2.5}
                      dot={{ fill: "oklch(0.45 0.12 250)", strokeWidth: 0, r: 4 }}
                      activeDot={{ fill: "oklch(0.45 0.12 250)", strokeWidth: 0, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
