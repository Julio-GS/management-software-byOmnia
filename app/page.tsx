"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardView } from "@/components/dashboard-view"
import { PosView } from "@/components/pos-view"
import { InventoryView } from "@/components/inventory-view"
import { PromocionesView } from "@/components/promociones-view"
import { ReportesView } from "@/components/reportes-view"
import { AjustesView } from "@/components/ajustes-view"
import { Bell, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "Punto de Venta",
  inventario: "Inventario",
  promociones: "Promociones",
  reportes: "Reportes",
  ajustes: "Ajustes",
}

export default function Home() {
  const [activeView, setActiveView] = useState("pos")

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
