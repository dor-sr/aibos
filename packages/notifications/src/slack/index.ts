import { createLogger } from '@aibos/core';
import type {
  NotificationPayload,
  NotificationResult,
  NotificationProvider,
  SlackOptions,
  WeeklyReportNotification,
  AnomalyAlertNotification,
} from '../types';

const logger = createLogger('notifications:slack');

/**
 * Slack notification provider configuration
 */
export interface SlackProviderConfig {
  webhookUrl?: string;
  botToken?: string;
  defaultChannel?: string;
  username?: string;
  iconEmoji?: string;
}

/**
 * Slack Block Kit element types
 */
interface SlackTextElement {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

interface SlackButtonElement {
  type: 'button';
  text: SlackTextElement;
  url?: string;
  action_id?: string;
}

/**
 * Slack Block Kit block types
 */
interface SlackBlock {
  type: string;
  text?: SlackTextElement;
  fields?: SlackTextElement[];
  elements?: (SlackTextElement | SlackButtonElement)[];
  accessory?: SlackButtonElement;
}

/**
 * Slack notification provider
 *
 * Production implementation supporting:
 * - Incoming Webhooks (simple, no auth required)
 * - Bot Token API (full Slack API access)
 */
export class SlackNotificationProvider implements NotificationProvider {
  readonly channel = 'slack' as const;
  private config: SlackProviderConfig | null = null;

  constructor(config?: SlackProviderConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Configure the Slack provider
   */
  configure(config: SlackProviderConfig): void {
    this.config = config;
    logger.info('Slack provider configured', {
      hasWebhook: !!config.webhookUrl,
      hasBotToken: !!config.botToken,
    });
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!(this.config.webhookUrl || this.config.botToken);
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Slack provider not configured');
      return { valid: false, errors };
    }

    if (!this.config.webhookUrl && !this.config.botToken) {
      errors.push('Either webhookUrl or botToken is required');
    }

    if (this.config.botToken && !this.config.defaultChannel) {
      errors.push('defaultChannel is required when using botToken');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Send Slack notification
   */
  async send(payload: NotificationPayload, options?: SlackOptions): Promise<NotificationResult> {
    if (!this.isConfigured()) {
      logger.warn('Slack provider not configured, skipping notification');
      return {
        success: false,
        channel: 'slack',
        error: 'Slack provider not configured',
      };
    }

    try {
      logger.info('Sending Slack notification', {
        type: payload.type,
        workspaceId: payload.workspaceId,
      });

      // Generate Slack message blocks
      const blocks = this.generateSlackBlocks(payload);
      const text = this.generateFallbackText(payload);

      // Build message payload
      const message = {
        text,
        blocks,
        channel: options?.channel || this.config!.defaultChannel,
        username: options?.username || this.config!.username || 'AI Business OS',
        icon_emoji: options?.iconEmoji || this.config!.iconEmoji || ':chart_with_upwards_trend:',
        thread_ts: options?.threadTs,
      };

      // Send using webhook or bot token
      if (this.config!.webhookUrl) {
        return await this.sendWithWebhook(message);
      } else if (this.config!.botToken) {
        return await this.sendWithBotToken(message);
      }

      return {
        success: false,
        channel: 'slack',
        error: 'No webhook URL or bot token configured',
      };
    } catch (error) {
      logger.error('Failed to send Slack notification', error as Error, {
        type: payload.type,
        workspaceId: payload.workspaceId,
      });

      return {
        success: false,
        channel: 'slack',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send message using Incoming Webhook
   */
  private async sendWithWebhook(message: {
    text: string;
    blocks: SlackBlock[];
    channel?: string;
    username?: string;
    icon_emoji?: string;
    thread_ts?: string;
  }): Promise<NotificationResult> {
    const response = await fetch(this.config!.webhookUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Slack webhook error', new Error(errorText), {
        status: response.status,
      });
      return {
        success: false,
        channel: 'slack',
        error: `Slack webhook error: ${response.status} - ${errorText}`,
      };
    }

    logger.info('Slack notification sent via webhook');

    return {
      success: true,
      channel: 'slack',
      messageId: `slack_webhook_${Date.now()}`,
      sentAt: new Date(),
    };
  }

  /**
   * Send message using Bot Token (Slack Web API)
   */
  private async sendWithBotToken(message: {
    text: string;
    blocks: SlackBlock[];
    channel?: string;
    username?: string;
    icon_emoji?: string;
    thread_ts?: string;
  }): Promise<NotificationResult> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        username: message.username,
        icon_emoji: message.icon_emoji,
        thread_ts: message.thread_ts,
      }),
    });

