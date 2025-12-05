import { pgTable, text, timestamp, jsonb, pgEnum, boolean, index, integer } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { users } from './users';

// Notification channel types
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'slack', 'webhook', 'in_app', 'push']);

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
  'insight',
  'mention',
]);

// In-app notification priority
export const notificationPriorityEnum = pgEnum('notification_priority', ['low', 'normal', 'high', 'urgent']);

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

// In-app notifications - stored notifications for users
export const inAppNotifications = pgTable(
  'in_app_notifications',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    priority: notificationPriorityEnum('priority').notNull().default('normal'),

    // Notification content
    title: text('title').notNull(),
    message: text('message').notNull(),
    actionUrl: text('action_url'),
    actionLabel: text('action_label'),

    // Rich content (optional)
    data: jsonb('data').$type<Record<string, unknown>>(),
    iconType: text('icon_type'), // 'report', 'alert', 'sync', 'insight', etc.

    // Read state
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),

    // Dismissal
    isDismissed: boolean('is_dismissed').notNull().default(false),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),

    // Grouping for notification center
    groupKey: text('group_key'), // e.g., 'anomaly-2024-01-15', 'sync-shopify'
    groupCount: integer('group_count').default(1),

    // Expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('in_app_notifications_user_idx').on(table.userId),
    index('in_app_notifications_workspace_user_idx').on(table.workspaceId, table.userId),
    index('in_app_notifications_unread_idx').on(table.userId, table.isRead),
    index('in_app_notifications_created_idx').on(table.userId, table.createdAt),
  ]
);

// User notification preferences - per-user settings
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),

    // Channel enablement
    emailEnabled: boolean('email_enabled').notNull().default(true),
    slackEnabled: boolean('slack_enabled').notNull().default(true),
    inAppEnabled: boolean('in_app_enabled').notNull().default(true),
    pushEnabled: boolean('push_enabled').notNull().default(false),

    // Type preferences
    weeklyReports: boolean('weekly_reports').notNull().default(true),
    anomalyAlerts: boolean('anomaly_alerts').notNull().default(true),
    syncNotifications: boolean('sync_notifications').notNull().default(false),
    insightNotifications: boolean('insight_notifications').notNull().default(true),
    systemNotifications: boolean('system_notifications').notNull().default(true),

    // Severity threshold for anomaly alerts
    anomalySeverityThreshold: text('anomaly_severity_threshold').default('medium'),

    // Quiet hours (no notifications during this time)
    quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
    quietHoursStart: text('quiet_hours_start'), // e.g., '22:00'
    quietHoursEnd: text('quiet_hours_end'), // e.g., '08:00'
    quietHoursTimezone: text('quiet_hours_timezone'), // e.g., 'America/New_York'

    // Email digest preferences
    emailDigestEnabled: boolean('email_digest_enabled').notNull().default(false),
    emailDigestFrequency: text('email_digest_frequency').default('daily'), // 'daily', 'weekly'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('user_notification_prefs_user_idx').on(table.userId),
    index('user_notification_prefs_workspace_idx').on(table.workspaceId, table.userId),
  ]
);

// Push notification subscriptions - for browser push notifications
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Web Push subscription data
    endpoint: text('endpoint').notNull(),
    p256dhKey: text('p256dh_key').notNull(),
    authKey: text('auth_key').notNull(),

    // Device info
    userAgent: text('user_agent'),
    deviceName: text('device_name'),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('push_subscriptions_user_idx').on(table.userId),
    index('push_subscriptions_endpoint_idx').on(table.endpoint),
  ]
);

// Infer types from schema
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NewNotificationSetting = typeof notificationSettings.$inferInsert;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type NewInAppNotification = typeof inAppNotifications.$inferInsert;
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type NewUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
