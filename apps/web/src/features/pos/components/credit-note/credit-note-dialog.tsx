"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { ReceiptText } from "lucide-react"
import { formatARS } from "@/features/pos/utils/format-currency"

interface CreditNote {
  id: string
  code: string
  product: string
  amount: number
  date: string
  status: "disponible" | "parcial" | "agotada"
  remaining: number
}

interface PosCreditNoteDialogProps {
  open: boolean
  onClose: () => void
  creditNotes: CreditNote[]
  appliedCredit: CreditNote | null
  onApply: (credit: CreditNote) => void
  onRemove: () => void
}

export function PosCreditNoteDialog({
  open,
  onClose,
  creditNotes,
  appliedCredit,
  onApply,
  onRemove,
}: PosCreditNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar Nota de Credito</DialogTitle>
          <DialogDescription>
            Selecciona una nota de credito disponible. El saldo se descontara del total o quedara como saldo a favor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {creditNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay notas de credito disponibles
            </p>
          ) : (
            creditNotes.map((credit) => (
              <button
                key={credit.id}
                onClick={() => onApply(credit)}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
              >
                <ReceiptText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col">
                  <span className="font-mono text-sm font-semibold text-card-foreground">
                    {credit.code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {credit.product}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold text-card-foreground">
                    {formatARS(credit.remaining)}
                  </span>
                  <span className={`text-[10px] font-medium uppercase ${
                    credit.status === "disponible" ? "text-success-foreground" :
                    credit.status === "parcial" ? "text-warning-foreground" :
                    "text-muted-foreground"
                  }`}>
                    {credit.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          {appliedCredit && (
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={() => {
                onRemove()
                onClose()
              }}
            >
              Quitar Nota de Credito
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
