import { createLogger } from '@aibos/core';
import type {
  NotificationPayload,
  NotificationResult,
  NotificationProvider,
  EmailOptions,
  WeeklyReportNotification,
  AnomalyAlertNotification,
} from '../types';

const logger = createLogger('notifications:email');

/**
 * Email notification provider configuration
 */
export interface EmailProviderConfig {
  provider: 'resend' | 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  from: string;
  replyTo?: string;
  // SMTP-specific config
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
}

/**
 * Email notification provider
 *
 * This is a scaffold implementation. In production, integrate with:
 * - Resend (recommended for modern apps)
 * - SendGrid
 * - AWS SES
 * - SMTP server
 */
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = 'email' as const;
  private config: EmailProviderConfig | null = null;

  constructor(config?: EmailProviderConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Configure the email provider
   */
  configure(config: EmailProviderConfig): void {
    this.config = config;
    logger.info('Email provider configured', { provider: config.provider });
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.from;
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Email provider not configured');
      return { valid: false, errors };
    }

    if (!this.config.from) {
      errors.push('From address is required');
    }

    if (this.config.provider !== 'smtp' && !this.config.apiKey) {
      errors.push(`API key is required for ${this.config.provider} provider`);
    }

    if (this.config.provider === 'smtp' && !this.config.smtp) {
      errors.push('SMTP configuration is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Send email notification
   */
  async send(payload: NotificationPayload, options?: EmailOptions): Promise<NotificationResult> {
    if (!this.isConfigured()) {
      logger.warn('Email provider not configured, skipping notification');
      return {
        success: false,
        channel: 'email',
        error: 'Email provider not configured',
      };
    }

    try {
      logger.info('Sending email notification', {
        type: payload.type,
        workspaceId: payload.workspaceId,
        subject: payload.subject,
      });

      // Generate email content based on notification type
      const { subject, html, text } = this.generateEmailContent(payload);

      // TODO: Implement actual email sending based on provider
      // This is a scaffold - integrate with your preferred email service

      /*
      // Example with Resend:
      import { Resend } from 'resend';
      const resend = new Resend(this.config.apiKey);
      const result = await resend.emails.send({
        from: this.config.from,
        to: options?.to || [],
        subject,
        html,
        text,
      });

      // Example with SendGrid:
      import sgMail from '@sendgrid/mail';
      sgMail.setApiKey(this.config.apiKey);
      const result = await sgMail.send({
        from: this.config.from,
        to: options?.to || [],
        subject,
        html,
        text,
      });
      */

      // Scaffold: Log the email that would be sent
      logger.info('Email notification prepared (scaffold mode)', {
        from: this.config!.from,
        to: options?.to,
        subject,
        contentLength: html.length,
      });

      return {
        success: true,
        channel: 'email',
        messageId: `email_${Date.now()}`,
        sentAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send email notification', error as Error, {
        type: payload.type,
        workspaceId: payload.workspaceId,
      });

      return {
        success: false,
        channel: 'email',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate email content based on notification type
   */
  private generateEmailContent(payload: NotificationPayload): {
    subject: string;
    html: string;
    text: string;
  } {
    switch (payload.type) {
      case 'weekly_report':
        return this.generateWeeklyReportEmail(payload as WeeklyReportNotification);
      case 'anomaly_alert':
        return this.generateAnomalyAlertEmail(payload as AnomalyAlertNotification);
      default:
        return this.generateGenericEmail(payload);
    }
  }

  /**
   * Generate weekly report email
   */
  private generateWeeklyReportEmail(payload: WeeklyReportNotification): {
    subject: string;
    html: string;
    text: string;
  } {
    const { workspaceName, data } = payload;

    const subject = `Weekly Report: ${workspaceName} (${data.periodStart} - ${data.periodEnd})`;

    const highlightsHtml = data.highlights
      .map(
        (h) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${h.metric}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${h.value}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${h.change >= 0 ? '#10b981' : '#ef4444'};">
            ${h.change >= 0 ? '+' : ''}${h.change.toFixed(1)}%
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 16px;">Weekly Report</h1>
          <p style="color: #64748b; margin-bottom: 24px;">${workspaceName} | ${data.periodStart} - ${data.periodEnd}</p>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 16px; margin: 0 0 8px;">Summary</h2>
            <p style="margin: 0; color: #475569;">${data.summary}</p>
          </div>

          <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 12px;">Key Metrics</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left;">Metric</th>
                <th style="padding: 8px; text-align: left;">Value</th>
                <th style="padding: 8px; text-align: left;">Change</th>
              </tr>
            </thead>
            <tbody>
              ${highlightsHtml}
            </tbody>
          </table>

          ${data.reportUrl ? `<a href="${data.reportUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Full Report</a>` : ''}
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
          <p style="color: #94a3b8; font-size: 12px;">This report was generated by AI Business OS</p>
        </body>
      </html>
    `;

    const highlightsText = data.highlights
      .map((h) => `  - ${h.metric}: ${h.value} (${h.change >= 0 ? '+' : ''}${h.change.toFixed(1)}%)`)
      .join('\n');

    const text = `
Weekly Report: ${workspaceName}
Period: ${data.periodStart} - ${data.periodEnd}

Summary:
${data.summary}

Key Metrics:
${highlightsText}

${data.reportUrl ? `View full report: ${data.reportUrl}` : ''}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate anomaly alert email
   */
  private generateAnomalyAlertEmail(payload: AnomalyAlertNotification): {
    subject: string;
    html: string;
    text: string;
  } {
    const { workspaceName, data } = payload;

    const severityColors: Record<string, string> = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444',
    };

    const subject = `[${data.severity.toUpperCase()}] Anomaly Detected: ${data.title}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${severityColors[data.severity]}20; border-left: 4px solid ${severityColors[data.severity]}; padding: 16px; margin-bottom: 24px;">
            <span style="background: ${severityColors[data.severity]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${data.severity}</span>
            <h1 style="color: #1e293b; font-size: 20px; margin: 12px 0 8px;">${data.title}</h1>
            <p style="color: #64748b; margin: 0;">${workspaceName}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 16px; margin-bottom: 8px;">What happened</h2>
            <p style="color: #475569; margin: 0;">${data.description}</p>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Current Value</p>
              <p style="color: #1e293b; font-size: 24px; font-weight: 600; margin: 0;">${data.currentValue}</p>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Previous Value</p>
              <p style="color: #1e293b; font-size: 24px; font-weight: 600; margin: 0;">${data.previousValue}</p>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Change</p>
              <p style="color: ${data.changePercent >= 0 ? '#10b981' : '#ef4444'}; font-size: 24px; font-weight: 600; margin: 0;">
                ${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%
              </p>
            </div>
          </div>

          ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Dashboard</a>` : ''}
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
          <p style="color: #94a3b8; font-size: 12px;">This alert was generated by AI Business OS</p>
        </body>
      </html>
    `;

    const text = `
[${data.severity.toUpperCase()}] Anomaly Detected: ${data.title}
Workspace: ${workspaceName}

What happened:
${data.description}

Metric: ${data.metricName}
Current Value: ${data.currentValue}
Previous Value: ${data.previousValue}
Change: ${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%

${data.dashboardUrl ? `View dashboard: ${data.dashboardUrl}` : ''}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate generic email
   */
  private generateGenericEmail(payload: NotificationPayload): {
    subject: string;
    html: string;
    text: string;
  } {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${payload.subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 16px;">${payload.subject}</h1>
          <p style="color: #64748b; margin-bottom: 24px;">${payload.workspaceName}</p>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
            <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(payload.data, null, 2)}</pre>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
          <p style="color: #94a3b8; font-size: 12px;">This notification was sent by AI Business OS</p>
        </body>
      </html>
    `;

    const text = `
${payload.subject}
Workspace: ${payload.workspaceName}

${JSON.stringify(payload.data, null, 2)}
    `.trim();

    return { subject: payload.subject, html, text };
  }
}

// Singleton instance
let emailProvider: EmailNotificationProvider | null = null;

/**
 * Get the email notification provider instance
 */
export function getEmailProvider(): EmailNotificationProvider {
  if (!emailProvider) {
    emailProvider = new EmailNotificationProvider();
  }
  return emailProvider;
}

/**
 * Configure the email notification provider
 */
export function configureEmailProvider(config: EmailProviderConfig): void {
  getEmailProvider().configure(config);
}

/**
 * Send an email notification
 */
export async function sendEmailNotification(
  payload: NotificationPayload,
  options?: EmailOptions
): Promise<NotificationResult> {
  return getEmailProvider().send(payload, options);
}
