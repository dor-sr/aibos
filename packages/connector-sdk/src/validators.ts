// Validation utilities for connectors
import { z } from 'zod';
import { ConnectorDefinition, EntityDefinition, EndpointDefinition } from './types';

/**
 * Validate connector definition
 */
export function validateConnectorDefinition(
  definition: ConnectorDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate metadata
  if (!definition.metadata.id) {
    errors.push('Connector ID is required');
  }
  if (!definition.metadata.name) {
    errors.push('Connector name is required');
  }
  if (!definition.metadata.slug) {
    errors.push('Connector slug is required');
  }
  if (!/^[a-z0-9-]+$/.test(definition.metadata.slug)) {
    errors.push('Connector slug must be lowercase alphanumeric with hyphens');
  }
  if (!definition.metadata.version) {
    errors.push('Connector version is required');
  }
  if (!/^\d+\.\d+\.\d+/.test(definition.metadata.version)) {
    errors.push('Connector version must follow semver format');
  }

  // Validate auth
  if (!definition.auth.type) {
    errors.push('Auth type is required');
  }
  if (definition.auth.type === 'oauth2' && !definition.auth.oauth2) {
    errors.push('OAuth2 config is required for oauth2 auth type');
  }

  // Validate entities
  if (!definition.entities || definition.entities.length === 0) {
    errors.push('At least one entity is required');
  }
  for (const entity of definition.entities) {
    const entityErrors = validateEntityDefinition(entity);
    errors.push(...entityErrors.map((e) => `Entity "${entity.name}": ${e}`));
  }

  // Validate endpoints
  if (!definition.endpoints || definition.endpoints.length === 0) {
    errors.push('At least one endpoint is required');
  }
  for (const endpoint of definition.endpoints) {
    const endpointErrors = validateEndpointDefinition(endpoint);
    errors.push(
      ...endpointErrors.map((e) => `Endpoint "${endpoint.name}": ${e}`)
    );
  }

  // Validate transforms
  for (const transform of definition.transforms) {
    if (!transform.source) {
      errors.push('Transform source is required');
    }
    if (!transform.target) {
      errors.push('Transform target is required');
    }
    if (!transform.mappings || transform.mappings.length === 0) {
      errors.push('Transform must have at least one mapping');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate entity definition
 */
function validateEntityDefinition(entity: EntityDefinition): string[] {
  const errors: string[] = [];

  if (!entity.name) {
    errors.push('Name is required');
  }
  if (!entity.targetTable) {
    errors.push('Target table is required');
  }
  if (!entity.primaryKey) {
    errors.push('Primary key is required');
  }

  return errors;
}

/**
 * Validate endpoint definition
 */
function validateEndpointDefinition(endpoint: EndpointDefinition): string[] {
  const errors: string[] = [];

  if (!endpoint.name) {
    errors.push('Name is required');
  }
  if (!endpoint.method) {
    errors.push('Method is required');
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) {
    errors.push('Invalid HTTP method');
  }
  if (!endpoint.path) {
    errors.push('Path is required');
  }

  return errors;
}

/**
 * Common Zod schemas for connector data
 */
export const CommonSchemas = {
  // Currency amount (string that can be parsed to number)
  currencyAmount: z.union([
    z.string().transform((v: string) => parseFloat(v)),
    z.number(),
  ]),

  // Date string
  dateString: z.string().refine(
    (v: string) => !isNaN(Date.parse(v)),
    'Invalid date string'
  ),

  // Email
  email: z.string().email(),

  // URL
  url: z.string().url(),

  // Non-empty string
  nonEmptyString: z.string().min(1),

  // Positive integer
  positiveInt: z.number().int().positive(),

  // Non-negative integer
  nonNegativeInt: z.number().int().nonnegative(),

  // UUID
  uuid: z.string().uuid(),

  // Pagination cursor
  cursor: z.string().optional(),

  // Status enum
  status: z.enum(['active', 'inactive', 'pending', 'error']),

  // Country code (ISO 3166-1 alpha-2)
  countryCode: z.string().length(2).toUpperCase(),

  // Currency code (ISO 4217)
  currencyCode: z.string().length(3).toUpperCase(),

  // Phone number (basic validation)
  phone: z.string().regex(/^[+]?[\d\s()-]+$/),
};

/**
 * Create a paginated response schema
 */
export function createPaginatedSchema<T extends z.ZodTypeAny>(
  itemSchema: T
) {
  return z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      total: z.number().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
      hasMore: z.boolean().optional(),
      cursor: z.string().optional(),
      nextCursor: z.string().optional(),
    }).optional(),
  });
}

/**
 * Validate data against schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Create a validation function for a schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => schema.parse(data);
}

/**
 * Create a safe validation function that returns null on error
 */
export function createSafeValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T | null => {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
  };
}
