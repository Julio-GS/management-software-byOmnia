/**
 * App Layout - Responsive Shell
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Navigation Hierarchy"
 * 
 * Responsive layout that adapts to different screen sizes:
 * - Mobile (< 640px): Bottom navigation + mobile header
 * - Tablet (640-1023px): Bottom navigation + desktop header
 * - Desktop (>= 1024px): Sidebar + desktop header
 */

"use client"

import { ErrorBoundary } from "@/src/shared/components/error-boundary"
import { AppNavigation } from "@/shared/components/layout/app-navigation"
import { DesktopHeader } from "@/src/shared/components/layout/desktop-header"
import { MobileHeader } from "@/src/shared/components/layout/mobile-header"
import { BottomNavigation } from "@/src/shared/components/layout/bottom-navigation"
import { usePathname } from "next/navigation"
import { useResponsive } from "@/hooks/use-responsive"

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
  const { isDesktop } = useResponsive()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop Only (>= 1024px) */}
      <div className="hidden lg:block">
        <AppNavigation />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header - Mobile/Tablet Only (< 1024px) */}
        <div className="lg:hidden">
          <MobileHeader title={pageTitle} />
        </div>

        {/* Desktop Header - Desktop Only (>= 1024px) */}
        <div className="hidden lg:block">
          <DesktopHeader title={pageTitle} />
        </div>

        {/* Content Area */}
        <main 
          className={
            // Mobile: Add bottom padding for bottom nav + safe area
            // Desktop: Standard padding
            isDesktop 
              ? "flex-1 overflow-auto p-6"
              : "flex-1 overflow-auto p-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:p-6"
          }
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Navigation - Mobile/Tablet Only (< 1024px) */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  )
}
