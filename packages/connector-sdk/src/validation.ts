/**
 * Validation utilities for connectors
 */

import { z } from 'zod';
import type { ConfigField, ConnectorDefinition } from './types';

/**
 * Validate connector configuration against schema
 */
export function validateConfig(
  config: Record<string, unknown>,
  fields: ConfigField[]
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = config[field.name];

    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: field.name,
        message: `${field.label} is required`,
        code: 'required',
      });
      continue;
    }

    // Skip validation for optional empty fields
    if (value === undefined || value === null) continue;

    // Type validation
    const typeError = validateType(value, field.type, field.name, field.label);
    if (typeError) {
      errors.push(typeError);
      continue;
    }

    // Custom validation
    if (field.validation) {
      const customError = validateCustomRules(value, field);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate field type
 */
function validateType(
  value: unknown,
  type: ConfigField['type'],
  fieldName: string,
  label: string
): ValidationError | null {
  switch (type) {
    case 'string':
    case 'password':
      if (typeof value !== 'string') {
        return {
          field: fieldName,
          message: `${label} must be a string`,
          code: 'type',
        };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return {
          field: fieldName,
          message: `${label} must be a number`,
          code: 'type',
        };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          field: fieldName,
          message: `${label} must be a boolean`,
          code: 'type',
        };
      }
      break;

    case 'select':
      if (typeof value !== 'string') {
        return {
          field: fieldName,
          message: `${label} must be a string`,
          code: 'type',
        };
      }
      break;

    case 'multiselect':
      if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
        return {
          field: fieldName,
          message: `${label} must be an array of strings`,
          code: 'type',
        };
      }
      break;
  }

  return null;
}

/**
 * Validate custom rules
 */
function validateCustomRules(
  value: unknown,
  field: ConfigField
): ValidationError | null {
  const { validation } = field;
  if (!validation) return null;

  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return {
        field: field.name,
        message: validation.message || `${field.label} must be at least ${validation.min}`,
        code: 'min',
      };
    }

    if (validation.max !== undefined && value > validation.max) {
      return {
        field: field.name,
        message: validation.message || `${field.label} must be at most ${validation.max}`,
        code: 'max',
      };
    }
  }

  if (typeof value === 'string' && validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return {
        field: field.name,
        message: validation.message || `${field.label} has an invalid format`,
        code: 'pattern',
      };
    }
  }

  return null;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate connector definition
 */
export function validateConnectorDefinition(
  definition: unknown
): { valid: boolean; error?: string } {
  const schema = z.object({
    metadata: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      description: z.string(),
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      category: z.enum([
        'ecommerce', 'payments', 'analytics', 'marketing',
        'crm', 'erp', 'inventory', 'shipping', 'communication', 'custom'
      ]),
    }),
    auth: z.object({
      type: z.enum(['oauth2', 'api_key', 'basic', 'custom']),
    }).passthrough(),
    config: z.array(z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect', 'password']),
      label: z.string(),
      required: z.boolean(),
    }).passthrough()),
    sync: z.object({
      entities: z.array(z.object({
        type: z.string(),
        enabled: z.boolean(),
      }).passthrough()),
      defaultFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']),
      supportedOperations: z.array(z.enum(['full_sync', 'incremental_sync', 'webhook'])),
    }),
    fieldMappings: z.record(z.array(z.object({
      sourceField: z.string(),
      targetField: z.string(),
    }).passthrough())),
  });

  const result = schema.safeParse(definition);

  if (!result.success) {
    return {
      valid: false,
      error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
