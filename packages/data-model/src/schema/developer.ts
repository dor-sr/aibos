// Developer Platform Schema - API keys, usage analytics, outbound webhooks, connector SDK
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  varchar,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { users } from './users';

// API Key status enum
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired']);

// Rate limit tier enum
export const rateLimitTierEnum = pgEnum('rate_limit_tier', ['free', 'starter', 'pro', 'enterprise']);

// Webhook event type enum
export const webhookEventTypeEnum = pgEnum('webhook_event_type', [
  'anomaly.detected',
  'report.generated',
  'sync.completed',
  'sync.failed',
  'insight.created',
  'metric.threshold_exceeded',
  'connector.connected',
  'connector.disconnected',
]);

// Webhook delivery status enum
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'success',
  'failed',
  'retrying',
]);

// Connector SDK status enum
export const connectorSdkStatusEnum = pgEnum('connector_sdk_status', [
  'draft',
  'testing',
  'pending_review',
  'approved',
  'rejected',
  'published',
]);

// Embed token status enum
export const embedTokenStatusEnum = pgEnum('embed_token_status', ['active', 'revoked', 'expired']);

// API Keys table
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Key storage (hashed)
  keyHash: text('key_hash').notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // First 8 chars for identification
  
  // Permissions and scopes
  scopes: jsonb('scopes').$type<string[]>().default([]).notNull(), // e.g., ['read:metrics', 'read:reports', 'write:webhooks']
  
  // Rate limiting
  rateLimitTier: rateLimitTierEnum('rate_limit_tier').default('free').notNull(),
  rateLimitOverride: integer('rate_limit_override'), // Custom requests per minute
  
  // Status and lifecycle
  status: apiKeyStatusEnum('status').default('active').notNull(),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// API Usage tracking table
export const apiUsage = pgTable('api_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Request details
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  statusCode: integer('status_code').notNull(),
  responseTimeMs: integer('response_time_ms').notNull(),
  
  // Request metadata
  requestSize: integer('request_size'), // bytes
  responseSize: integer('response_size'), // bytes
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  
  // Error tracking
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Daily API usage aggregation for analytics
export const apiUsageDaily = pgTable('api_usage_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  
  date: timestamp('date').notNull(),
  
  // Aggregated metrics
  totalRequests: integer('total_requests').default(0).notNull(),
  successfulRequests: integer('successful_requests').default(0).notNull(),
  failedRequests: integer('failed_requests').default(0).notNull(),
  
  // Response time stats
  avgResponseTimeMs: integer('avg_response_time_ms'),
  p95ResponseTimeMs: integer('p95_response_time_ms'),
  p99ResponseTimeMs: integer('p99_response_time_ms'),
  
  // Bandwidth
  totalRequestBytes: integer('total_request_bytes').default(0).notNull(),
  totalResponseBytes: integer('total_response_bytes').default(0).notNull(),
  
  // Endpoint breakdown
  endpointBreakdown: jsonb('endpoint_breakdown').$type<Record<string, number>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Outbound Webhook Endpoints table
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Endpoint configuration
  url: text('url').notNull(),
  secretHash: text('secret_hash').notNull(), // HMAC signing secret
  
  // Events to subscribe to
  events: jsonb('events').$type<string[]>().default([]).notNull(),
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  
  // Retry configuration
  maxRetries: integer('max_retries').default(3).notNull(),
  retryDelaySeconds: integer('retry_delay_seconds').default(60).notNull(),
  
  // Headers to include
  customHeaders: jsonb('custom_headers').$type<Record<string, string>>(),
  
  // Metadata
  lastTriggeredAt: timestamp('last_triggered_at'),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Webhook Deliveries tracking table
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  endpointId: uuid('endpoint_id')
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Event details
  eventType: webhookEventTypeEnum('event_type').notNull(),
  eventId: uuid('event_id').notNull(), // Unique event ID for idempotency
  
  // Payload
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  
  // Delivery status
  status: webhookDeliveryStatusEnum('status').default('pending').notNull(),
  
  // Attempt tracking
  attempts: integer('attempts').default(0).notNull(),
  lastAttemptAt: timestamp('last_attempt_at'),
  nextRetryAt: timestamp('next_retry_at'),
  
  // Response details
  responseStatusCode: integer('response_status_code'),
  responseBody: text('response_body'),
  responseTimeMs: integer('response_time_ms'),
  
  // Error tracking
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
});

