"use client"

import { AppNavigation } from "@/shared/components/layout/app-navigation"
import { Bell, ChevronRight } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { SyncStatusBadge } from "@/shared/components/layout/SyncStatusBadge"
import { SyncQueueIndicator } from "@/shared/components/layout/SyncQueueIndicator"
import { usePathname } from "next/navigation"

const pathToTitle: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pos": "Punto de Venta",
  "/inventory": "Inventario",
  "/pricing": "Precios",
  "/promotions": "Promociones",
  "/reports": "Reportes",
  "/settings": "Ajustes",
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const pageTitle = pathToTitle[pathname] || "Dashboard"

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AppNavigation />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Omnia</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{pageTitle}</span>
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
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
