"use client"

import { PosView } from "@/src/features/pos/components/pos-view"
import { POSMobileView } from "@/src/features/pos/mobile/pos-mobile-view"
import { useResponsive } from "@/hooks/use-responsive"

export default function POSPage() {
  const { isMobile } = useResponsive()

  return isMobile ? <POSMobileView /> : <PosView />
}
