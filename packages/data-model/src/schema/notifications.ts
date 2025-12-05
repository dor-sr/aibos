import { pgTable, text, timestamp, jsonb, pgEnum, boolean, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Notification channel types
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'slack', 'webhook']);

// Notification status
export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);

// Notification types
export const notificationTypeEnum = pgEnum('notification_type', [
  'weekly_report',
  'anomaly_alert',
  'sync_completed',
  'sync_failed',
  'welcome',
  'system',
]);

// Notification settings per workspace
export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    enabled: boolean('enabled').notNull().default(true),

    // Channel-specific configuration
    config: jsonb('config').$type<NotificationChannelConfig>().notNull(),

    // Notification preferences
    preferences: jsonb('preferences').$type<NotificationPreferences>().default({
      weeklyReports: true,
      anomalyAlerts: true,
      syncNotifications: false,
    }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_settings_workspace_idx').on(table.workspaceId),
    index('notification_settings_channel_idx').on(table.workspaceId, table.channel),
  ]
);

// Notification log - tracks sent notifications
export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    settingsId: text('settings_id').references(() => notificationSettings.id, {
      onDelete: 'set null',
    }),
    channel: notificationChannelEnum('channel').notNull(),
    type: notificationTypeEnum('type').notNull(),
    status: notificationStatusEnum('status').notNull().default('pending'),

    // Notification content
    subject: text('subject'),
    content: text('content'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Delivery tracking
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorMessage: text('error_message'),

    // Reference to related entity (report, anomaly, etc.)
    relatedEntityType: text('related_entity_type'),
    relatedEntityId: text('related_entity_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_logs_workspace_idx').on(table.workspaceId),
    index('notification_logs_status_idx').on(table.workspaceId, table.status),
    index('notification_logs_type_idx').on(table.workspaceId, table.type),
  ]
);

// Type definitions for JSONB columns
export interface NotificationChannelConfig {
  // Email configuration
  email?: {
    recipients: string[];
    replyTo?: string;
  };
  // Slack configuration
  slack?: {
    webhookUrl: string;
    channel?: string;
    username?: string;
  };
  // Webhook configuration
  webhook?: {
    url: string;
    headers?: Record<string, string>;
    method?: 'POST' | 'PUT';
  };
}

export interface NotificationPreferences {
  weeklyReports: boolean;
  anomalyAlerts: boolean;
  syncNotifications: boolean;
  anomalySeverityThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

// Infer types from schema
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NewNotificationSetting = typeof notificationSettings.$inferInsert;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
