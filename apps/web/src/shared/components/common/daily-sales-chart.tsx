"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const salesData = [
  { hour: "08:00", ventas: 12500 },
  { hour: "09:00", ventas: 28700 },
  { hour: "10:00", ventas: 45200 },
  { hour: "11:00", ventas: 62300 },
  { hour: "12:00", ventas: 89100 },
  { hour: "13:00", ventas: 78400 },
  { hour: "14:00", ventas: 55600 },
  { hour: "15:00", ventas: 41800 },
  { hour: "16:00", ventas: 38200 },
  { hour: "17:00", ventas: 52900 },
  { hour: "18:00", ventas: 67300 },
  { hour: "19:00", ventas: 48100 },
  { hour: "20:00", ventas: 22400 },
]

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label} hs</p>
      <p className="font-mono text-sm font-semibold text-card-foreground">
        {new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          minimumFractionDigits: 0,
        }).format(payload[0].value)}
      </p>
    </div>
  )
}

export function DailySalesChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={salesData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.45 0.12 250)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="oklch(0.45 0.12 250)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="oklch(0.91 0.005 250)"
          />
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 11 }}
            tickFormatter={formatCurrency}
            dx={-4}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="ventas"
            stroke="oklch(0.45 0.12 250)"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
