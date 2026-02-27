"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  FileText,
  Receipt,
  ShoppingCart,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  SplitSquareVertical,
  ReceiptText,
  AlertCircle,
  Check,
  X,
  UserPlus,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CartItem {
  id: string
  name: string
  barcode: string
  unitPrice: number
  quantity: number
  ticketId: string
  discount?: { type: "2x1" | "percentage"; label: string; value: number }
}

interface CreditNote {
  id: string
  code: string
  product: string
  amount: number
  date: string
  status: "disponible" | "parcial" | "agotada"
  remaining: number
}

interface PaymentEntry {
  id: string
  method: "efectivo" | "tarjeta" | "transferencia"
  amount: number
}

interface Ticket {
  id: string
  label: string
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const defaultTickets: Ticket[] = [
  { id: "t1", label: "Ticket Principal" },
]

const initialCart: CartItem[] = [
  {
    id: "1",
    name: "Leche Entera La Serenisima 1L",
    barcode: "7790070001234",
    unitPrice: 1250,
    quantity: 2,
    ticketId: "t1",
  },
  {
    id: "2",
    name: "Pan Lactal Bimbo 500g",
    barcode: "7790500045678",
    unitPrice: 2100,
    quantity: 1,
    ticketId: "t1",
    discount: { type: "2x1", label: "2x1 en Panificados", value: 2100 },
  },
  {
    id: "3",
    name: "Aceite Girasol Cocinero 1.5L",
    barcode: "7790001234567",
    unitPrice: 3450,
    quantity: 1,
    ticketId: "t1",
  },
  {
    id: "4",
    name: "Fideos Matarazzo Spaghetti 500g",
    barcode: "7790040199901",
    unitPrice: 1890,
    quantity: 3,
    ticketId: "t1",
    discount: { type: "percentage", label: "10% Desc. Jubilados (Dom)", value: 10 },
  },
  {
    id: "5",
    name: "Yogurt Natural Activia 200g",
    barcode: "7790600012345",
    unitPrice: 980,
    quantity: 2,
    ticketId: "t1",
  },
]

const mockCreditNotes: CreditNote[] = [
  {
    id: "nc1",
    code: "NC-2026-00412",
    product: "Coca-Cola 2.25L (vencida)",
    amount: 2850,
    date: "22/02/2026",
    status: "disponible",
    remaining: 2850,
  },
  {
    id: "nc2",
    code: "NC-2026-00398",
    product: "Queso Cremoso Sancor 1kg",
    amount: 5400,
    date: "18/02/2026",
    status: "parcial",
    remaining: 2200,
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

function getItemSubtotal(item: CartItem): number {
  return item.unitPrice * item.quantity
}

function getItemDiscount(item: CartItem): number {
  if (!item.discount) return 0
  if (item.discount.type === "2x1") {
    return Math.floor(item.quantity / 2) * item.unitPrice
  }
  if (item.discount.type === "percentage") {
    return (item.unitPrice * item.quantity * item.discount.value) / 100
  }
  return 0
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PosView() {
  const [cart, setCart] = useState<CartItem[]>(initialCart)
  const [searchQuery, setSearchQuery] = useState("")
  const [tickets, setTickets] = useState<Ticket[]>(defaultTickets)
  const [activeTicketId, setActiveTicketId] = useState("t1")

  // Credit Note dialog
  const [creditNoteOpen, setCreditNoteOpen] = useState(false)
  const [appliedCredit, setAppliedCredit] = useState<CreditNote | null>(null)

  // Split-ticket dialog
  const [splitOpen, setSplitOpen] = useState(false)

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [newPayMethod, setNewPayMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo")
  const [newPayAmount, setNewPayAmount] = useState("")

  /* ---------- derived data ---------- */

  const ticketItems = useMemo(
    () => cart.filter((i) => i.ticketId === activeTicketId),
    [cart, activeTicketId]
  )

  const subtotal = ticketItems.reduce((a, i) => a + getItemSubtotal(i), 0)
  const totalDiscounts = ticketItems.reduce((a, i) => a + getItemDiscount(i), 0)
  const taxRate = 0.21
  const taxableAmount = subtotal - totalDiscounts
  const taxes = taxableAmount * taxRate
  const creditApplied = appliedCredit ? appliedCredit.remaining : 0
  const totalBeforeCredit = taxableAmount + taxes
  const total = Math.max(0, totalBeforeCredit - creditApplied)
  const saldoFavor = creditApplied > totalBeforeCredit ? creditApplied - totalBeforeCredit : 0
  const totalPaid = payments.reduce((a, p) => a + p.amount, 0)
  const paymentRemaining = total - totalPaid

  const allSubtotal = cart.reduce((a, i) => a + getItemSubtotal(i), 0)
  const allDiscounts = cart.reduce((a, i) => a + getItemDiscount(i), 0)
  const allTaxable = allSubtotal - allDiscounts
  const allTotal = allTaxable + allTaxable * taxRate

  /* ---------- cart actions ---------- */

  function updateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  /* ---------- ticket actions ---------- */

  function addTicket() {
    const newId = `t${Date.now()}`
    const num = tickets.length + 1
    setTickets((prev) => [...prev, { id: newId, label: `Ticket ${num}` }])
    setActiveTicketId(newId)
    setSplitOpen(false)
  }

  function moveItemToTicket(itemId: string, targetTicketId: string) {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ticketId: targetTicketId } : item))
    )
  }

  /* ---------- payment actions ---------- */

  function addPayment() {
    const amount = parseFloat(newPayAmount)
    if (isNaN(amount) || amount <= 0) return
    setPayments((prev) => [
      ...prev,
      { id: `pay-${Date.now()}`, method: newPayMethod, amount },
    ])
    setNewPayAmount("")
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex h-full gap-6">
      {/* ============================================================ */}
      {/*  LEFT : Cart area                                            */}
      {/* ============================================================ */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Search bar */}
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
              <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Ticket tabs + quick actions */}
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

        {/* Cart table */}
        <Card className="flex flex-1 flex-col border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <ShoppingCart className="h-[18px] w-[18px]" />
                {tickets.find((t) => t.id === activeTicketId)?.label ?? "Carrito"}
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                {ticketItems.length} {ticketItems.length === 1 ? "item" : "items"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {ticketItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">Este ticket esta vacio</p>
                <p className="text-xs">Escanea un producto para comenzar</p>
              </div>
            ) : (
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
                  {ticketItems.map((item) => {
                    const itemDiscount = getItemDiscount(item)
                    return (
                      <TableRow key={item.id} className="group border-border">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-card-foreground">{item.name}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">{item.barcode}</span>
                            {item.discount && (
                              <Badge
                                className="mt-0.5 w-fit border-success/30 bg-success/10 text-success-foreground text-[11px] font-medium"
                                variant="outline"
                              >
                                {item.discount.label} {" -- Ahorro: "}{formatCurrency(itemDiscount)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-card-foreground">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-border"
                              onClick={() => updateQuantity(item.id, -1)}
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
                              onClick={() => updateQuantity(item.id, 1)}
                              aria-label={`Aumentar cantidad de ${item.name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-card-foreground">
                          {formatCurrency(getItemSubtotal(item))}
                        </TableCell>
                        <TableCell className="pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            onClick={() => removeItem(item.id)}
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  RIGHT : Sale summary with strong hierarchy                  */}
      {/* ============================================================ */}
      <div className="flex w-[380px] flex-col gap-4">
        {/* ---------- Customer-facing summary ---------- */}
        <Card className="flex flex-col border-border bg-card shadow-sm overflow-hidden">
          {/* Header with big total */}
          <div className="bg-primary px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/70">
              Total a Pagar
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-primary-foreground">
              {formatCurrency(total)}
            </p>
            {tickets.length > 1 && (
              <p className="mt-1 text-xs text-primary-foreground/60">
                Total operacion completa: {formatCurrency(allTotal)}
              </p>
            )}
          </div>

          <CardContent className="flex flex-col gap-0 p-0">
            {/* Line items breakdown */}
            <div className="flex flex-col gap-2 px-6 pt-5 pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({ticketItems.length} {ticketItems.length === 1 ? "producto" : "productos"})
                </span>
                <span className="font-mono font-medium text-card-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {totalDiscounts > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-success-foreground">Descuentos</span>
                  <span className="font-mono font-semibold text-success-foreground">
                    -{formatCurrency(totalDiscounts)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IVA (21%)</span>
                <span className="font-mono font-medium text-card-foreground">
                  {formatCurrency(taxes)}
                </span>
              </div>

              {appliedCredit && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-chart-1">Nota de Credito</span>
                  <span className="font-mono font-semibold text-chart-1">
                    -{formatCurrency(creditApplied)}
                  </span>
                </div>
              )}
            </div>

            {/* Saldo a favor / en contra */}
            {appliedCredit && (
              <div className="mx-6 mb-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
                {saldoFavor > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15">
                      <Check className="h-3.5 w-3.5 text-success-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-success-foreground">Saldo a Favor</span>
                      <span className="font-mono text-sm font-bold text-success-foreground">
                        {formatCurrency(saldoFavor)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Queda disponible para la proxima compra
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/15">
                      <AlertCircle className="h-3.5 w-3.5 text-warning-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-warning-foreground">Saldo en Contra</span>
                      <span className="font-mono text-sm font-bold text-card-foreground">
                        {formatCurrency(total)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        El cliente debe abonar la diferencia
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Discount detail */}
            {totalDiscounts > 0 && (
              <div className="border-t border-border px-6 py-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalle de Descuentos
                </span>
                <div className="mt-2 flex flex-col gap-2">
                  {ticketItems
                    .filter((item) => item.discount)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-2 rounded-md bg-success/5 px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-card-foreground leading-relaxed">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-success-foreground">
                            {item.discount?.label}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-semibold text-success-foreground">
                          -{formatCurrency(getItemDiscount(item))}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Applied credit note preview */}
            {appliedCredit && (
              <div className="border-t border-border px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nota de Credito Aplicada
                  </span>
                  <button
                    className="text-xs text-destructive hover:underline"
                    onClick={() => setAppliedCredit(null)}
                  >
                    Quitar
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-md bg-chart-1/5 px-3 py-2">
                  <ReceiptText className="h-4 w-4 shrink-0 text-chart-1" />
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold text-card-foreground">
                      {appliedCredit.code}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {appliedCredit.product}
                    </span>
                  </div>
                  <span className="ml-auto font-mono text-xs font-bold text-chart-1">
                    -{formatCurrency(appliedCredit.remaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Multi-ticket summary */}
            {tickets.length > 1 && (
              <div className="border-t border-border px-6 py-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tickets en esta operacion
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {tickets.map((t) => {
                    const items = cart.filter((i) => i.ticketId === t.id)
                    const tSub = items.reduce((a, i) => a + getItemSubtotal(i), 0)
                    const tDisc = items.reduce((a, i) => a + getItemDiscount(i), 0)
                    const tTax = (tSub - tDisc) * 0.21
                    const tTotal = tSub - tDisc + tTax
                    const isActive = t.id === activeTicketId
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTicketId(t.id)}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-primary/5 ring-1 ring-primary/20"
                            : "bg-muted/40 hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-card-foreground">{t.label}</span>
                          <Badge variant="secondary" className="h-4 rounded-full px-1.5 text-[10px] font-mono">
                            {items.length}
                          </Badge>
                        </div>
                        <span className="font-mono text-xs font-semibold text-card-foreground">
                          {formatCurrency(tTotal)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="border-t border-border px-6 py-5 flex flex-col gap-3">
              <Button
                className="h-12 gap-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                onClick={() => setPaymentOpen(true)}
              >
                <Wallet className="h-4 w-4" />
                Cobrar {formatCurrency(total)}
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
      </div>

      {/* ============================================================ */}
      {/*  DIALOGS                                                     */}
      {/* ============================================================ */}

      {/* ------ Credit Note dialog ------ */}
      <Dialog open={creditNoteOpen} onOpenChange={setCreditNoteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aplicar Nota de Credito</DialogTitle>
            <DialogDescription>
              Selecciona una nota de credito disponible. El saldo se descontara del total o quedara como saldo a favor.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            {mockCreditNotes.map((nc) => {
              const isApplied = appliedCredit?.id === nc.id
              return (
                <button
                  key={nc.id}
                  onClick={() => {
                    setAppliedCredit(nc)
                    setCreditNoteOpen(false)
                  }}
                  className={`flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isApplied
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-card-foreground">
                        {nc.code}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          nc.status === "disponible"
                            ? "border-success/30 bg-success/10 text-success-foreground"
                            : "border-warning/30 bg-warning/10 text-warning-foreground"
                        }`}
                      >
                        {nc.status === "disponible" ? "Disponible" : "Uso Parcial"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{nc.product}</span>
                    <span className="text-[11px] text-muted-foreground">Emitida: {nc.date}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-card-foreground">
                      {formatCurrency(nc.remaining)}
                    </p>
                    {nc.remaining !== nc.amount && (
                      <p className="font-mono text-[11px] text-muted-foreground line-through">
                        {formatCurrency(nc.amount)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <DialogFooter>
            {appliedCredit && (
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => {
                  setAppliedCredit(null)
                  setCreditNoteOpen(false)
                }}
              >
                Quitar Nota de Credito
              </Button>
            )}
            <Button variant="outline" onClick={() => setCreditNoteOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------ Split Ticket dialog ------ */}
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Dividir en Tickets</DialogTitle>
            <DialogDescription>
              Crea un nuevo ticket y arrastra productos para separar compras. Cada ticket genera su propia factura.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {/* Existing tickets summary */}
            <div className="flex flex-col gap-3 mb-4">
              {tickets.map((t) => {
                const items = cart.filter((i) => i.ticketId === t.id)
                return (
                  <div key={t.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-card-foreground">{t.label}</span>
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
                                onValueChange={(val) => moveItemToTicket(item.id, val)}
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
                  </div>
                )
              })}
            </div>

            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addTicket}>
              <UserPlus className="h-4 w-4" />
              Agregar Nuevo Ticket
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setSplitOpen(false)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------ Payment Methods dialog ------ */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Metodos de Pago</DialogTitle>
            <DialogDescription>
              Combina efectivo, tarjeta y transferencia en una sola operacion. Cada monto se registra en su caja correspondiente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex flex-col gap-4">
            {/* Big total display */}
            <div className="rounded-lg bg-primary px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-primary-foreground/70">Total a cobrar</p>
              <p className="font-mono text-3xl font-bold text-primary-foreground mt-1">
                {formatCurrency(total)}
              </p>
            </div>

            {/* Added payments */}
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
                        {formatCurrency(p.amount)}
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

            {/* Remaining */}
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
                {paymentRemaining <= 0 ? formatCurrency(0) : formatCurrency(paymentRemaining)}
              </span>
            </div>

            {paymentRemaining > 0 && (
              <>
                <Separator />
                {/* Add payment */}
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Agregar Pago
                  </span>
                  <div className="flex gap-3">
                    <Select
                      value={newPayMethod}
                      onValueChange={(v) => setNewPayMethod(v as "efectivo" | "tarjeta" | "transferencia")}
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
                        value={newPayAmount}
                        onChange={(e) => setNewPayAmount(e.target.value)}
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
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={paymentRemaining > 0}
              className="gap-2"
              onClick={() => setPaymentOpen(false)}
            >
              <Check className="h-4 w-4" />
              Confirmar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
