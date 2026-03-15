"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/shared/utils/utils"
import { Badge } from "@/shared/components/ui/badge"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  BarChart3,
  Settings,
  Store,
  DollarSign,
  Barcode,
} from "lucide-react"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Punto de Venta", icon: ShoppingCart, href: "/pos" },
  { label: "Inventario", icon: Package, href: "/inventory", badge: 8 },
  { label: "Precios", icon: DollarSign, href: "/pricing" },
  { label: "Promociones", icon: Tag, href: "/promotions" },
  { label: "Reportes", icon: BarChart3, href: "/reports" },
  { label: "Ajustes", icon: Settings, href: "/settings" },
]

export function AppNavigation() {
  const pathname = usePathname()

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
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
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
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-center text-sidebar-foreground/60">
          Software de gestión by Omnia
        </p>
      </div>
    </aside>
  )
}
