/**
 * Core types for the Connector SDK
 */

// Authentication types
export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'custom';

export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri?: string;
}

export interface ApiKeyConfig {
  headerName?: string;  // Default: 'Authorization'
  prefix?: string;      // Default: 'Bearer'
  location?: 'header' | 'query';
}

export interface BasicAuthConfig {
  usernameField?: string;
  passwordField?: string;
}

export interface AuthConfig {
  type: AuthType;
  oauth2?: OAuth2Config;
  apiKey?: ApiKeyConfig;
  basic?: BasicAuthConfig;
  custom?: Record<string, unknown>;
}

// Connector metadata
export interface ConnectorMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: ConnectorCategory;
  icon?: string;
  brandColor?: string;
  documentationUrl?: string;
  supportUrl?: string;
}

export type ConnectorCategory = 
  | 'ecommerce'
  | 'payments'
  | 'analytics'
  | 'marketing'
  | 'crm'
  | 'erp'
  | 'inventory'
  | 'shipping'
  | 'communication'
  | 'custom';

// Data entity types
export type EntityType = 
  | 'customer'
  | 'order'
  | 'product'
  | 'subscription'
  | 'invoice'
  | 'transaction'
  | 'campaign'
  | 'event'
  | 'custom';

// Sync configuration
export interface SyncConfig {
  entities: EntitySyncConfig[];
  defaultFrequency: SyncFrequency;
  supportedOperations: SyncOperation[];
}

export interface EntitySyncConfig {
  type: EntityType;
  enabled: boolean;
  frequency?: SyncFrequency;
  customEndpoint?: string;
}

export type SyncFrequency = 
  | 'realtime'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'manual';

export type SyncOperation = 
  | 'full_sync'
  | 'incremental_sync'
  | 'webhook';

// Sync result
export interface SyncResult {
  success: boolean;
  entityType: EntityType;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: SyncError[];
  durationMs: number;
  cursor?: string;  // For pagination
}

export interface SyncError {
  recordId?: string;
  message: string;
  code?: string;
  retryable: boolean;
}

// Connection status
export interface ConnectionStatus {
  connected: boolean;
  lastCheckedAt: Date;
  lastSyncAt?: Date;
  error?: string;
  details?: Record<string, unknown>;
}

// Webhook configuration
export interface WebhookConfig {
  supportedEvents: string[];
  verificationMethod: 'hmac' | 'signature' | 'token' | 'none';
  secretHeaderName?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
  raw?: unknown;
}

// Field mapping
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: TransformFunction;
}

export type TransformFunction = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'currency'
  | 'json'
  | ((value: unknown) => unknown);

// Connector configuration schema
export interface ConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'password';
  label: string;
  description?: string;
  required: boolean;
  default?: unknown;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Rate limiting
export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  retryAfterHeader?: string;
}

// Complete connector definition
export interface ConnectorDefinition {
  metadata: ConnectorMetadata;
  auth: AuthConfig;
  config: ConfigField[];
  sync: SyncConfig;
  webhooks?: WebhookConfig;
  rateLimit?: RateLimitConfig;
  fieldMappings: Record<EntityType, FieldMapping[]>;
}

// Connector instance state
export interface ConnectorState {
  workspaceId: string;
  connectorId: string;
  credentials: Record<string, unknown>;
  config: Record<string, unknown>;
  lastSyncCursors: Record<EntityType, string | undefined>;
}

// Normalized data types that connectors should output
export interface NormalizedCustomer {
  externalId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedOrder {
  externalId: string;
  customerId?: string;
  status: string;
  financialStatus: string;
  fulfillmentStatus?: string;
  currency: string;
  totalPrice: number;
  subtotalPrice: number;
  totalTax: number;
  totalDiscount: number;
  lineItems: NormalizedLineItem[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedLineItem {
  externalId: string;
  productId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  totalDiscount: number;
}

export interface NormalizedProduct {
  externalId: string;
  name: string;
  description?: string;
  status: 'active' | 'draft' | 'archived';
  vendor?: string;
  category?: string;
  tags?: string[];
  variants: NormalizedVariant[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedVariant {
  externalId: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  inventoryQuantity?: number;
  weight?: number;
  weightUnit?: string;
}

export interface NormalizedSubscription {
  externalId: string;
  customerId: string;
  planId?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';
  currency: string;
  amount: number;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedInvoice {
  externalId: string;
  customerId: string;
  subscriptionId?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  currency: string;
  amountDue: number;
  amountPaid: number;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}
