"use client"

import { DashboardView } from "@/src/features/dashboard/components/dashboard-view"
import { DashboardMobileView } from "@/src/features/dashboard/mobile/dashboard-mobile-view"
import { useResponsive } from "@/hooks/use-responsive"

export default function DashboardPage() {
  const { isMobile } = useResponsive()
  
  return isMobile ? <DashboardMobileView /> : <DashboardView />
}
