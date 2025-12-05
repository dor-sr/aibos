import { pgTable, text, timestamp, jsonb, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { connectors } from './connectors';

// Webhook event status
export const webhookEventStatusEnum = pgEnum('webhook_event_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'retrying',
  'skipped',
]);

// Webhook provider types (aligned with connector_type enum)
export const webhookProviderEnum = pgEnum('webhook_provider', [
  'stripe',
  'shopify',
  'tiendanube',
  'woocommerce',
  'meta_ads',
  'google_ads',
  'ga4',
]);

/**
 * Webhook events table
 * Stores all incoming webhook events for processing and auditing
 */
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .references(() => connectors.id, { onDelete: 'set null' }),
  provider: webhookProviderEnum('provider').notNull(),
  
  // Event identification
  externalEventId: text('external_event_id').notNull(), // Provider's event ID for idempotency
  eventType: text('event_type').notNull(), // e.g., 'customer.created', 'order/create'
  
  // Event data
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  headers: jsonb('headers').$type<Record<string, string>>(),
  
  // Processing status
  status: webhookEventStatusEnum('status').notNull().default('pending'),
  processingResult: jsonb('processing_result').$type<WebhookProcessingResult>(),
  
  // Retry tracking
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  lastError: text('last_error'),
  
  // Timestamps
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Index for looking up events by provider and external ID (idempotency check)
  uniqueIndex('webhook_events_provider_external_id_idx').on(table.provider, table.externalEventId),
  // Index for querying pending events
  index('webhook_events_status_idx').on(table.status),
  // Index for retry processing
  index('webhook_events_next_retry_idx').on(table.nextRetryAt),
  // Index for workspace events
  index('webhook_events_workspace_idx').on(table.workspaceId),
]);

/**
 * Webhook configurations table
 * Stores webhook endpoint configurations per workspace/connector
 */
export const webhookConfigs = pgTable('webhook_configs', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  provider: webhookProviderEnum('provider').notNull(),
  
  // Verification
  signingSecret: text('signing_secret'), // Provider's webhook signing secret
  verificationMethod: text('verification_method'), // 'hmac', 'signature', etc.
  
  // Configuration
  enabledEvents: jsonb('enabled_events').$type<string[]>(), // List of event types to process
  isActive: text('is_active').notNull().default('true'),
  
  // External webhook registration (if applicable)
  externalWebhookId: text('external_webhook_id'), // Provider's webhook ID
  webhookUrl: text('webhook_url'), // The URL registered with the provider
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('webhook_configs_connector_idx').on(table.connectorId),
  index('webhook_configs_workspace_idx').on(table.workspaceId),
]);

// Type definitions
export interface WebhookProcessingResult {
  success: boolean;
  action: string;
  objectId?: string;
  objectType?: string;
  message?: string;
  data?: Record<string, unknown>;
}

// Infer types from schema
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type NewWebhookConfig = typeof webhookConfigs.$inferInsert;


