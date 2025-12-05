// Connector SDK Type Definitions
import { z } from 'zod';

// Connector metadata
export interface ConnectorMetadata {
  /** Unique identifier for the connector */
  id: string;
  /** Human-readable name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Connector description */
  description: string;
  /** Version following semver */
  version: string;
  /** Category: ecommerce, saas, marketing, crm, analytics, etc. */
  category: ConnectorCategory;
  /** Icon URL */
  iconUrl?: string;
  /** Brand color (hex) */
  brandColor?: string;
  /** Documentation URL */
  documentationUrl?: string;
  /** Support URL or email */
  supportUrl?: string;
}

export type ConnectorCategory =
  | 'ecommerce'
  | 'saas'
  | 'marketing'
  | 'crm'
  | 'analytics'
  | 'payment'
  | 'inventory'
  | 'shipping'
  | 'custom';

// Authentication types
export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'bearer' | 'custom';

export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnvVar?: string;
  clientSecretEnvVar?: string;
}

export interface ApiKeyConfig {
  headerName?: string; // Default: 'X-API-Key'
  queryParam?: string; // Alternative to header
  prefix?: string;     // e.g., 'Bearer '
}

export interface BasicAuthConfig {
  usernameField?: string;
  passwordField?: string;
}

export interface AuthConfig {
  type: AuthType;
  oauth2?: OAuth2Config;
  apiKey?: ApiKeyConfig;
  basicAuth?: BasicAuthConfig;
  customFields?: AuthFieldDefinition[];
}

export interface AuthFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

// Configuration schema
export interface ConfigFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'url';
  required: boolean;
  default?: unknown;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

// Sync configuration
export interface SyncConfig {
  /** Default sync frequency in minutes */
  defaultFrequency: number;
  /** Minimum allowed sync frequency */
  minFrequency: number;
  /** Supports incremental sync */
  supportsIncremental: boolean;
  /** Supports webhooks for real-time updates */
  supportsWebhooks: boolean;
}

// Data entity definitions
export interface EntityDefinition {
  /** Entity name (e.g., 'orders', 'customers') */
  name: string;
  /** Human-readable label */
  label: string;
  /** Description of the entity */
  description?: string;
  /** Target table in normalized schema */
  targetTable: string;
  /** Supports incremental sync */
  supportsIncremental: boolean;
  /** Primary key field(s) */
  primaryKey: string | string[];
  /** Field that indicates last update time */
  updatedAtField?: string;
}

// API endpoint definitions
export interface EndpointDefinition {
  /** Endpoint name */
  name: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** URL path (supports {param} placeholders) */
  path: string;
  /** Query parameters */
  queryParams?: Record<string, string>;
  /** Request body schema (Zod schema) */
  requestSchema?: z.ZodSchema;
  /** Response schema (Zod schema) */
  responseSchema?: z.ZodSchema;
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Rate limiting for this endpoint */
  rateLimit?: {
    requests: number;
    period: 'second' | 'minute' | 'hour';
  };
}

export interface PaginationConfig {
  type: 'cursor' | 'offset' | 'page' | 'link';
  pageParam?: string;
  pageSizeParam?: string;
  defaultPageSize?: number;
  maxPageSize?: number;
  cursorField?: string;
  nextLinkField?: string;
}

// Transform definitions
export interface TransformDefinition {
  /** Source entity name */
  source: string;
  /** Target entity name */
  target: string;
  /** Field mappings */
  mappings: FieldMapping[];
  /** Post-transform hooks */
  hooks?: TransformHook[];
}

export interface FieldMapping {
  /** Source field path (dot notation for nested) */
  from: string;
  /** Target field name */
  to: string;
  /** Transform function */
  transform?: TransformFunction;
  /** Default value if source is null/undefined */
  default?: unknown;
}

export type TransformFunction =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'array'
  | 'currency'
  | { custom: string }; // Custom function name

export interface TransformHook {
  type: 'before' | 'after';
  handler: string; // Function name
}

// Webhook definitions
export interface WebhookDefinition {
  /** Event type from provider */
  providerEvent: string;
  /** Mapped internal event type */
  internalEvent: string;
  /** Entity this webhook updates */
  entity: string;
  /** Signature verification */
  signature?: {
    header: string;
    algorithm: 'sha256' | 'sha1' | 'md5';
    secret: string; // Reference to config field
  };
}

// Full connector definition
export interface ConnectorDefinition {
  metadata: ConnectorMetadata;
  auth: AuthConfig;
  config: ConfigFieldDefinition[];
  sync: SyncConfig;
  entities: EntityDefinition[];
  endpoints: EndpointDefinition[];
  transforms: TransformDefinition[];
  webhooks?: WebhookDefinition[];
}

// Runtime context passed to connector methods
export interface ConnectorContext {
  workspaceId: string;
  connectorId: string;
  credentials: Record<string, string>;
  config: Record<string, unknown>;
  logger: ConnectorLogger;
}

export interface ConnectorLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// Sync result types
export interface SyncResult {
  success: boolean;
  entity: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: SyncError[];
  cursor?: string;
  hasMore: boolean;
}

export interface SyncError {
  recordId?: string;
  field?: string;
  message: string;
  code: string;
}

// Webhook event result
export interface WebhookResult {
  processed: boolean;
  event: string;
  entity?: string;
  action?: 'created' | 'updated' | 'deleted';
  recordId?: string;
  error?: string;
}
