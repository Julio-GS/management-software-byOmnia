'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/src/contexts/auth-context';
import { usePosApi } from '@/hooks/use-pos-api';
import type { Product, CreateSaleDto, Sale, PaymentMethod } from '@omnia/shared-types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type UiPaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface CartItem {
  id: string;          // productId from DB
  name: string;
  barcode: string | null;
  unitPrice: number;   // maps from Product.price
  taxRate: number;     // maps from Product.taxRate
  quantity: number;
  ticketId: string;
  discount?: number;   // reserved, 0 for now
}

export interface Ticket {
  id: string;
  label: string;
}

export type CheckoutStatus = 'idle' | 'payment' | 'confirming' | 'success' | 'error';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const INITIAL_TICKET: Ticket = { id: 'ticket-1', label: 'Ticket 1' };

/**
 * Maps the UI payment method labels to the backend PaymentMethod enum.
 */
function translatePaymentMethod(method: UiPaymentMethod): PaymentMethod {
  const map: Record<UiPaymentMethod, PaymentMethod> = {
    efectivo: 'cash',
    tarjeta: 'card',
    transferencia: 'transfer',
  };
  return map[method];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function usePosState() {
  const { user } = useAuth();
  const posApi = usePosApi();
  const { toast } = useToast();

  /* -------- Cart state -------- */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([INITIAL_TICKET]);
  const [activeTicketId, setActiveTicketId] = useState<string>(INITIAL_TICKET.id);

  /* -------- Search state -------- */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  /* -------- Checkout state -------- */
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('idle');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<UiPaymentMethod>('efectivo');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Derived state (memoized)                                         */
  /* ---------------------------------------------------------------- */

  const ticketItems = useMemo(
    () => cart.filter((item) => item.ticketId === activeTicketId),
    [cart, activeTicketId]
  );

  const subtotal = useMemo(
    () => ticketItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [ticketItems]
  );

  const totalDiscounts = useMemo(
    () => ticketItems.reduce((acc, item) => acc + (item.discount ?? 0) * item.quantity, 0),
    [ticketItems]
  );

  const taxes = useMemo(
    () => ticketItems.reduce(
      (acc, item) => acc + item.unitPrice * item.taxRate * item.quantity,
      0
    ),
    [ticketItems]
  );

  const total = useMemo(
    () => subtotal - totalDiscounts + taxes,
    [subtotal, totalDiscounts, taxes]
  );

  /* ---------------------------------------------------------------- */
  /*  Debounced search (300ms)                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const id = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await posApi.searchProducts(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(id);
    // posApi is stable (useCallback inside), safe to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  /* ---------------------------------------------------------------- */
  /*  Barcode scanner integration                                      */
  /* ---------------------------------------------------------------- */

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        const product = await posApi.findByBarcode(barcode);
        if (product) {
          if (product.isActive && product.stock > 0) {
            addToCart(product);
          } else if (product.stock === 0) {
            toast({
              title: 'Sin stock',
              description: `${product.name} no tiene stock disponible.`,
            });
          } else {
            toast({
              title: 'Producto inactivo',
              description: `${product.name} no está disponible para la venta.`,
            });
          }
        } else {
          toast({
            title: 'Producto no encontrado',
            description: `No se encontró un producto con el código ${barcode}.`,
          });
        }
      } catch {
        toast({
          title: 'Error al escanear',
          description: 'Ocurrió un error al buscar el producto. Intente nuevamente.',
        });
      }
    },
    // addToCart is defined below; using ref pattern via useCallback prevents stale closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posApi, toast]
  );

  useBarcodeScanner(handleBarcodeScan);

  /* ---------------------------------------------------------------- */
  /*  Cart actions                                                     */
  /* ---------------------------------------------------------------- */

  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.id === product.id && item.ticketId === activeTicketId
        );

        if (existing) {
          return prev.map((item) =>
            item.id === product.id && item.ticketId === activeTicketId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            barcode: product.barcode ?? product.sku ?? null,
            unitPrice: product.price,
            taxRate: product.taxRate ?? 0,
            quantity: 1,
            ticketId: activeTicketId,
            discount: 0,
          },
        ];
      });
    },
    [activeTicketId]
  );

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Ticket actions                                                   */
  /* ---------------------------------------------------------------- */

  const addTicket = useCallback(() => {
    const newId = `ticket-${Date.now()}`;
    const newLabel = `Ticket ${tickets.length + 1}`;
    setTickets((prev) => [...prev, { id: newId, label: newLabel }]);
    setActiveTicketId(newId);
  }, [tickets.length]);

  const moveItemToTicket = useCallback((itemId: string, targetTicketId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, ticketId: targetTicketId } : item
      )
    );
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Checkout actions                                                 */
  /* ---------------------------------------------------------------- */

  const openPaymentDialog = useCallback(() => {
    setCheckoutStatus('payment');
  }, []);

  const closePaymentDialog = useCallback(() => {
    setCheckoutStatus('idle');
    setCheckoutError(null);
  }, []);

  const resetCart = useCallback(() => {
    setCart([]);
    setTickets([INITIAL_TICKET]);
    setActiveTicketId(INITIAL_TICKET.id);
    setPaymentAmount('');
    setCheckoutStatus('idle');
    setLastSale(null);
    setCheckoutError(null);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const confirmCheckout = useCallback(async () => {
    setCheckoutStatus('confirming');
    try {
      const dto: CreateSaleDto = {
        paymentMethod: translatePaymentMethod(selectedPaymentMethod),
        discountAmount: 0,
        cashierId: user?.id ?? '',
        items: ticketItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount ?? 0,
        })),
      };

      const sale = await posApi.createSale(dto);
      setLastSale(sale);
      setCheckoutStatus('success');
      toast({
        title: 'Venta completada',
        description: `Comprobante: ${sale.saleNumber}`,
      });
      resetCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el cobro';
      setCheckoutError(msg);
      setCheckoutStatus('error');
      toast({
        title: 'Error al cobrar',
        description: msg,
      });
    }
  }, [selectedPaymentMethod, user, ticketItems, posApi, toast, resetCart]);

  /* ---------------------------------------------------------------- */
  /*  Return                                                           */
  /* ---------------------------------------------------------------- */

  return {
    // Cart
    cart,
    tickets,
    activeTicketId,

    // Search
    searchQuery,
    searchResults,
    isSearching,

    // Checkout
    checkoutStatus,
    selectedPaymentMethod,
    paymentAmount,
    lastSale,
    checkoutError,

    // Derived
    ticketItems,
    subtotal,
    totalDiscounts,
    taxes,
    total,

    // Actions
    setSearchQuery,
    addToCart,
    updateQuantity,
    removeItem,
    setActiveTicketId,
    addTicket,
    moveItemToTicket,
    setSelectedPaymentMethod,
    setPaymentAmount,
    openPaymentDialog,
    closePaymentDialog,
    confirmCheckout,
    resetCart,
  };
}
