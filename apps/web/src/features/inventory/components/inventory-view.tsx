"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  AlertTriangle,
  Clock,
  PackageMinus,
  Package,
  Search,
  Pencil,
  Check,
  X,
  Plus,
} from "lucide-react"
import { InventoryMovementForm } from "../InventoryMovementForm"
import { apiClient } from "@/lib/api-client-instance"
import type { Product } from "@omnia/shared-types"

interface ExpiringProduct {
  id: string
  name: string
  expiryDate: string
  daysLeft: number
  stock: number
}

interface LowStockProduct {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
}

interface StockAdjustment {
  itemId: string
  name: string
  currentStock: number
  newStock: number
}

// Map Product to InventoryItem with computed status
function productToInventoryItem(product: Product): InventoryItem {
  const status = getStatus(product.stock, product.minStock)
  return {
    id: product.id,
    name: product.name,
    sku: product.sku || 'N/A',
    category: product.categoryId || 'Sin Categoría',
    stock: product.stock,
    minStock: product.minStock,
    price: product.price,
    status,
  }
}

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

// Mock data for features not yet implemented (expiring products)
const expiringProducts: ExpiringProduct[] = [
  { id: "1", name: "Yogurt Natural Activia 200g", expiryDate: "23/02/2026", daysLeft: 2, stock: 15 },
  { id: "2", name: "Queso Cremoso La Paulina 1kg", expiryDate: "25/02/2026", daysLeft: 4, stock: 8 },
  { id: "3", name: "Leche Descremada Sancor 1L", expiryDate: "27/02/2026", daysLeft: 6, stock: 22 },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

function getStatus(stock: number, minStock: number): "ok" | "low" | "critical" {
  if (stock <= minStock * 0.3) return "critical"
  if (stock <= minStock) return "low"
  return "ok"
}

function StatusBadge({ status }: { status: "ok" | "low" | "critical" }) {
  if (status === "critical") {
    return (
      <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-[11px]" variant="outline">
        Critico
      </Badge>
    )
  }
  if (status === "low") {
    return (
      <Badge className="border-warning/30 bg-warning/10 text-warning-foreground text-[11px]" variant="outline">
        Bajo
      </Badge>
    )
  }
  return (
    <Badge className="border-success/30 bg-success/10 text-success-foreground text-[11px]" variant="outline">
      Normal
    </Badge>
  )
}

export function InventoryView() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showStockDialog, setShowStockDialog] = useState(false)
  const [showMovementDialog, setShowMovementDialog] = useState(false)
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])

  // Load products from API
  useEffect(() => {
    loadProducts()
    loadLowStockProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.products.getAll({}, { limit: 1000 })
      // Backend returns plain array, not PaginatedResponse (type mismatch)
      const products = Array.isArray(response) ? response : (response as any).items || []
      const items = products.map(productToInventoryItem)
      setInventory(items)
    } catch (error) {
      console.error('Error loading products:', error)
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
          unit: "unid.",
        }))
      )
    } catch (error) {
      console.error('Error loading low stock products:', error)
    }
  }

  const allCategories = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.category))).sort(),
    [inventory]
  )

  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [inventory, searchQuery, categoryFilter, statusFilter])

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function openStockDialog() {
    const items = inventory.filter((item) => selectedIds.has(item.id))
    setAdjustments(
      items.map((item) => ({
        itemId: item.id,
        name: item.name,
        currentStock: item.stock,
        newStock: item.stock,
      }))
    )
    setShowStockDialog(true)
  }

  function updateAdjustment(itemId: string, newStock: number) {
    setAdjustments((prev) =>
      prev.map((adj) => (adj.itemId === itemId ? { ...adj, newStock } : adj))
    )
  }

  function applyStockChanges() {
    setInventory((prev) =>
      prev.map((item) => {
        const adj = adjustments.find((a) => a.itemId === item.id)
        if (adj && adj.newStock !== item.stock) {
          const newStock = Math.max(0, adj.newStock)
          return {
            ...item,
            stock: newStock,
            status: getStatus(newStock, item.minStock),
          }
        }
        return item
      })
    )
    setShowStockDialog(false)
    setSelectedIds(new Set())
    setAdjustments([])
  }

  const hasChanges = adjustments.some((adj) => adj.newStock !== adj.currentStock)

  const handleMovementSuccess = () => {
    setShowMovementDialog(false)
    loadProducts() // Reload products after movement
    loadLowStockProducts() // Reload low stock alert
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Expiring Products */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15">
                <Clock className="h-4 w-4 text-warning-foreground" />
              </div>
              Proximos a Vencer
              <Badge className="ml-auto border-warning/30 bg-warning/10 text-warning-foreground text-xs" variant="outline">
                {expiringProducts.length} productos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {expiringProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">
                    {product.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Vence: {product.expiryDate} - Stock: {product.stock} unid.
                  </span>
                </div>
                <Badge
                  className={`shrink-0 text-xs font-semibold ${
                    product.daysLeft <= 3
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-warning/30 bg-warning/10 text-warning-foreground"
                  }`}
                  variant="outline"
                >
                  {product.daysLeft} {product.daysLeft === 1 ? "dia" : "dias"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <PackageMinus className="h-4 w-4 text-destructive" />
              </div>
              Stock Bajo
              <Badge className="ml-auto border-destructive/30 bg-destructive/10 text-destructive text-xs" variant="outline">
                {lowStockProducts.length} productos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">
                    {product.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Min: {product.minStock} {product.unit}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-destructive">
                  {product.currentStock} {product.unit}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card className="flex flex-1 flex-col border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-[18px] w-[18px]" />
              <CardTitle className="text-base font-semibold text-card-foreground">
                Inventario General
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredItems.length} de {inventory.length} productos
              </Badge>
              <Button
                onClick={() => setShowMovementDialog(true)}
                size="sm"
                className="h-8 gap-2 bg-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear Movimiento
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU o categoria..."
                className="h-9 pl-9 bg-background border-input text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar busqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[160px] text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ok">Normal</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="critical">Critico</SelectItem>
              </SelectContent>
            </Select>

            {selectedIds.size > 0 && (
              <Button
                onClick={openStockDialog}
                size="sm"
                className="h-9 gap-2 bg-primary text-primary-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modificar Stock ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4 w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos los productos"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Producto
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoria
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Precio
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">No se encontraron productos</p>
                      <p className="text-xs">Intenta con otros terminos de busqueda</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`border-border ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}
                  >
                    <TableCell className="pl-4 w-10">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Seleccionar ${item.name}`}
                      />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="text-sm font-medium text-card-foreground">
                        {item.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.sku}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-card-foreground">{item.category}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          item.status === "critical"
                            ? "text-destructive"
                            : item.status === "low"
                            ? "text-warning-foreground"
                            : "text-card-foreground"
                        }`}
                      >
                        {item.stock}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {item.minStock}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-card-foreground">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Stock Edit Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-card-foreground">
              <Pencil className="h-4 w-4" />
              Modificar Stock
            </DialogTitle>
            <DialogDescription>
              Ajusta las cantidades de stock para los {adjustments.length} producto{adjustments.length !== 1 ? "s" : ""} seleccionado{adjustments.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto py-2">
            {adjustments.map((adj) => {
              const diff = adj.newStock - adj.currentStock
              return (
                <div
                  key={adj.itemId}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium text-card-foreground truncate">
                      {adj.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Stock actual: {adj.currentStock}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      value={adj.newStock}
                      onChange={(e) =>
                        updateAdjustment(adj.itemId, parseInt(e.target.value) || 0)
                      }
                      className="h-9 w-20 text-center font-mono text-sm bg-card border-input"
                    />
                    {diff !== 0 && (
                      <span
                        className={`font-mono text-xs font-semibold min-w-[50px] text-right ${
                          diff > 0 ? "text-success-foreground" : "text-destructive"
                        }`}
                      >
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStockDialog(false)}
              className="border-border text-card-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={applyStockChanges}
              disabled={!hasChanges}
              className="gap-2 bg-primary text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" />
              Aplicar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-card-foreground">
              <Plus className="h-4 w-4" />
              Crear Movimiento de Inventario
            </DialogTitle>
            <DialogDescription>
              Registra una entrada, salida o ajuste de inventario
            </DialogDescription>
          </DialogHeader>
          
          <InventoryMovementForm onSuccess={handleMovementSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
