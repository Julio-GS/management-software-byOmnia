/**
 * POS Mobile View - 3-Tab Interface
 * Reference: MOBILE_DESIGN_SYSTEM.md - Section "POS Module Design Preview"
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "POS Mobile Patterns"
 * 
 * Mobile-optimized POS interface with:
 * - 3-tab navigation: Search → Cart → Payment
 * - Touch-optimized product cards and cart items
 * - Barcode scanner integration
 * - Swipe gestures for cart management
 * - Haptic feedback for actions
 * 
 * @example
 * ```tsx
 * import { POSMobileView } from '@/features/pos/mobile/pos-mobile-view';
 * 
 * <POSMobileView />
 * ```
 */

"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
import { Search, ShoppingCart, CreditCard } from "lucide-react"
import { ProductSearchMobile } from "./product-search-mobile"
import { CartMobile } from "./cart-mobile"
import { PaymentMobile } from "./payment-mobile"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CartItem {
  id: string
  name: string
  barcode: string
  unitPrice: number
  quantity: number
  ticketId: string
  discount?: { type: "2x1" | "percentage"; label: string; value: number }
}

interface Ticket {
  id: string
  label: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function POSMobileView() {
  const [activeTab, setActiveTab] = useState<"search" | "cart" | "payment">("search")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [activeTicket, setActiveTicket] = useState<Ticket>({
    id: "t1",
    label: "Ticket Principal",
  })
  const haptic = useHapticFeedback()

  /* ------------------------------------------------------------------ */
  /*  Cart Management                                                    */
  /* ------------------------------------------------------------------ */

  const addToCart = useCallback(
    (product: { id: string; name: string; barcode: string; price: number }) => {
      setCartItems((prev) => {
        const existing = prev.find(
          (item) => item.barcode === product.barcode && item.ticketId === activeTicket.id
        )

        if (existing) {
          return prev.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }

        return [
          ...prev,
          {
            id: `${product.id}-${Date.now()}`,
            name: product.name,
            barcode: product.barcode,
            unitPrice: product.price,
            quantity: 1,
            ticketId: activeTicket.id,
          },
        ]
      })

      haptic.trigger("success")
    },
    [activeTicket.id, haptic]
  )

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  /* ------------------------------------------------------------------ */
  /*  Tab Navigation                                                     */
  /* ------------------------------------------------------------------ */

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as "search" | "cart" | "payment")
      haptic.trigger("light")
    },
    [haptic]
  )

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full bg-background">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col h-full"
      >
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b h-12 bg-card">
          <TabsTrigger
            value="search"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-full"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">Buscar</span>
          </TabsTrigger>

          <TabsTrigger
            value="cart"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-full relative"
          >
            <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">Carrito</span>
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
              >
                {cartItemCount}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="payment"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-full"
            disabled={cartItems.length === 0}
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">Pagar</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="search" className="h-full m-0 p-0">
            <ProductSearchMobile onAddToCart={addToCart} />
          </TabsContent>

          <TabsContent value="cart" className="h-full m-0 p-0">
            <CartMobile
              items={cartItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onProceedToPayment={() => setActiveTab("payment")}
            />
          </TabsContent>

          <TabsContent value="payment" className="h-full m-0 p-0">
            <PaymentMobile
              cartItems={cartItems}
              total={cartTotal}
              onPaymentComplete={() => {
                clearCart()
                setActiveTab("search")
              }}
              onCancel={() => setActiveTab("cart")}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
