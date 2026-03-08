/**
 * Validation utilities for database inputs
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a value is not null or undefined
 */
export function required<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
}

/**
 * Validate string is not empty
 */
export function nonEmptyString(value: string | null | undefined, fieldName: string): string {
  const val = required(value, fieldName);
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
  return val.trim();
}

/**
 * Validate email format
 */
export function email(value: string, fieldName: string = 'Email'): string {
  const val = nonEmptyString(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(val)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }
  return val;
}

/**
 * Validate UUID format
 */
export function uuid(value: string, fieldName: string = 'ID'): string {
  const val = nonEmptyString(value, fieldName);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(val)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return val;
}

/**
 * Validate positive number
 */
export function positiveNumber(value: number | string, fieldName: string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
  return num;
}

/**
 * Validate non-negative number (>= 0)
 */
export function nonNegativeNumber(value: number | string, fieldName: string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number`);
  }
  return num;
}

/**
 * Validate integer
 */
export function integer(value: number | string, fieldName: string): number {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
  return num;
}

/**
 * Validate value is one of allowed values
 */
export function oneOf<T>(value: T, allowedValues: T[], fieldName: string): T {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  return value;
}

/**
 * Validate string length
 */
export function maxLength(value: string, max: number, fieldName: string): string {
  const val = required(value, fieldName);
  if (val.length > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max} characters`);
  }
  return val;
}

/**
 * Validate string minimum length
 */
export function minLength(value: string, min: number, fieldName: string): string {
  const val = required(value, fieldName);
  if (val.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters`);
  }
  return val;
}

/**
 * Validate barcode format (EAN-13)
 */
export function barcode(value: string, fieldName: string = 'Barcode'): string {
  const val = nonEmptyString(value, fieldName);
  if (!/^\d{13}$/.test(val)) {
    throw new ValidationError(`${fieldName} must be a 13-digit EAN-13 barcode`);
  }
  return val;
}

/**
 * Validate decimal number (price, cost, etc.)
 */
export function decimal(value: string | number, fieldName: string): string {
  const val = required(value, fieldName);
  const decimalRegex = /^\d+(\.\d{1,2})?$/;
  const strValue = typeof val === 'number' ? val.toFixed(2) : val;
  if (!decimalRegex.test(strValue)) {
    throw new ValidationError(`${fieldName} must be a valid decimal number with up to 2 decimal places`);
  }
  return strValue;
}

/**
 * Validate payment method
 */
export function paymentMethod(value: string): string {
  return oneOf(value, ['cash', 'card', 'qr', 'transfer'], 'Payment method');
}

/**
 * Validate user role
 */
export function userRole(value: string): string {
  return oneOf(value, ['admin', 'cashier', 'manager'], 'User role');
}

/**
 * Validate inventory movement type
 */
export function inventoryMovementType(value: string): string {
  return oneOf(value, ['purchase', 'sale', 'adjustment', 'return', 'waste'], 'Inventory movement type');
}

/**
 * Simple email validation (returns boolean)
 */
export function validateEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Simple role validation (returns boolean)
 */
export function validateRole(value: string): boolean {
  return ['admin', 'cashier', 'manager', 'viewer'].includes(value);
}
