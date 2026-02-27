"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tag,
  Plus,
  Percent,
  Gift,
  Calendar,
  TrendingUp,
  ShoppingCart,
} from "lucide-react"

interface Promotion {
  id: string
  name: string
  type: "2x1" | "percentage" | "fixed" | "combo"
  value: number
  category: string
  startDate: string
  endDate: string
  active: boolean
  usageCount: number
  description: string
}

const initialPromotions: Promotion[] = [
  {
    id: "1",
    name: "2x1 en Panificados",
    type: "2x1",
    value: 0,
    category: "Panificados",
    startDate: "2026-02-01",
    endDate: "2026-02-28",
    active: true,
    usageCount: 342,
    description: "Lleva 2 y paga 1 en toda la linea de panificados",
  },
  {
    id: "2",
    name: "10% Desc. Jubilados (Dom)",
    type: "percentage",
    value: 10,
    category: "General",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    active: true,
    usageCount: 1205,
    description: "10% de descuento los dias domingo para jubilados",
  },
  {
    id: "3",
    name: "15% en Lacteos",
    type: "percentage",
    value: 15,
    category: "Lacteos",
    startDate: "2026-02-15",
    endDate: "2026-03-15",
    active: true,
    usageCount: 89,
    description: "15% de descuento en todos los productos lacteos",
  },
  {
    id: "4",
    name: "$500 Off Compras +$10.000",
    type: "fixed",
    value: 500,
    category: "General",
    startDate: "2026-02-01",
    endDate: "2026-02-28",
    active: true,
    usageCount: 67,
    description: "$500 de descuento en compras superiores a $10.000",
  },
  {
    id: "5",
    name: "Combo Desayuno",
    type: "combo",
    value: 20,
    category: "Combos",
    startDate: "2026-02-10",
    endDate: "2026-03-10",
    active: false,
    usageCount: 28,
    description: "Cafe + Medialunas + Mermelada con 20% de descuento",
  },
  {
    id: "6",
    name: "3x2 en Bebidas",
    type: "2x1",
    value: 0,
    category: "Bebidas",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    active: false,
    usageCount: 0,
    description: "Lleva 3 y paga 2 en bebidas seleccionadas",
  },
]

function getTypeLabel(type: Promotion["type"]): string {
  switch (type) {
    case "2x1": return "2x1"
    case "percentage": return "% Descuento"
    case "fixed": return "$ Fijo"
    case "combo": return "Combo"
  }
}

