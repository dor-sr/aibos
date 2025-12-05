import { createLogger } from '@aibos/core';
import { db, notificationSettings, notificationLogs } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type {
  NotificationPayload,
  NotificationResult,
  NotificationChannel,
  NotificationServiceConfig,
  EmailOptions,
  SlackOptions,
} from './types';
import { getEmailProvider, configureEmailProvider } from './email';
import { getSlackProvider, configureSlackProvider } from './slack';

const logger = createLogger('notifications:service');

/**
 * Notification service
 *
 * Orchestrates sending notifications across all configured channels
 */
export class NotificationService {
  private config: NotificationServiceConfig | null = null;

  constructor(config?: NotificationServiceConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the notification service
   */
  configure(config: NotificationServiceConfig): void {
    this.config = config;

    // Configure email provider if settings exist
    if (config.email) {
      configureEmailProvider({
        provider: config.email.provider,
        apiKey: config.email.apiKey,
        from: config.email.from,
        replyTo: config.email.replyTo,
      });
    }

    // Configure Slack provider if settings exist
    if (config.slack) {
      configureSlackProvider({
        webhookUrl: config.slack.webhookUrl,
        botToken: config.slack.botToken,
        defaultChannel: config.slack.defaultChannel,
      });
    }

    logger.info('Notification service configured', {
      hasEmail: !!config.email,
      hasSlack: !!config.slack,
    });
  }

  /**
   * Send notification through all enabled channels for a workspace
   */
  async sendToWorkspace(
    payload: NotificationPayload,
    options?: {
      email?: EmailOptions;
      slack?: SlackOptions;
      channels?: NotificationChannel[];
    }
  ): Promise<NotificationResult[]> {
    logger.info('Sending notification to workspace', {
      workspaceId: payload.workspaceId,
      type: payload.type,
    });

    const results: NotificationResult[] = [];

    try {
      // Get workspace notification settings
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.workspaceId, payload.workspaceId));

      if (settings.length === 0) {
        logger.info('No notification settings found for workspace', {
          workspaceId: payload.workspaceId,
        });
        return results;
      }

      // Filter by requested channels if specified
      const channelsToUse = options?.channels;
      const enabledSettings = settings.filter((s) => {
        if (!s.enabled) return false;
        if (channelsToUse && !channelsToUse.includes(s.channel)) return false;

        // Check preferences for this notification type
        const prefs = s.preferences as { weeklyReports?: boolean; anomalyAlerts?: boolean; syncNotifications?: boolean } | null;
        if (prefs) {
          if (payload.type === 'weekly_report' && prefs.weeklyReports === false) return false;
          if (payload.type === 'anomaly_alert' && prefs.anomalyAlerts === false) return false;
          if ((payload.type === 'sync_completed' || payload.type === 'sync_failed') && prefs.syncNotifications === false) return false;
        }

        return true;
      });

      // Send to each enabled channel
      for (const setting of enabledSettings) {
        const result = await this.sendToChannel(payload, setting.channel, {
          email: options?.email,
          slack: options?.slack,
          settingsId: setting.id,
          config: setting.config as Record<string, unknown>,
        });

        results.push(result);

        // Log notification
        await this.logNotification(payload, setting, result);
      }

      logger.info('Notification sent to workspace', {
        workspaceId: payload.workspaceId,
        channelCount: results.length,
        successCount: results.filter((r) => r.success).length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to send notification to workspace', error as Error, {
        workspaceId: payload.workspaceId,
      });
      throw error;
    }
  }

  /**
   * Send notification to a specific channel
   */
  async sendToChannel(
    payload: NotificationPayload,
    channel: NotificationChannel,
    options?: {
      email?: EmailOptions;
      slack?: SlackOptions;
      settingsId?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'email': {
        const emailConfig = options?.config?.email as { recipients?: string[] } | undefined;
        const emailOptions: EmailOptions = {
          to: options?.email?.to || emailConfig?.recipients || [],
          ...options?.email,
        };
        return getEmailProvider().send(payload, emailOptions);
      }

      case 'slack': {
        const slackConfig = options?.config?.slack as { channel?: string } | undefined;
        const slackOptions: SlackOptions = {
          channel: options?.slack?.channel || slackConfig?.channel,
          ...options?.slack,
        };
        return getSlackProvider().send(payload, slackOptions);
      }

      case 'webhook':
        // TODO: Implement webhook notifications
        logger.warn('Webhook notifications not yet implemented');
        return {
          success: false,
          channel: 'webhook',
          error: 'Webhook notifications not yet implemented',
        };

      default:
        logger.warn('Unknown notification channel', { channel });
        return {
          success: false,
          channel,
          error: `Unknown channel: ${channel}`,
        };
    }
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    payload: NotificationPayload,
    setting: { id: string; channel: NotificationChannel },
    result: NotificationResult
  ): Promise<void> {
    try {
      await db.insert(notificationLogs).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workspaceId: payload.workspaceId,
        settingsId: setting.id,
        channel: setting.channel,
        type: payload.type,
        status: result.success ? 'sent' : 'failed',
        subject: payload.subject,
        content: JSON.stringify(payload.data),
        metadata: {
          messageId: result.messageId,
        },
        sentAt: result.sentAt,
        failedAt: result.success ? null : new Date(),
        errorMessage: result.error,
        relatedEntityType: getEntityType(payload.type),
        relatedEntityId: getEntityId(payload),
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to log notification', error as Error);
      // Don't throw - logging failure shouldn't break the notification flow
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return getEmailProvider().isConfigured() || getSlackProvider().isConfigured();
  }

  /**
   * Get configuration status for all channels
   */
  getStatus(): {
    email: { configured: boolean; errors: string[] };
    slack: { configured: boolean; errors: string[] };
  } {
    const emailValidation = getEmailProvider().validateConfig();
    const slackValidation = getSlackProvider().validateConfig();

    return {
      email: {
        configured: getEmailProvider().isConfigured(),
        errors: emailValidation.errors,
      },
      slack: {
        configured: getSlackProvider().isConfigured(),
        errors: slackValidation.errors,
      },
    };
  }
}

/**
 * Get entity type from notification type
 */
function getEntityType(type: string): string | undefined {
  switch (type) {
    case 'weekly_report':
      return 'report';
    case 'anomaly_alert':
      return 'anomaly';
    default:
      return undefined;
  }
}

/**
 * Get entity ID from payload
 */
function getEntityId(payload: NotificationPayload): string | undefined {
  const data = payload.data as { reportId?: string; anomalyId?: string };
  return data.reportId || data.anomalyId;
}

// Singleton instance
let notificationService: NotificationService | null = null;

/**
 * Get the notification service instance
 */
export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}

/**
 * Configure the notification service
 */
export function configureNotificationService(config: NotificationServiceConfig): void {
  getNotificationService().configure(config);
}

/**
 * Send notification to a workspace
 */
export async function sendNotification(
  payload: NotificationPayload,
  options?: {
    email?: EmailOptions;
    slack?: SlackOptions;
    channels?: NotificationChannel[];
  }
): Promise<NotificationResult[]> {
  return getNotificationService().sendToWorkspace(payload, options);
}
