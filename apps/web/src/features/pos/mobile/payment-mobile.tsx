/**
 * Payment Mobile Component
 * Reference: MOBILE_DESIGN_SYSTEM.md - Section "Mobile POS - Payment Tab"
 * 
 * Mobile-optimized payment interface with:
 * - Payment method selection
 * - Touch-optimized numeric keypad
 * - Change calculation
 * - Receipt generation
 * 
 * @example
 * ```tsx
 * <PaymentMobile
 *   cartItems={items}
 *   total={100.50}
 *   onPaymentComplete={handleComplete}
 * />
 * ```
 */

"use client"

import { useState, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"
import {
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Check,
  X,
  Delete,
} from "lucide-react"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { cn } from "@/lib/utils"
import type { CartItem } from "./pos-mobile-view"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PaymentMethod = "efectivo" | "tarjeta" | "transferencia"

interface PaymentMobileProps {
  cartItems: CartItem[]
  total: number
  onPaymentComplete: () => void
  onCancel: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PaymentMobile({
  cartItems,
  total,
  onPaymentComplete,
  onCancel,
}: PaymentMobileProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo")
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [processing, setProcessing] = useState(false)
  const haptic = useHapticFeedback()

  /* ------------------------------------------------------------------ */
  /*  Calculations                                                       */
  /* ------------------------------------------------------------------ */

  const paidAmount = parseFloat(amountPaid) || 0
  const change = Math.max(0, paidAmount - total)
  const canComplete = paidAmount >= total

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const handlePaymentMethodChange = useCallback(
    (method: PaymentMethod) => {
      setPaymentMethod(method)
      haptic.trigger("light")
    },
    [haptic]
  )

  const handleNumberInput = useCallback((digit: string) => {
    setAmountPaid((prev) => {
      // Limit to 2 decimal places
      if (prev.includes(".")) {
        const [, decimals] = prev.split(".")
        if (decimals.length >= 2) return prev
      }
      return prev + digit
    })
  }, [])

  const handleDecimal = useCallback(() => {
    setAmountPaid((prev) => {
      if (prev.includes(".")) return prev
      return prev + "."
    })
  }, [])

  const handleBackspace = useCallback(() => {
    setAmountPaid((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    setAmountPaid("")
  }, [])

  const handleQuickAmount = useCallback((amount: number) => {
    setAmountPaid(amount.toFixed(2))
  }, [])

  const handleCompletePayment = useCallback(async () => {
    if (!canComplete) return

    setProcessing(true)
    haptic.trigger("success")

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // TODO: Send payment to backend API
    console.log("Payment completed:", {
      method: paymentMethod,
      total,
      amountPaid: paidAmount,
      change,
      items: cartItems,
    })

    setProcessing(false)
    onPaymentComplete()
  }, [canComplete, paymentMethod, total, paidAmount, change, cartItems, onPaymentComplete, haptic])

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Payment Header */}
      <div className="p-4 bg-card border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Procesar Pago</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="gap-1"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Cancelar
          </Button>
        </div>

        {/* Total to Pay */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Total a pagar</p>
          <p className="text-3xl font-bold">${total.toFixed(2)}</p>
        </Card>
      </div>

      {/* Payment Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Payment Method Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={paymentMethod === "efectivo" ? "default" : "outline"}
              className="h-16 flex-col gap-1"
              onClick={() => handlePaymentMethodChange("efectivo")}
            >
              <Banknote className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs">Efectivo</span>
            </Button>
            <Button
              variant={paymentMethod === "tarjeta" ? "default" : "outline"}
              className="h-16 flex-col gap-1"
              onClick={() => handlePaymentMethodChange("tarjeta")}
            >
              <CreditCard className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs">Tarjeta</span>
            </Button>
            <Button
              variant={paymentMethod === "transferencia" ? "default" : "outline"}
              className="h-16 flex-col gap-1"
              onClick={() => handlePaymentMethodChange("transferencia")}
            >
              <ArrowRightLeft className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs">Transferencia</span>
            </Button>
          </div>
        </div>

        {/* Amount Paid */}
        {paymentMethod === "efectivo" && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Monto recibido</label>
            <Card className="p-4 bg-muted/50">
              <p className="text-4xl font-bold text-center">
                ${amountPaid || "0.00"}
              </p>
            </Card>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20].map(
                (amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(amount)}
                  >
                    ${amount}
                  </Button>
                )
              )}
            </div>

            {/* Numeric Keypad */}
            <NumericKeypad
              onNumber={handleNumberInput}
              onDecimal={handleDecimal}
              onBackspace={handleBackspace}
              onClear={handleClear}
            />
          </div>
        )}

        {/* Change Display */}
        {paymentMethod === "efectivo" && paidAmount > 0 && (
          <Card className={cn(
            "p-4 border-2",
            canComplete ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {canComplete ? "Cambio" : "Falta"}
              </span>
              <span className="text-2xl font-bold">
                ${Math.abs(change).toFixed(2)}
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Complete Payment Button */}
      <div className="p-4 bg-card border-t">
        <Button
          size="lg"
          className="w-full h-12 text-base gap-2"
          disabled={!canComplete || processing}
          onClick={handleCompletePayment}
        >
          {processing ? (
            "Procesando..."
          ) : (
            <>
              <Check className="w-5 h-5" aria-hidden="true" />
              Completar Venta
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Numeric Keypad Component                                           */
/* ------------------------------------------------------------------ */

interface NumericKeypadProps {
  onNumber: (digit: string) => void
  onDecimal: () => void
  onBackspace: () => void
  onClear: () => void
}

function NumericKeypad({ onNumber, onDecimal, onBackspace, onClear }: NumericKeypadProps) {
  const haptic = useHapticFeedback()

  const handlePress = useCallback(
    (action: () => void) => {
      haptic.trigger("light")
      action()
    },
    [haptic]
  )

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Numbers 1-9 */}
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          className="h-14 text-xl font-semibold"
          onClick={() => handlePress(() => onNumber(num))}
        >
          {num}
        </Button>
      ))}

      {/* Bottom Row */}
      <Button
        variant="outline"
        size="lg"
        className="h-14 text-xl font-semibold"
        onClick={() => handlePress(onDecimal)}
      >
        .
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="h-14 text-xl font-semibold"
        onClick={() => handlePress(() => onNumber("0"))}
      >
        0
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="h-14 text-destructive hover:text-destructive"
        onClick={() => handlePress(onBackspace)}
      >
        <Delete className="w-6 h-6" aria-hidden="true" />
      </Button>

      {/* Clear Button */}
      <Button
        variant="outline"
        size="lg"
        className="col-span-3 h-14 text-base"
        onClick={() => handlePress(onClear)}
      >
        Limpiar
      </Button>
    </div>
  )
}
