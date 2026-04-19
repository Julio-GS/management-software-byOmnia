"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Receipt, UserPlus } from "lucide-react"
import { formatARS } from "@/features/pos/utils/format-currency"
import type { CartItem, Ticket } from "@/features/pos/hooks/use-pos-state"

interface PosSplitTicketDialogProps {
  open: boolean
  onClose: () => void
  tickets: Ticket[]
  cart: CartItem[]
  activeTicketId: string
  onMoveItem: (itemId: string, targetTicketId: string) => void
  onAddTicket: () => void
  onSetActiveTicket: (id: string) => void
}

function getItemSubtotal(item: CartItem): number {
  return item.unitPrice * item.quantity
}

function getItemDiscount(item: CartItem): number {
  if (!item.discount) return 0
  return item.discount * item.quantity
}

export function PosSplitTicketDialog({
  open,
  onClose,
  tickets,
  cart,
  activeTicketId,
  onMoveItem,
  onAddTicket,
  onSetActiveTicket,
}: PosSplitTicketDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Dividir en Tickets</DialogTitle>
          <DialogDescription>
            Crea un nuevo ticket y arrastra productos para separar compras. Cada ticket genera su propia factura.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex flex-col gap-3 mb-4">
            {tickets.map((t) => {
              const items = cart.filter((i) => i.ticketId === t.id)
              const tSub = items.reduce((a, i) => a + getItemSubtotal(i), 0)
              const tDisc = items.reduce((a, i) => a + getItemDiscount(i), 0)
              const tTax = (tSub - tDisc) * 0.21
              const tTotal = tSub - tDisc + tTax
              const isActive = t.id === activeTicketId

              return (
                <div key={t.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => onSetActiveTicket(t.id)}
                      className="text-sm font-semibold text-card-foreground hover:underline"
                    >
                      {t.label}
                    </button>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {items.length} items
                    </Badge>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin productos</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-card-foreground truncate flex-1">{item.name}</span>
                          {tickets.length > 1 && (
                            <Select
                              value={item.ticketId}
                              onValueChange={(val) => onMoveItem(item.id, val)}
                            >
                              <SelectTrigger className="h-7 w-[140px] text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tickets.map((tt) => (
                                  <SelectItem key={tt.id} value={tt.id} className="text-xs">
                                    {tt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {items.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="font-mono text-xs font-semibold text-card-foreground">
                        Total: {formatARS(tTotal)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Button variant="outline" className="w-full gap-2 border-dashed" onClick={onAddTicket}>
            <UserPlus className="h-4 w-4" />
            Agregar Nuevo Ticket
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