function getTypeIcon(type: Promotion["type"]) {
  switch (type) {
    case "2x1": return Gift
    case "percentage": return Percent
    case "fixed": return Tag
    case "combo": return ShoppingCart
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate + "T23:59:59")
  const now = new Date()
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function PromocionesView() {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newPromo, setNewPromo] = useState({
    name: "",
    type: "percentage" as Promotion["type"],
    value: 0,
    category: "",
    startDate: "",
    endDate: "",
    description: "",
  })

  const activeCount = promotions.filter((p) => p.active).length
  const totalUsage = promotions.reduce((acc, p) => acc + p.usageCount, 0)

  function togglePromotion(id: string) {
    setPromotions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    )
  }

  function createPromotion() {
    const promo: Promotion = {
      id: Date.now().toString(),
      name: newPromo.name,
      type: newPromo.type,
      value: newPromo.value,
      category: newPromo.category,
      startDate: newPromo.startDate,
      endDate: newPromo.endDate,
      active: true,
      usageCount: 0,
      description: newPromo.description,
    }
    setPromotions((prev) => [promo, ...prev])
    setShowNewDialog(false)
    setNewPromo({
      name: "",
      type: "percentage",
      value: 0,
      category: "",
      startDate: "",
      endDate: "",
      description: "",
    })
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Promociones Activas</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">{activeCount}</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Tag className="h-5 w-5 text-success-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Total Promociones</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">{promotions.length}</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Usos Totales</span>
                <span className="font-mono text-2xl font-bold text-card-foreground">{totalUsage.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <TrendingUp className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promotions Table */}
      <Card className="flex flex-1 flex-col border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Tag className="h-[18px] w-[18px]" />
              Promociones y Ofertas
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowNewDialog(true)}
              className="h-9 gap-2 bg-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Promocion
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Promocion
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoria
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vigencia
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Usos
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-6">
                  Activo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promo) => {
                const Icon = getTypeIcon(promo.type)
                const daysLeft = getDaysRemaining(promo.endDate)
                return (
                  <TableRow key={promo.id} className="border-border">
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-card-foreground">
                          {promo.name}
                        </span>
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          {promo.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-card-foreground">
                          {getTypeLabel(promo.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {promo.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-card-foreground">
                          {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                        </span>
                        {promo.active && daysLeft > 0 && (
                          <span
                            className={`text-[11px] font-medium ${
                              daysLeft <= 7 ? "text-warning-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}
                          </span>
                        )}
                        {daysLeft <= 0 && (
                          <span className="text-[11px] font-medium text-destructive">Vencida</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-card-foreground">
                      {promo.usageCount.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-center">
                      {promo.active ? (
                        <Badge className="border-success/30 bg-success/10 text-success-foreground text-[11px]" variant="outline">
                          Activa
                        </Badge>
                      ) : (
                        <Badge className="border-border bg-muted text-muted-foreground text-[11px]" variant="outline">
                          Inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Switch
                        checked={promo.active}
                        onCheckedChange={() => togglePromotion(promo.id)}
                        aria-label={`Activar/desactivar ${promo.name}`}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Promotion Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-card-foreground">
              <Plus className="h-4 w-4" />
              Nueva Promocion
            </DialogTitle>
            <DialogDescription>
              Crea una nueva promocion o descuento para tus productos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Nombre</label>
              <Input
                placeholder="Ej: 20% Desc. en Lacteos"
                value={newPromo.name}
                onChange={(e) => setNewPromo((p) => ({ ...p, name: e.target.value }))}
                className="bg-background border-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-card-foreground">Tipo</label>
                <Select
                  value={newPromo.type}
                  onValueChange={(v) => setNewPromo((p) => ({ ...p, type: v as Promotion["type"] }))}
                >
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% Descuento</SelectItem>
                    <SelectItem value="2x1">2x1</SelectItem>
                    <SelectItem value="fixed">$ Fijo</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newPromo.type === "percentage" || newPromo.type === "fixed" || newPromo.type === "combo") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">
                    {newPromo.type === "fixed" ? "Monto ($)" : "Porcentaje (%)"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={newPromo.value}
                    onChange={(e) => setNewPromo((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                    className="bg-background border-input"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Categoria</label>
              <Select
                value={newPromo.category}
                onValueChange={(v) => setNewPromo((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Lacteos">Lacteos</SelectItem>
                  <SelectItem value="Panificados">Panificados</SelectItem>
                  <SelectItem value="Bebidas">Bebidas</SelectItem>
                  <SelectItem value="Basicos">Basicos</SelectItem>
                  <SelectItem value="Aceites">Aceites</SelectItem>
                  <SelectItem value="Pastas">Pastas</SelectItem>
                  <SelectItem value="Combos">Combos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-card-foreground">Fecha Inicio</label>
                <Input
                  type="date"
                  value={newPromo.startDate}
                  onChange={(e) => setNewPromo((p) => ({ ...p, startDate: e.target.value }))}
                  className="bg-background border-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-card-foreground">Fecha Fin</label>
                <Input
                  type="date"
                  value={newPromo.endDate}
                  onChange={(e) => setNewPromo((p) => ({ ...p, endDate: e.target.value }))}
                  className="bg-background border-input"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Descripcion</label>
              <Input
                placeholder="Descripcion de la promocion"
                value={newPromo.description}
                onChange={(e) => setNewPromo((p) => ({ ...p, description: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              className="border-border text-card-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={createPromotion}
              disabled={!newPromo.name || !newPromo.category || !newPromo.startDate || !newPromo.endDate}
              className="gap-2 bg-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear Promocion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
