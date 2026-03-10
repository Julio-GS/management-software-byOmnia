/**
 * Type converters for SQLite <-> TypeScript
 * Handles conversion of types between SQLite (TEXT, INTEGER, REAL) and TypeScript types
 */

/**
 * Convert decimal number to SQLite TEXT representation
 * SQLite doesn't have native DECIMAL type, so we store as TEXT for precision
 */
export function decimalToText(value: number | string): string {
  if (typeof value === 'string') {
    return value;
  }
  return value.toFixed(2);
}

/**
 * Convert SQLite TEXT to decimal number
 */
export function textToDecimal(value: string | null): number {
  if (value === null) {
    return 0;
  }
  return parseFloat(value);
}

/**
 * Convert boolean to SQLite INTEGER (0 or 1)
 */
export function booleanToInteger(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Convert SQLite INTEGER to boolean
 */
export function integerToBoolean(value: number | null): boolean {
  return value === 1;
}

/**
 * Convert Date to SQLite TEXT (ISO 8601 format)
 */
export function dateToText(date: Date): string {
  return date.toISOString();
}

/**
 * Convert SQLite TEXT to Date
 */
export function textToDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  return new Date(value);
}

/**
 * Convert object to JSON TEXT for storage
 */
export function objectToJson(obj: any): string {
  return JSON.stringify(obj);
}

/**
 * Convert JSON TEXT to object
 */
export function jsonToObject<T = any>(json: string | null): T | null {
  if (!json) {
    return null;
  }
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get current timestamp as ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Sanitize string for SQL (removes null bytes and control characters)
 */
export function sanitizeString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/\0/g, '').trim();
}

/**
 * Convert camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function objectToSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[camelToSnake(key)] = obj[key];
    }
  }
  return result;
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function objectToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[snakeToCamel(key)] = obj[key];
    }
  }
  return result;
}
