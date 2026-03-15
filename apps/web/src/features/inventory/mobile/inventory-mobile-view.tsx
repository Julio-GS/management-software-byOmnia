/**
 * Inventory Mobile View
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Table-to-Card Conversion"
 * 
 * Mobile-optimized inventory management with:
 * - Card-based product list (replaces table)
 * - Search and filter controls
 * - Status badges (OK, Low, Critical)
 * - Quick stock adjustment
 * - Low stock alerts
 * 
 * @example
 * ```tsx
 * <InventoryMobileView />
 * ```
 */

"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"
import {
  AlertTriangle,
  Search,
  Filter,
  Package,
  Plus,
  Minus,
} from "lucide-react"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { apiClient } from "@/lib/api-client-instance"
import { cn } from "@/lib/utils"
import type { Product } from "@omnia/shared-types"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  stock: number
  minStock: number
  price: number
  status: "ok" | "low" | "critical"
}

interface LowStockProduct {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

function productToInventoryItem(product: Product): InventoryItem {
  const status = getStatus(product.stock, product.minStock)
  return {
    id: product.id,
    name: product.name,
    sku: product.sku || "N/A",
    category: product.categoryId || "Sin Categoría",
    stock: product.stock,
    minStock: product.minStock,
    price: product.price,
    status,
  }
}

function getStatus(stock: number, minStock: number): "ok" | "low" | "critical" {
  if (stock <= minStock * 0.3) return "critical"
  if (stock <= minStock) return "low"
  return "ok"
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function InventoryMobileView() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const haptic = useHapticFeedback()

  /* ------------------------------------------------------------------ */
  /*  Data Loading                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    loadProducts()
    loadLowStockProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.products.getAll({}, { limit: 1000 })
      const products = Array.isArray(response) ? response : (response as any).items || []
      const items = products.map(productToInventoryItem)
      setInventory(items)
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadLowStockProducts = async () => {
    try {
      const products = await apiClient.inventory.getLowStock()
      setLowStockProducts(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          currentStock: p.stock,
          minStock: p.minStock,
          unit: "unidades",
        }))
      )
    } catch (error) {
      console.error("Error loading low stock products:", error)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Filtering                                                          */
  /* ------------------------------------------------------------------ */

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter

      const matchesStatus = statusFilter === "all" || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [inventory, searchQuery, categoryFilter, statusFilter])

  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.category))
    return Array.from(cats).sort()
  }, [inventory])

  /* ------------------------------------------------------------------ */
  /*  Stats                                                              */
  /* ------------------------------------------------------------------ */

  const stats = useMemo(() => {
    const critical = inventory.filter((item) => item.status === "critical").length
    const low = inventory.filter((item) => item.status === "low").length
    return { critical, low, total: inventory.length }
  }, [inventory])

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Stats */}
      {(stats.critical > 0 || stats.low > 0) && (
        <div className="p-4 bg-card border-b space-y-2">
          {stats.critical > 0 && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="flex items-center gap-2 p-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    {stats.critical} {stats.critical === 1 ? "producto" : "productos"} en stock crítico
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.low > 0 && (
            <Card className="bg-yellow-50 border-yellow-300">
              <CardContent className="flex items-center gap-2 p-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-800">
                    {stats.low} {stats.low === 1 ? "producto" : "productos"} con stock bajo
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 bg-card border-b space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-base"
          />
        </div>

        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full h-11 gap-2">
              <Filter className="w-4 h-4" aria-hidden="true" />
              Filtros
              {(categoryFilter !== "all" || statusFilter !== "all") && (
                <Badge variant="secondary" className="ml-auto">
                  {[categoryFilter !== "all" ? 1 : 0, statusFilter !== "all" ? 1 : 0]
                    .filter(Boolean)
                    .length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Filtra los productos por categoría y estado</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="low">Bajo</SelectItem>
                    <SelectItem value="ok">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCategoryFilter("all")
                  setStatusFilter("all")
                  haptic.trigger("light")
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto">
        {filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-base font-medium text-muted-foreground">
              No se encontraron productos
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredInventory.map((item) => (
              <InventoryCard key={item.id} item={item} onReload={loadProducts} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inventory Card Component                                           */
/* ------------------------------------------------------------------ */

interface InventoryCardProps {
  item: InventoryItem
  onReload: () => void
}

function InventoryCard({ item, onReload }: InventoryCardProps) {
  const [adjusting, setAdjusting] = useState(false)
  const haptic = useHapticFeedback()

  const StatusBadge = ({ status }: { status: "ok" | "low" | "critical" }) => {
    if (status === "critical") {
      return (
        <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-xs" variant="outline">
          Crítico
        </Badge>
      )
    }
    if (status === "low") {
      return (
        <Badge className="border-yellow-300 bg-yellow-50 text-yellow-800 text-xs" variant="outline">
          Bajo
        </Badge>
      )
    }
    return (
      <Badge className="border-green-300 bg-green-50 text-green-800 text-xs" variant="outline">
        Normal
      </Badge>
    )
  }

  const handleQuickAdjust = async (delta: number) => {
    setAdjusting(true)
    try {
      // TODO: Implement API call
      console.log("Adjust stock:", item.id, delta)
      haptic.trigger("success")
      await new Promise((resolve) => setTimeout(resolve, 500))
      onReload()
    } catch (error) {
      console.error("Error adjusting stock:", error)
      haptic.trigger("error")
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <Card className={cn(
      "transition-all",
      item.status === "critical" && "border-destructive/30",
      item.status === "low" && "border-yellow-300"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold line-clamp-2 mb-1">{item.name}</h3>
            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
            <p className="text-xs text-muted-foreground">{item.category}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        {/* Stock Info */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Stock Actual</p>
            <p className={cn(
              "text-lg font-bold",
              item.status === "critical" && "text-destructive",
              item.status === "low" && "text-yellow-600"
            )}>
              {item.stock}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Stock Mínimo</p>
            <p className="text-lg font-bold text-muted-foreground">{item.minStock}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Precio</p>
            <p className="text-lg font-bold">{formatCurrency(item.price)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 gap-1"
            onClick={() => handleQuickAdjust(-1)}
            disabled={adjusting || item.stock === 0}
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
            Restar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 gap-1"
            onClick={() => handleQuickAdjust(1)}
            disabled={adjusting}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Sumar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
