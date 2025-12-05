import type { VerticalType } from '@aibos/core';

/**
 * Supported notification channels
 */
export type NotificationChannel = 'email' | 'slack' | 'webhook';

/**
 * Notification types
 */
export type NotificationType =
  | 'weekly_report'
  | 'anomaly_alert'
  | 'sync_completed'
  | 'sync_failed'
  | 'welcome'
  | 'system';

/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

/**
 * Base notification payload
 */
export interface NotificationPayload {
  workspaceId: string;
  workspaceName: string;
  type: NotificationType;
  subject: string;
  data: Record<string, unknown>;
}

/**
 * Weekly report notification payload
 */
export interface WeeklyReportNotification extends NotificationPayload {
  type: 'weekly_report';
  data: {
    reportId: string;
    periodStart: string;
    periodEnd: string;
    summary: string;
    highlights: Array<{
      metric: string;
      value: string;
      change: number;
    }>;
    reportUrl?: string;
    verticalType: VerticalType;
  };
}

/**
 * Anomaly alert notification payload
 */
export interface AnomalyAlertNotification extends NotificationPayload {
  type: 'anomaly_alert';
  data: {
    anomalyId: string;
    metricName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    currentValue: string;
    previousValue: string;
    changePercent: number;
    dashboardUrl?: string;
  };
}

/**
 * Sync notification payload
 */
export interface SyncNotification extends NotificationPayload {
  type: 'sync_completed' | 'sync_failed';
  data: {
    connectorType: string;
    connectorName: string;
    syncDuration?: number;
    recordsProcessed?: number;
    errorMessage?: string;
  };
}

/**
 * Notification send result
 */
export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

/**
 * Notification provider interface
 */
export interface NotificationProvider {
  readonly channel: NotificationChannel;

  /**
   * Send a notification
   */
  send(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Check if the provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Validate provider configuration
   */
  validateConfig(): { valid: boolean; errors: string[] };
}

/**
 * Email-specific options
 */
export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Slack-specific options
 */
export interface SlackOptions {
  channel?: string;
  username?: string;
  iconEmoji?: string;
  threadTs?: string;
}

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  email?: {
    provider: 'resend' | 'sendgrid' | 'ses' | 'smtp';
    apiKey?: string;
    from: string;
    replyTo?: string;
  };
  slack?: {
    webhookUrl?: string;
    botToken?: string;
    defaultChannel?: string;
  };
  defaults?: {
    enabled: boolean;
    retryAttempts: number;
    retryDelayMs: number;
  };
}