    const result = await response.json() as { ok: boolean; error?: string; ts?: string };

    if (!result.ok) {
      logger.error('Slack API error', new Error(result.error || 'Unknown error'));
      return {
        success: false,
        channel: 'slack',
        error: `Slack API error: ${result.error}`,
      };
    }

    logger.info('Slack notification sent via Bot Token', { ts: result.ts });

    return {
      success: true,
      channel: 'slack',
      messageId: result.ts,
      sentAt: new Date(),
    };
  }

  /**
   * Generate Slack Block Kit blocks based on notification type
   */
  private generateSlackBlocks(payload: NotificationPayload): SlackBlock[] {
    switch (payload.type) {
      case 'weekly_report':
        return this.generateWeeklyReportBlocks(payload as WeeklyReportNotification);
      case 'anomaly_alert':
        return this.generateAnomalyAlertBlocks(payload as AnomalyAlertNotification);
      default:
        return this.generateGenericBlocks(payload);
    }
  }

  /**
   * Generate weekly report Slack blocks
   */
  private generateWeeklyReportBlocks(payload: WeeklyReportNotification): SlackBlock[] {
    const { workspaceName, data } = payload;

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Weekly Report: ${workspaceName}`,
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `${data.periodStart} - ${data.periodEnd}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary*\n${data.summary}`,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Add metrics as fields
    const metricsFields = data.highlights.slice(0, 10).map((h) => ({
      type: 'mrkdwn' as const,
      text: `*${h.metric}*\n${h.value} (${h.change >= 0 ? '+' : ''}${h.change.toFixed(1)}%)`,
    }));

    // Group fields into sections of 2
    for (let i = 0; i < metricsFields.length; i += 2) {
      blocks.push({
        type: 'section',
        fields: metricsFields.slice(i, i + 2),
      });
    }

    // Add button if report URL exists
    if (data.reportUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Report',
              emoji: true,
            },
            url: data.reportUrl,
            action_id: 'view_report',
          },
        ],
      });
    }

    return blocks;
  }

  /**
   * Generate anomaly alert Slack blocks
   */
  private generateAnomalyAlertBlocks(payload: AnomalyAlertNotification): SlackBlock[] {
    const { workspaceName, data } = payload;

    const severityEmoji: Record<string, string> = {
      low: ':information_source:',
      medium: ':warning:',
      high: ':exclamation:',
      critical: ':rotating_light:',
    };

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[data.severity]} Anomaly Detected`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${data.title}*\n${data.description}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: data.severity.toUpperCase(),
            emoji: true,
          },
          action_id: 'severity_badge',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: workspaceName,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Value*\n${data.currentValue}`,
          },
          {
            type: 'mrkdwn',
            text: `*Previous Value*\n${data.previousValue}`,
          },
          {
            type: 'mrkdwn',
            text: `*Change*\n${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Metric*\n${data.metricName}`,
          },
        ],
      },
    ];

    // Add dashboard button if URL exists
    if (data.dashboardUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
              emoji: true,
            },
            url: data.dashboardUrl,
            action_id: 'view_dashboard',
          },
        ],
      });
    }

    return blocks;
  }

  /**
   * Generate generic Slack blocks
   */
  private generateGenericBlocks(payload: NotificationPayload): SlackBlock[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: payload.subject,
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: payload.workspaceName,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```' + JSON.stringify(payload.data, null, 2) + '```',
        },
      },
    ];
  }

  /**
   * Generate fallback text for Slack message
   */
  private generateFallbackText(payload: NotificationPayload): string {
    return `[${payload.type}] ${payload.subject} - ${payload.workspaceName}`;
  }
}

// Singleton instance
let slackProvider: SlackNotificationProvider | null = null;

/**
 * Get the Slack notification provider instance
 */
export function getSlackProvider(): SlackNotificationProvider {
  if (!slackProvider) {
    slackProvider = new SlackNotificationProvider();
  }
  return slackProvider;
}

/**
 * Configure the Slack notification provider
 */
export function configureSlackProvider(config: SlackProviderConfig): void {
  getSlackProvider().configure(config);
}

/**
 * Send a Slack notification
 */
export async function sendSlackNotification(
  payload: NotificationPayload,
  options?: SlackOptions
): Promise<NotificationResult> {
  return getSlackProvider().send(payload, options);
}
