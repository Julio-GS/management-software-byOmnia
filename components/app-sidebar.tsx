"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  BarChart3,
  Settings,
  Store,
} from "lucide-react"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  id: string
  badge?: number
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Punto de Venta", icon: ShoppingCart, id: "pos" },
  { label: "Inventario", icon: Package, id: "inventario", badge: 8 },
  { label: "Promociones", icon: Tag, id: "promociones" },
  { label: "Reportes", icon: BarChart3, id: "reportes" },
  { label: "Ajustes", icon: Settings, id: "ajustes" },
]

interface AppSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
          <Store className="h-5 w-5 text-sidebar-accent-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Omnia Build
          </span>
          <span className="text-xs text-sidebar-foreground/60">
            Studio Management
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        <span className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
          Menu Principal
        </span>
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge className="h-5 min-w-5 rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            MG
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-foreground">
              Maria Garcia
            </span>
            <span className="text-[11px] text-sidebar-foreground/50">
              Cajera - Turno Manana
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
