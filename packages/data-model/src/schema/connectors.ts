import { pgTable, text, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Enums
export const connectorTypeEnum = pgEnum('connector_type', [
  'shopify',
  'tiendanube',
  'mercadolibre',
  'woocommerce',
  'stripe',
  'ga4',
  'meta_ads',
  'google_ads',
]);

export const connectorStatusEnum = pgEnum('connector_status', [
  'pending',
  'connected',
  'active',
  'syncing',
  'error',
  'disconnected',
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'idle',
  'running',
  'completed',
  'failed',
]);

// Connector configurations
export const connectors = pgTable('connectors', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  type: connectorTypeEnum('type').notNull(),
  name: text('name'), // Optional - auto-generated if not provided
  status: connectorStatusEnum('status').notNull().default('pending'),
  credentials: jsonb('credentials').$type<ConnectorCredentials>(),
  settings: jsonb('settings').$type<ConnectorSettings>(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncStatus: syncStatusEnum('last_sync_status'),
  lastSyncError: text('last_sync_error'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Sync logs
export const syncLogs = pgTable('sync_logs', {
  id: text('id').primaryKey().notNull(),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  status: syncStatusEnum('status').notNull(),
  syncType: text('sync_type'), // 'full' or 'incremental'
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  recordsProcessed: jsonb('records_processed').$type<Record<string, number>>(),
  errors: jsonb('errors').$type<Array<{ type: string; message: string; recordId?: string }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type definitions for JSONB columns
export interface ConnectorCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  shopDomain?: string;
  apiKey?: string;
  [key: string]: unknown;
}

export interface ConnectorSettings {
  syncInterval?: number; // minutes
  syncHistory?: boolean; // whether to sync historical data
  [key: string]: unknown;
}

// Infer types from schema
export type Connector = typeof connectors.$inferSelect;
export type NewConnector = typeof connectors.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;


