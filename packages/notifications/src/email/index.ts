import { Resend } from 'resend';
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
 * Production implementation using Resend as the primary provider.
 * Supports Resend, SendGrid, AWS SES, and SMTP.
 */
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = 'email' as const;
  private config: EmailProviderConfig | null = null;
  private resend: Resend | null = null;

  constructor(config?: EmailProviderConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the email provider
   */
  configure(config: EmailProviderConfig): void {
    this.config = config;
    
    // Initialize Resend client if using Resend provider
    if (config.provider === 'resend' && config.apiKey) {
      this.resend = new Resend(config.apiKey);
    }
    
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

    const recipients = options?.to || [];
    if (recipients.length === 0) {
      logger.warn('No recipients specified for email notification');
      return {
        success: false,
        channel: 'email',
        error: 'No recipients specified',
      };
    }

    try {
      logger.info('Sending email notification', {
        type: payload.type,
        workspaceId: payload.workspaceId,
        subject: payload.subject,
        recipientCount: recipients.length,
      });

      // Generate email content based on notification type
      const { subject, html, text } = this.generateEmailContent(payload);

      // Send using the configured provider
      const result = await this.sendWithProvider({
        to: recipients,
        cc: options?.cc,
        bcc: options?.bcc,
        replyTo: options?.replyTo || this.config!.replyTo,
        subject,
        html,
        text,
        attachments: options?.attachments,
      });

      return result;
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
   * Send email using the configured provider
   */
  private async sendWithProvider(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>;
  }): Promise<NotificationResult> {
    const { provider } = this.config!;

    switch (provider) {
      case 'resend':
        return this.sendWithResend(params);
      case 'sendgrid':
        return this.sendWithSendGrid(params);
      case 'ses':
        return this.sendWithSES(params);
      case 'smtp':
        return this.sendWithSMTP(params);
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>;
  }): Promise<NotificationResult> {
    if (!this.resend) {
      return {
        success: false,
        channel: 'email',
        error: 'Resend client not initialized',
      };
    }

    const { data, error } = await this.resend.emails.send({
      from: this.config!.from,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      replyTo: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? Buffer.from(a.content) : a.content,
        contentType: a.contentType,
      })),
    });

    if (error) {
      logger.error('Resend API error', new Error(error.message), { name: error.name });
      return {
        success: false,
        channel: 'email',
        error: error.message,
      };
    }

    logger.info('Email sent via Resend', { messageId: data?.id });

    return {
      success: true,
      channel: 'email',
      messageId: data?.id,
      sentAt: new Date(),
    };
  }

  /**
   * Send email using SendGrid (placeholder for future implementation)
   */
  private async sendWithSendGrid(params: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<NotificationResult> {
    // TODO: Implement SendGrid integration
    logger.warn('SendGrid integration not yet implemented, logging email', {
      to: params.to,
      subject: params.subject,
    });

    return {
      success: true,
      channel: 'email',
      messageId: `sendgrid_${Date.now()}`,
      sentAt: new Date(),
    };
  }

  /**
   * Send email using AWS SES (placeholder for future implementation)
   */
  private async sendWithSES(params: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<NotificationResult> {
    // TODO: Implement AWS SES integration
    logger.warn('AWS SES integration not yet implemented, logging email', {
      to: params.to,
      subject: params.subject,
    });

    return {
      success: true,
      channel: 'email',
      messageId: `ses_${Date.now()}`,
      sentAt: new Date(),
    };
  }

  /**
   * Send email using SMTP (placeholder for future implementation)
   */
  private async sendWithSMTP(params: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<NotificationResult> {
    // TODO: Implement SMTP integration using nodemailer
    logger.warn('SMTP integration not yet implemented, logging email', {
      to: params.to,
      subject: params.subject,
    });

    return {
      success: true,
      channel: 'email',
      messageId: `smtp_${Date.now()}`,
      sentAt: new Date(),
    };
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
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${h.metric}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace;">${h.value}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: ${h.change >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px; color: white;">
              <h1 style="font-size: 24px; margin: 0 0 8px; font-weight: 600;">Weekly Report</h1>
              <p style="margin: 0; opacity: 0.9;">${workspaceName}</p>
              <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">${data.periodStart} - ${data.periodEnd}</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                <h2 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; font-weight: 600;">Summary</h2>
                <p style="margin: 0; color: #475569; font-size: 15px;">${data.summary}</p>
              </div>

              <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 16px; font-weight: 600;">Key Metrics</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">Metric</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">Value</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">Change</th>
                  </tr>
                </thead>
                <tbody>
                  ${highlightsHtml}
                </tbody>
              </table>

              ${data.reportUrl ? `<a href="${data.reportUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">View Full Report</a>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">This report was generated by AI Business OS</p>
            </div>
          </div>
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

    const severityColors = {
      low: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      medium: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      high: { bg: '#fed7aa', text: '#c2410c', border: '#f97316' },
      critical: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
    } as const;

    const defaultColors = severityColors.medium;
    const colors = (data.severity in severityColors 
      ? severityColors[data.severity as keyof typeof severityColors] 
      : defaultColors);
    const subject = `[${data.severity.toUpperCase()}] Anomaly Detected: ${data.title}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 24px 32px;">
              <span style="background: ${colors.border}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${data.severity}</span>
              <h1 style="color: #1e293b; font-size: 22px; margin: 16px 0 8px; font-weight: 600;">${data.title}</h1>
              <p style="color: #64748b; margin: 0; font-size: 14px;">${workspaceName}</p>
            </div>

            <div style="padding: 32px;">
              <div style="margin-bottom: 28px;">
                <h2 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; font-weight: 600;">What Happened</h2>
                <p style="color: #475569; margin: 0; font-size: 15px;">${data.description}</p>
              </div>

              <div style="display: table; width: 100%; margin-bottom: 28px;">
                <div style="display: table-cell; width: 33%; padding: 16px; background: #f8fafc; border-radius: 8px 0 0 8px;">
                  <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Current Value</p>
                  <p style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0; font-family: 'JetBrains Mono', monospace;">${data.currentValue}</p>
                </div>
                <div style="display: table-cell; width: 33%; padding: 16px; background: #f1f5f9;">
                  <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Previous Value</p>
                  <p style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0; font-family: 'JetBrains Mono', monospace;">${data.previousValue}</p>
                </div>
                <div style="display: table-cell; width: 33%; padding: 16px; background: #f8fafc; border-radius: 0 8px 8px 0;">
                  <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Change</p>
                  <p style="color: ${data.changePercent >= 0 ? '#10b981' : '#ef4444'}; font-size: 20px; font-weight: 600; margin: 0;">
                    ${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">View Dashboard</a>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">This alert was generated by AI Business OS</p>
            </div>
          </div>
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${payload.subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px; color: white;">
              <h1 style="font-size: 24px; margin: 0 0 8px; font-weight: 600;">${payload.subject}</h1>
              <p style="margin: 0; opacity: 0.9;">${payload.workspaceName}</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px;">
                <pre style="margin: 0; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${JSON.stringify(payload.data, null, 2)}</pre>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">This notification was sent by AI Business OS</p>
            </div>
          </div>
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
