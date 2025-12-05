// Data transformation utilities for connectors

import { TransformDefinition, FieldMapping, TransformFunction } from './types';

/**
 * Transform source data to target schema
 */
export function transformData<TSource, TTarget>(
  source: TSource,
  definition: TransformDefinition,
  customTransforms?: Record<string, (value: unknown) => unknown>
): TTarget {
  const result: Record<string, unknown> = {};

  for (const mapping of definition.mappings) {
    const sourceValue = getNestedValue(source, mapping.from);
    const transformedValue = applyTransform(
      sourceValue,
      mapping,
      customTransforms
    );

    if (transformedValue !== undefined || mapping.default !== undefined) {
      result[mapping.to] = transformedValue ?? mapping.default;
    }
  }

  return result as TTarget;
}

/**
 * Transform an array of records
 */
export function transformDataArray<TSource, TTarget>(
  sources: TSource[],
  definition: TransformDefinition,
  customTransforms?: Record<string, (value: unknown) => unknown>
): TTarget[] {
  return sources.map((source) =>
    transformData<TSource, TTarget>(source, definition, customTransforms)
  );
}

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(
  obj: unknown,
  path: string
): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;

    // Handle array index notation
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayKey = arrayMatch[1];
      const index = arrayMatch[2];
      if (arrayKey && index) {
        current = (current as Record<string, unknown>)[arrayKey];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      }
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }

  return current;
}

/**
 * Set nested value in object using dot notation
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }
}

/**
 * Apply transform function to value
 */
function applyTransform(
  value: unknown,
  mapping: FieldMapping,
  customTransforms?: Record<string, (value: unknown) => unknown>
): unknown {
  if (value === null || value === undefined) {
    return mapping.default;
  }

  if (!mapping.transform) {
    return value;
  }

  // Handle built-in transforms
  if (typeof mapping.transform === 'string') {
    return applyBuiltInTransform(value, mapping.transform);
  }

  // Handle custom transforms
  if ('custom' in mapping.transform) {
    const customFn = customTransforms?.[mapping.transform.custom];
    if (customFn) {
      return customFn(value);
    }
    console.warn(`Custom transform not found: ${mapping.transform.custom}`);
    return value;
  }

  return value;
}

/**
 * Apply built-in transform function
 */
function applyBuiltInTransform(
  value: unknown,
  transform: TransformFunction
): unknown {
  switch (transform) {
    case 'string':
      return String(value);

    case 'number':
      const num = Number(value);
      return isNaN(num) ? 0 : num;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return ['true', '1', 'yes'].includes(value.toLowerCase());
      }
      return Boolean(value);

    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];

    case 'datetime':
      if (value instanceof Date) {
        return value.toISOString();
      }
      const datetime = new Date(value as string | number);
      return isNaN(datetime.getTime()) ? null : datetime.toISOString();

    case 'json':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;

    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Try to parse as JSON array
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          // Split by comma as fallback
          return value.split(',').map((s) => s.trim());
        }
      }
      return [value];

    case 'currency':
      // Convert to cents/smallest unit
      const amount = Number(value);
      if (isNaN(amount)) return 0;
      return Math.round(amount * 100);

    default:
      return value;
  }
}

/**
 * Create a field mapping
 */
export function createMapping(
  from: string,
  to: string,
  options?: {
    transform?: TransformFunction;
    default?: unknown;
  }
): FieldMapping {
  return {
    from,
    to,
    transform: options?.transform,
    default: options?.default,
  };
}

/**
 * Create a transform definition
 */
export function createTransform(
  source: string,
  target: string,
  mappings: FieldMapping[]
): TransformDefinition {
  return {
    source,
    target,
    mappings,
  };
}

/**
 * Merge multiple objects into one
 */
export function mergeObjects(
  ...objects: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const obj of objects) {
    if (obj) {
      Object.assign(result, obj);
    }
  }

  return result;
}

/**
 * Pick specific fields from object
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};

  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }

  return result;
}

/**
 * Omit specific fields from object
 */
export function omitFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = { ...obj };

  for (const field of fields) {
    delete result[field];
  }

  return result;
}
