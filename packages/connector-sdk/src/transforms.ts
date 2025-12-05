/**
 * Data transformation utilities for connectors
 */

import type { FieldMapping, TransformFunction } from './types';

/**
 * Apply field mappings to transform source data to normalized format
 */
export function applyFieldMappings<T extends Record<string, unknown>>(
  source: Record<string, unknown>,
  mappings: FieldMapping[]
): T {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const sourceValue = getNestedValue(source, mapping.sourceField);
    
    if (sourceValue !== undefined) {
      const transformedValue = mapping.transform
        ? applyTransform(sourceValue, mapping.transform)
        : sourceValue;
      
      setNestedValue(result, mapping.targetField, transformedValue);
    }
  }

  return result as T;
}

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    current[lastPart] = value;
  }
}

/**
 * Apply a transform function to a value
 */
export function applyTransform(value: unknown, transform: TransformFunction): unknown {
  if (typeof transform === 'function') {
    return transform(value);
  }

  switch (transform) {
    case 'string':
      return String(value);
    
    case 'number':
      return parseNumber(value);
    
    case 'boolean':
      return parseBoolean(value);
    
    case 'date':
      return parseDate(value);
    
    case 'currency':
      return parseCurrency(value);
    
    case 'json':
      return parseJson(value);
    
    default:
      return value;
  }
}

/**
 * Parse a value as a number
 */
export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Parse a value as a boolean
 */
export function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  if (typeof value === 'number') return value !== 0;
  return false;
}

/**
 * Parse a value as a Date
 */
export function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

/**
 * Parse a currency value (returns cents/smallest unit as integer)
 */
export function parseCurrency(value: unknown): number {
  const num = parseNumber(value);
  // Assume input is in major units (dollars), convert to minor units (cents)
  return Math.round(num * 100);
}

/**
 * Parse a JSON string
 */
export function parseJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Format a currency value for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Normalize an email address
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize a phone number (basic)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

/**
 * Create a slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}
