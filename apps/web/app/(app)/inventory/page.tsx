"use client"

import { InventoryView } from "@/src/features/inventory/components/inventory-view"
import { InventoryMobileView } from "@/src/features/inventory/mobile/inventory-mobile-view"
import { useResponsive } from "@/hooks/use-responsive"

export default function InventoryPage() {
  const { isMobile } = useResponsive()

  return isMobile ? <InventoryMobileView /> : <InventoryView />
}
