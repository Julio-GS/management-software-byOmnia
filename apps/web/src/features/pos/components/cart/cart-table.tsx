"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react"
import { formatARS } from "@/features/pos/utils/format-currency"
import type { CartItem } from "@/features/pos/hooks/use-pos-state"

interface PosCartTableProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, delta: number) => void
  onRemove: (id: string) => void
  title?: string
}

function getItemSubtotal(item: CartItem): number {
  return item.unitPrice * item.quantity
}

function getItemDiscount(item: CartItem): number {
  if (!item.discount) return 0
  return item.discount * item.quantity
}

export function PosCartTable({ items, onUpdateQuantity, onRemove, title }: PosCartTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Producto
          </TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Precio Unit.
          </TableHead>
          <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cantidad
          </TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subtotal
          </TableHead>
          <TableHead className="w-10 pr-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const itemDiscount = getItemDiscount(item)
          return (
            <TableRow key={item.id} className="group border-border">
              <TableCell className="pl-6 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-card-foreground">{item.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.barcode}</span>
                  {item.discount && item.discount > 0 && (
                    <Badge
                      className="mt-0.5 w-fit border-success/30 bg-success/10 text-success-foreground text-[11px] font-medium"
                      variant="outline"
                    >
                      Descuento{" -- Ahorro: "}{formatARS(itemDiscount)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-card-foreground">
                {formatARS(item.unitPrice)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-border"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    aria-label={`Reducir cantidad de ${item.name}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-mono text-sm font-semibold text-card-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-border"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    aria-label={`Aumentar cantidad de ${item.name}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold text-card-foreground">
                {formatARS(getItemSubtotal(item))}
              </TableCell>
              <TableCell className="pr-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Eliminar ${item.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function PosCartEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <ShoppingCart className="h-12 w-12 opacity-30" />
      <p className="text-sm font-medium">Este ticket esta vacio</p>
      <p className="text-xs">Escanea un producto para comenzar</p>
    </div>
  )
}
