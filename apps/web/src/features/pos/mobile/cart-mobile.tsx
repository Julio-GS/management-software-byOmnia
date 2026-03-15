/**
 * Cart Mobile Component
 * Reference: MOBILE_DESIGN_SYSTEM.md - Section "Cart Item Layout"
 * 
 * Mobile-optimized shopping cart with:
 * - Swipe-to-delete gestures
 * - Touch-optimized quantity controls
 * - Total summary
 * - Empty state
 * 
 * @example
 * ```tsx
 * <CartMobile
 *   items={cartItems}
 *   onUpdateQuantity={handleUpdate}
 *   onRemoveItem={handleRemove}
 * />
 * ```
 */

"use client"

import { useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"
import { Separator } from "@/shared/components/ui/separator"
import { Badge } from "@/shared/components/ui/badge"
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  AlertCircle,
} from "lucide-react"
import { useTouchGestures } from "@/hooks/use-touch-gestures"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { cn } from "@/lib/utils"
import type { CartItem } from "./pos-mobile-view"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CartMobileProps {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, delta: number) => void
  onRemoveItem: (itemId: string) => void
  onClearCart: () => void
  onProceedToPayment: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CartMobile({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToPayment,
}: CartMobileProps) {
  const haptic = useHapticFeedback()

  /* ------------------------------------------------------------------ */
  /*  Calculations                                                       */
  /* ------------------------------------------------------------------ */

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const handleIncrement = useCallback(
    (itemId: string) => {
      onUpdateQuantity(itemId, 1)
      haptic.trigger("light")
    },
    [onUpdateQuantity, haptic]
  )

  const handleDecrement = useCallback(
    (itemId: string) => {
      onUpdateQuantity(itemId, -1)
      haptic.trigger("light")
    },
    [onUpdateQuantity, haptic]
  )

  const handleRemove = useCallback(
    (itemId: string) => {
      onRemoveItem(itemId)
      haptic.trigger("warning")
    },
    [onRemoveItem, haptic]
  )

  const handleClearCart = useCallback(() => {
    if (confirm("¿Deseas vaciar el carrito?")) {
      onClearCart()
      haptic.trigger("warning")
    }
  }, [onClearCart, haptic])

  const handleProceed = useCallback(() => {
    onProceedToPayment()
    haptic.trigger("success")
  }, [onProceedToPayment, haptic])

  /* ------------------------------------------------------------------ */
  /*  Empty State                                                        */
  /* ------------------------------------------------------------------ */

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingCart className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Carrito vacío</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Agrega productos desde la pestaña de búsqueda para comenzar una venta
        </p>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Cart Header */}
      <div className="flex items-center justify-between p-4 bg-card border-b">
        <div>
          <h2 className="text-base font-semibold">
            Carrito ({totalItems} {totalItems === 1 ? "producto" : "productos"})
          </h2>
          <p className="text-sm text-muted-foreground">
            Subtotal: ${subtotal.toFixed(2)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearCart}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Vaciar
        </Button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onIncrement={() => handleIncrement(item.id)}
              onDecrement={() => handleDecrement(item.id)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Cart Summary */}
      <div className="border-t bg-card">
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-12 text-base gap-2"
            onClick={handleProceed}
          >
            Proceder al pago
            <Badge variant="secondary" className="ml-auto">
              ${subtotal.toFixed(2)}
            </Badge>
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Cart Item Row Component                                            */
/* ------------------------------------------------------------------ */

interface CartItemRowProps {
  item: CartItem
  onIncrement: () => void
  onDecrement: () => void
  onRemove: () => void
}

function CartItemRow({ item, onIncrement, onDecrement, onRemove }: CartItemRowProps) {
  const itemTotal = item.unitPrice * item.quantity

  // Swipe gesture for delete
  const ref = useTouchGestures<HTMLDivElement>({
    onSwipeLeft: onRemove,
    threshold: 100,
  })

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors active:bg-muted"
    >
      {/* Remove Button */}
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
        onClick={onRemove}
        aria-label="Eliminar producto"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </Button>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          ${item.unitPrice.toFixed(2)} c/u
        </p>
        {item.discount && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {item.discount.label}
          </Badge>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="icon"
          variant="outline"
          className="w-8 h-8"
          onClick={onDecrement}
          disabled={item.quantity <= 1}
          aria-label="Disminuir cantidad"
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">
          {item.quantity}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="w-8 h-8"
          onClick={onIncrement}
          aria-label="Aumentar cantidad"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Item Total */}
      <div className="w-16 text-right flex-shrink-0">
        <p className="text-base font-bold">${itemTotal.toFixed(2)}</p>
      </div>
    </div>
  )
}
