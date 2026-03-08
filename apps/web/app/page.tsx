"use client"

import { useState } from "react"
import { useAuth } from "@/src/contexts/auth-context"
import { AppSidebar } from "@/shared/components/layout/app-sidebar"
import { DashboardView } from "@/features/dashboard/components/dashboard-view"
import { PosView } from "@/features/pos/components/pos-view"
import { InventoryView } from "@/features/inventory/components/inventory-view"
import { PromocionesView } from "@/features/promotions/components/promociones-view"
import { ReportesView } from "@/features/reports/components/reportes-view"
import { AjustesView } from "@/features/settings/components/ajustes-view"
import { Bell, ChevronRight } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { SyncStatusBadge } from "@/shared/components/layout/SyncStatusBadge"
import { SyncQueueIndicator } from "@/shared/components/layout/SyncQueueIndicator"

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "Punto de Venta",
  inventario: "Inventario",
  promociones: "Promociones",
  reportes: "Reportes",
  ajustes: "Ajustes",
}

export default function Home() {
  const [activeView, setActiveView] = useState("dashboard")
  const { isLoading, isAuthenticated } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 border-r border-border p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Not authenticated (middleware should redirect, but just in case)
  if (!isAuthenticated) {
    return null
  }

  function renderView() {
    switch (activeView) {
      case "dashboard":
        return <DashboardView />
      case "pos":
        return <PosView />
      case "inventario":
        return <InventoryView />
      case "promociones":
        return <PromocionesView />
      case "reportes":
        return <ReportesView />
      case "ajustes":
        return <AjustesView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Omnia</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">
              {viewTitles[activeView] || "Dashboard"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SyncStatusBadge />
            <SyncQueueIndicator />
            <span className="font-mono text-xs text-muted-foreground">
              {new Date().toLocaleDateString("es-AR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <button
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Notificaciones"
            >
              <Bell className="h-[18px] w-[18px]" />
              <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-[10px] text-white">
                8
              </Badge>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
