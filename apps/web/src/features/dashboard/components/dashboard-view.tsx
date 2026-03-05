"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  PackageMinus,
} from "lucide-react"
import { DailySalesChart } from "@/shared/components/common/daily-sales-chart"

interface StatCard {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ComponentType<{ className?: string }>
}

const stats: StatCard[] = [
  {
    title: "Ventas del Dia",
    value: "$487,250",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Transacciones",
    value: "164",
    change: "+8.2%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    title: "Clientes Atendidos",
    value: "142",
    change: "-3.1%",
    trend: "down",
    icon: Users,
  },
  {
    title: "Ticket Promedio",
    value: "$2,971",
    change: "+5.4%",
    trend: "up",
    icon: TrendingUp,
  },
]

const recentAlerts = [
  {
    id: "1",
    type: "expiry" as const,
    message: "3 productos proximos a vencer",
    time: "Hace 15 min",
  },
  {
    id: "2",
    type: "stock" as const,
    message: "5 productos con stock bajo",
    time: "Hace 30 min",
  },
  {
    id: "3",
    type: "stock" as const,
    message: "Aceite Girasol Cocinero - Stock critico (3 unid.)",
    time: "Hace 1 hora",
  },
]

export function DashboardView() {
  return (
    <div className="flex h-full flex-col gap-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </span>
                  <span className="font-mono text-2xl font-bold text-card-foreground">
                    {stat.value}
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-success-foreground" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
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
                <span className="text-xs text-muted-foreground">
                  vs. ayer
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Alerts Row */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Daily Sales Chart */}
        <Card className="border-border bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-card-foreground">
                Ventas del Dia
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-medium">
                Hoy - 21 Feb 2026
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DailySalesChart />
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              Alertas Criticas
              <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-xs" variant="outline">
                {recentAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    alert.type === "expiry"
                      ? "bg-warning/15"
                      : "bg-destructive/10"
                  }`}
                >
                  {alert.type === "expiry" ? (
                    <Clock className="h-4 w-4 text-warning-foreground" />
                  ) : (
                    <PackageMinus className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground leading-relaxed">
                    {alert.message}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {alert.time}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
