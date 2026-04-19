"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Separator } from "@/shared/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Plus, X, Check, Loader2, Banknote, CreditCard, ArrowRightLeft } from "lucide-react"
import { formatARS } from "@/features/pos/utils/format-currency"
import type { CheckoutStatus, UiPaymentMethod } from "@/features/pos/hooks/use-pos-state"

interface Payment {
  id: string
  method: string
  amount: number
}

interface PosPaymentDialogProps {
  open: boolean
  onClose: () => void
  checkoutStatus: CheckoutStatus
  selectedMethod: UiPaymentMethod
  onMethodChange: (method: UiPaymentMethod) => void
  paymentAmount: string
  onAmountChange: (amount: string) => void
  onConfirm: () => void
  total: number
  creditApplied?: number
  error?: string | null
}

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}

const methodIcons: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="h-4 w-4" />,
  tarjeta: <CreditCard className="h-4 w-4" />,
  transferencia: <ArrowRightLeft className="h-4 w-4" />,
}

export function PosPaymentDialog({
  open,
  onClose,
  checkoutStatus,
  selectedMethod,
  onMethodChange,
  paymentAmount,
  onAmountChange,
  onConfirm,
  total,
  creditApplied = 0,
  error,
}: PosPaymentDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])

  const totalWithCredit = total - creditApplied
  const totalPaid = payments.reduce((a, p) => a + p.amount, 0)
  const paymentRemaining = totalWithCredit - totalPaid

  function addPayment() {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return
    setPayments((prev) => [
      ...prev,
      { id: `pay-${Date.now()}`, method: selectedMethod, amount },
    ])
    onAmountChange("")
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Metodos de Pago</DialogTitle>
          <DialogDescription>
            Combina efectivo, tarjeta y transferencia en una sola operacion. Cada monto se registra en su caja correspondiente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex flex-col gap-4">
          <div className="rounded-lg bg-primary px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-widest text-primary-foreground/70">Total a cobrar</p>
            <p className="font-mono text-3xl font-bold text-primary-foreground mt-1">
              {formatARS(totalWithCredit)}
            </p>
          </div>

          {payments.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pagos Registrados
              </span>
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    {methodIcons[p.method]}
                    <span className="text-sm font-medium text-card-foreground">
                      {methodLabels[p.method]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-card-foreground">
                      {formatARS(p.amount)}
                    </span>
                    <button
                      onClick={() => removePayment(p.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Eliminar pago"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${
            paymentRemaining <= 0
              ? "bg-success/10 border border-success/20"
              : "bg-warning/10 border border-warning/20"
          }`}>
            <span className={`text-sm font-medium ${
              paymentRemaining <= 0 ? "text-success-foreground" : "text-warning-foreground"
            }`}>
              {paymentRemaining <= 0 ? "Pago completo" : "Falta abonar"}
            </span>
            <span className={`font-mono text-lg font-bold ${
              paymentRemaining <= 0 ? "text-success-foreground" : "text-warning-foreground"
            }`}>
              {paymentRemaining <= 0 ? formatARS(0) : formatARS(paymentRemaining)}
            </span>
          </div>

          {paymentRemaining > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Agregar Pago
                </span>
                <div className="flex gap-3">
                  <Select
                    value={selectedMethod}
                    onValueChange={(v) => onMethodChange(v as UiPaymentMethod)}
                  >
                    <SelectTrigger className="w-[160px] h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-3.5 w-3.5" /> Efectivo
                        </div>
                      </SelectItem>
                      <SelectItem value="tarjeta">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5" /> Tarjeta
                        </div>
                      </SelectItem>
                      <SelectItem value="transferencia">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-3.5 w-3.5" /> Transferencia
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="Monto"
                      className="h-10 pl-7 font-mono"
                      value={paymentAmount}
                      onChange={(e) => onAmountChange(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPayment()}
                    />
                  </div>
                  <Button className="h-10 px-4" onClick={addPayment}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={paymentRemaining > 0 || checkoutStatus === 'confirming'}
            className="gap-2"
            onClick={onConfirm}
          >
            {checkoutStatus === 'confirming' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {checkoutStatus === 'confirming' ? 'Procesando...' : 'Confirmar Cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
