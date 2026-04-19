/**
 * Formats a number as Argentine Peso currency.
 * Example: formatARS(5670) → "$5.670,00"
 */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a number as a plain Argentine number (no currency symbol).
 * Example: formatNumber(5670.5) → "5.670,50"
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
