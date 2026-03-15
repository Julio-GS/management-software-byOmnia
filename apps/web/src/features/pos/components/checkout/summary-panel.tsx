"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Wallet, FileText, Receipt } from "lucide-react"
import { formatARS } from "@/features/pos/utils/format-currency"
import type { CartItem, Ticket } from "@/features/pos/hooks/use-pos-state"

interface PosSummaryPanelProps {
  subtotal: number
  discounts: number
  taxes: number
  total: number
  itemCount: number
  tickets: Ticket[]
  activeTicketId: string
  cart: CartItem[]
  appliedCredit?: { code: string; product: string; remaining: number } | null
  creditApplied?: number
  totalWithCredit?: number
  onOpenPayment: () => void
  onOpenCreditNote?: () => void
  onOpenSplit?: () => void
  onSetActiveTicket?: (id: string) => void
}

function getItemSubtotal(item: CartItem): number {
  return item.unitPrice * item.quantity
}

function getItemDiscount(item: CartItem): number {
  if (!item.discount) return 0
  return item.discount * item.quantity
}

export function PosSummaryPanel({
  subtotal,
  discounts,
  taxes,
  total,
  itemCount,
  tickets,
  activeTicketId,
  cart,
  appliedCredit,
  creditApplied = 0,
  totalWithCredit,
  onOpenPayment,
  onOpenCreditNote,
  onOpenSplit,
  onSetActiveTicket,
}: PosSummaryPanelProps) {
  const displayTotal = totalWithCredit ?? total
  const allSubtotal = cart.reduce((a, i) => a + getItemSubtotal(i), 0)
  const allDiscounts = cart.reduce((a, i) => a + getItemDiscount(i), 0)
  const allTaxable = allSubtotal - allDiscounts
  const allTaxes = allTaxable * 0.21
  const allTotal = allTaxable + allTaxes

  return (
    <Card className="flex flex-col border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-primary px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/70">
          Total a Pagar
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-primary-foreground">
          {formatARS(displayTotal)}
        </p>
        {tickets.length > 1 && (
          <p className="mt-1 text-xs text-primary-foreground/60">
            Total operacion completa: {formatARS(allTotal)}
          </p>
        )}
      </div>

      <CardContent className="flex flex-col gap-0 p-0">
        <div className="flex flex-col gap-2 px-6 pt-5 pb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal ({itemCount} {itemCount === 1 ? "producto" : "productos"})
            </span>
            <span className="font-mono font-medium text-card-foreground">
              {formatARS(subtotal)}
            </span>
          </div>

          {discounts > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-success-foreground">Descuentos</span>
              <span className="font-mono font-semibold text-success-foreground">
                -{formatARS(discounts)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">IVA (21%)</span>
            <span className="font-mono font-medium text-card-foreground">
              {formatARS(taxes)}
            </span>
          </div>

          {appliedCredit && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-chart-1">Nota de Credito</span>
              <span className="font-mono font-semibold text-chart-1">
                -{formatARS(creditApplied)}
              </span>
            </div>
          )}
        </div>

        {discounts > 0 && (
          <div className="border-t border-border px-6 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Detalle de Descuentos
            </span>
          </div>
        )}

        {appliedCredit && (
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nota de Credito Aplicada
              </span>
            </div>
          </div>
        )}

        {tickets.length > 1 && (
          <div className="border-t border-border px-6 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tickets en esta operacion
            </span>
          </div>
        )}

        <div className="border-t border-border px-6 py-5 flex flex-col gap-3">
          <Button
            className="h-12 gap-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
            onClick={onOpenPayment}
          >
            <Wallet className="h-4 w-4" />
            Cobrar {formatARS(displayTotal)}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 gap-2 border-border text-xs font-medium text-card-foreground hover:bg-accent"
            >
              <FileText className="h-3.5 w-3.5" />
              Factura B (AFIP)
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 gap-2 border-border text-xs font-medium text-card-foreground hover:bg-accent"
            >
              <Receipt className="h-3.5 w-3.5" />
              Remito
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
