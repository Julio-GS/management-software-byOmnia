import type { PaymentMethod } from '@omnia/shared-types';

/** Frontend display values (Spanish, used in UI state) */
export type UiPaymentMethod = 'efectivo' | 'tarjeta';

/** Maps UI value to backend API enum value */
export const UI_TO_API_PAYMENT_METHOD: Record<UiPaymentMethod, PaymentMethod> = {
  efectivo: 'cash',
  tarjeta: 'card',
};

/** Maps backend API value to Spanish display label */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

/**
 * Translates a UI-facing payment method to the backend enum value.
 * Fixes: sending "efectivo" → HTTP 400. Use this at the API boundary.
 */
export function translatePaymentMethod(uiMethod: UiPaymentMethod): PaymentMethod {
  return UI_TO_API_PAYMENT_METHOD[uiMethod];
}
