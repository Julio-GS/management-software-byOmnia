"use client"

import { ReportesView } from "@/src/features/reports/components/reportes-view"
import { ReportsMobileView } from "@/src/features/reports/mobile/reports-mobile-view"
import { useResponsive } from "@/hooks/use-responsive"

export default function ReportesPage() {
  const { isMobile } = useResponsive()
  
  return isMobile ? <ReportsMobileView /> : <ReportesView />
}
