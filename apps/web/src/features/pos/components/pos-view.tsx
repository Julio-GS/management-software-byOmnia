"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import {
  Search,
  Barcode,
  SplitSquareVertical,
  ReceiptText,
  Loader2,
} from "lucide-react"

import { usePosState } from "@/features/pos/hooks/use-pos-state"
import { formatARS } from "@/features/pos/utils/format-currency"
import type { Product } from "@omnia/shared-types"

import { PosCartTable, PosCartEmpty } from "./cart/cart-table"
import { PosSummaryPanel } from "./checkout/summary-panel"
import { PosPaymentDialog } from "./checkout/payment-dialog"
import { PosCreditNoteDialog } from "./credit-note/credit-note-dialog"
import { PosSplitTicketDialog } from "./cart/split-ticket-dialog"

export function PosView() {
  const {
    cart, tickets, activeTicketId,
    searchQuery, searchResults, isSearching,
    checkoutStatus, selectedPaymentMethod, paymentAmount,
    ticketItems, subtotal, totalDiscounts, taxes, total,
    setSearchQuery, addToCart, updateQuantity, removeItem,
    setActiveTicketId, addTicket, moveItemToTicket,
    setSelectedPaymentMethod, setPaymentAmount,
    openPaymentDialog, closePaymentDialog, confirmCheckout,
  } = usePosState()

  const [creditNoteOpen, setCreditNoteOpen] = useState(false)
  const [appliedCredit, setAppliedCredit] = useState<{ code: string; product: string; remaining: number } | null>(null)
  const [splitOpen, setSplitOpen] = useState(false)

  const creditApplied = appliedCredit ? appliedCredit.remaining : 0
  const totalBeforeCredit = subtotal - totalDiscounts + taxes
  const totalWithCredit = Math.max(0, totalBeforeCredit - creditApplied)

  function handleProductSelect(product: Product) {
    addToCart(product)
    setSearchQuery("")
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Escanear codigo de barras o buscar producto..."
                className="h-12 pl-11 pr-12 text-base bg-background border-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {searchResults.length > 0 && searchQuery && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-md">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-card-foreground">{product.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{product.barcode || product.sku}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-card-foreground">
                      {formatARS(product.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Tabs value={activeTicketId} onValueChange={setActiveTicketId} className="flex-1">
            <TabsList className="h-9">
              {tickets.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs">
                  {t.label}
                  <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 rounded-full px-1.5 text-[10px] font-mono">
                    {cart.filter((i) => i.ticketId === t.id).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border text-xs"
              onClick={() => setSplitOpen(true)}
            >
              <SplitSquareVertical className="h-3.5 w-3.5" />
              Dividir Ticket
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border text-xs"
              onClick={() => setCreditNoteOpen(true)}
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Nota de Credito
            </Button>
          </div>
        </div>

        <Card className="flex flex-1 flex-col border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                {tickets.find((t) => t.id === activeTicketId)?.label ?? "Carrito"}
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                {ticketItems.length} {ticketItems.length === 1 ? "item" : "items"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {ticketItems.length === 0 ? (
              <PosCartEmpty />
            ) : (
              <PosCartTable
                items={ticketItems}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex w-[380px] flex-col gap-4">
        <PosSummaryPanel
          subtotal={subtotal}
          discounts={totalDiscounts}
          taxes={taxes}
          total={total}
          itemCount={ticketItems.length}
          tickets={tickets}
          activeTicketId={activeTicketId}
          cart={cart}
          appliedCredit={appliedCredit}
          creditApplied={creditApplied}
          totalWithCredit={totalWithCredit}
          onOpenPayment={openPaymentDialog}
        />
      </div>

      <PosCreditNoteDialog
        open={creditNoteOpen}
        onClose={() => setCreditNoteOpen(false)}
        creditNotes={[]}
        appliedCredit={appliedCredit}
        onApply={(credit) => {
          setAppliedCredit(credit)
          setCreditNoteOpen(false)
        }}
        onRemove={() => setAppliedCredit(null)}
      />

      <PosSplitTicketDialog
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        tickets={tickets}
        cart={cart}
        activeTicketId={activeTicketId}
        onMoveItem={moveItemToTicket}
        onAddTicket={addTicket}
        onSetActiveTicket={setActiveTicketId}
      />

      <PosPaymentDialog
        open={checkoutStatus === 'payment'}
        onClose={closePaymentDialog}
        checkoutStatus={checkoutStatus}
        selectedMethod={selectedPaymentMethod}
        onMethodChange={setSelectedPaymentMethod}
        paymentAmount={paymentAmount}
        onAmountChange={setPaymentAmount}
        onConfirm={confirmCheckout}
        total={totalWithCredit}
        creditApplied={creditApplied}
      />
    </div>
  )
}