// Custom Connectors (SDK) table
export const customConnectors = pgTable('custom_connectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .references(() => workspaces.id, { onDelete: 'cascade' }), // null for marketplace connectors
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Connector metadata
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  version: varchar('version', { length: 50 }).notNull(),
  
  // Connector type
  category: varchar('category', { length: 100 }).notNull(), // e.g., 'ecommerce', 'crm', 'marketing'
  
  // Status
  status: connectorSdkStatusEnum('status').default('draft').notNull(),
  
  // Configuration schema
  configSchema: jsonb('config_schema').$type<Record<string, unknown>>().notNull(), // JSON Schema for auth/config
  
  // Connector code/implementation
  implementation: jsonb('implementation').$type<{
    authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
    authConfig?: Record<string, unknown>;
    endpoints: Record<string, unknown>;
    transforms: Record<string, unknown>;
  }>().notNull(),
  
  // Icon and branding
  iconUrl: text('icon_url'),
  brandColor: varchar('brand_color', { length: 7 }), // hex color
  
  // Marketplace
  isPublic: boolean('is_public').default(false).notNull(),
  installCount: integer('install_count').default(0).notNull(),
  rating: integer('rating'), // 1-5 stars
  
  // Documentation
  documentationUrl: text('documentation_url'),
  supportUrl: text('support_url'),
  
  // Review notes
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedById: uuid('reviewed_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
});

// Connector Installations table
export const connectorInstallations = pgTable('connector_installations', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectorId: uuid('connector_id')
    .notNull()
    .references(() => customConnectors.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  installedById: uuid('installed_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  // Configuration for this installation
  config: jsonb('config').$type<Record<string, unknown>>(),
  credentials: jsonb('credentials').$type<Record<string, unknown>>(), // Encrypted
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Embed Tokens table
export const embedTokens = pgTable('embed_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Token storage (hashed)
  tokenHash: text('token_hash').notNull(),
  tokenPrefix: varchar('token_prefix', { length: 12 }).notNull(),
  
  // Embed configuration
  allowedDomains: jsonb('allowed_domains').$type<string[]>().default([]).notNull(), // Domain whitelist
  
  // Permissions - what can be embedded
  permissions: jsonb('permissions').$type<{
    dashboards?: string[]; // Dashboard IDs
    metrics?: string[];    // Metric keys
    charts?: string[];     // Chart types
  }>().notNull(),
  
  // White-label customization
  customization: jsonb('customization').$type<{
    hideHeader?: boolean;
    hideBranding?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    fontFamily?: string;
  }>(),
  
  // Status and lifecycle
  status: embedTokenStatusEnum('status').default('active').notNull(),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  
  // Usage tracking
  viewCount: integer('view_count').default(0).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Embed Views tracking table
export const embedViews = pgTable('embed_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenId: uuid('token_id')
    .notNull()
    .references(() => embedTokens.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // View details
  embedType: varchar('embed_type', { length: 50 }).notNull(), // 'dashboard', 'chart', 'metric'
  resourceId: varchar('resource_id', { length: 255 }), // ID of the embedded resource
  
  // Context
  referrerDomain: varchar('referrer_domain', { length: 255 }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  
  // Session info
  sessionId: varchar('session_id', { length: 100 }),
  duration: integer('duration'), // seconds
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type NewApiUsage = typeof apiUsage.$inferInsert;

export type ApiUsageDaily = typeof apiUsageDaily.$inferSelect;
export type NewApiUsageDaily = typeof apiUsageDaily.$inferInsert;

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoints.$inferInsert;

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;

export type CustomConnector = typeof customConnectors.$inferSelect;
export type NewCustomConnector = typeof customConnectors.$inferInsert;

export type ConnectorInstallation = typeof connectorInstallations.$inferSelect;
export type NewConnectorInstallation = typeof connectorInstallations.$inferInsert;

export type EmbedToken = typeof embedTokens.$inferSelect;
export type NewEmbedToken = typeof embedTokens.$inferInsert;

export type EmbedView = typeof embedViews.$inferSelect;
export type NewEmbedView = typeof embedViews.$inferInsert;

