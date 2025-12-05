import { createLogger } from '@aibos/core';
import type { VerticalType } from '@aibos/core';

const logger = createLogger('worker:notifications');

// Import types from notifications package
// Note: When @aibos/notifications is installed, uncomment these imports:
// import { sendNotification, type WeeklyReportNotification, type AnomalyAlertNotification } from '@aibos/notifications';

/**
 * Weekly report notification payload
 */
export interface WeeklyReportPayload {
  workspaceId: string;
  workspaceName: string;
  reportId: string;
  periodStart: Date;
  periodEnd: Date;
  summary: string;
  metrics: Record<string, { current: number; previous: number; change: number }>;
  verticalType: VerticalType;
}

/**
 * Anomaly alert notification payload
 */
export interface AnomalyAlertPayload {
  workspaceId: string;
  workspaceName: string;
  anomalyId: string;
  metricName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentValue: string;
  previousValue: string;
  changePercent: number;
}

/**
 * Send weekly report notification
 * This is a scaffold that logs the notification - integrate with @aibos/notifications in production
 */
export async function sendWeeklyReportNotification(payload: WeeklyReportPayload): Promise<void> {
  try {
    logger.info('Sending weekly report notification', {
      workspaceId: payload.workspaceId,
      reportId: payload.reportId,
    });

    // Format metrics for notification
    const highlights = Object.entries(payload.metrics)
      .slice(0, 5)
      .map(([metric, data]) => ({
        metric: formatMetricName(metric),
        value: formatMetricValue(metric, data.current),
        change: data.change,
      }));

    // Build notification payload
    const notificationPayload = {
      workspaceId: payload.workspaceId,
      workspaceName: payload.workspaceName,
      type: 'weekly_report' as const,
      subject: `Weekly Report: ${payload.workspaceName}`,
      data: {
        reportId: payload.reportId,
        periodStart: formatDate(payload.periodStart),
        periodEnd: formatDate(payload.periodEnd),
        summary: payload.summary,
        highlights,
        verticalType: payload.verticalType,
        // TODO: Add actual report URL when web app URL is configured
        // reportUrl: `${process.env.APP_URL}/dashboard/reports/${payload.reportId}`,
      },
    };

    // TODO: Uncomment when @aibos/notifications is properly linked
    // await sendNotification(notificationPayload);

    // Scaffold: Log the notification that would be sent
    logger.info('Weekly report notification prepared (scaffold mode)', {
      workspaceId: payload.workspaceId,
      subject: notificationPayload.subject,
      highlightsCount: highlights.length,
    });
  } catch (error) {
    logger.error('Failed to send weekly report notification', error as Error, {
      workspaceId: payload.workspaceId,
      reportId: payload.reportId,
    });
    // Don't throw - notification failure shouldn't break the job
  }
}

/**
 * Send anomaly alert notification
 * This is a scaffold that logs the notification - integrate with @aibos/notifications in production
 */
export async function sendAnomalyAlertNotification(payload: AnomalyAlertPayload): Promise<void> {
  try {
    logger.info('Sending anomaly alert notification', {
      workspaceId: payload.workspaceId,
      anomalyId: payload.anomalyId,
      severity: payload.severity,
    });

    // Build notification payload
    const notificationPayload = {
      workspaceId: payload.workspaceId,
      workspaceName: payload.workspaceName,
      type: 'anomaly_alert' as const,
      subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
      data: {
        anomalyId: payload.anomalyId,
        metricName: payload.metricName,
        severity: payload.severity,
        title: payload.title,
        description: payload.description,
        currentValue: payload.currentValue,
        previousValue: payload.previousValue,
        changePercent: payload.changePercent,
        // TODO: Add actual dashboard URL when web app URL is configured
        // dashboardUrl: `${process.env.APP_URL}/dashboard?anomaly=${payload.anomalyId}`,
      },
    };

    // TODO: Uncomment when @aibos/notifications is properly linked
    // await sendNotification(notificationPayload);

    // Scaffold: Log the notification that would be sent
    logger.info('Anomaly alert notification prepared (scaffold mode)', {
      workspaceId: payload.workspaceId,
      severity: payload.severity,
      subject: notificationPayload.subject,
    });
  } catch (error) {
    logger.error('Failed to send anomaly alert notification', error as Error, {
      workspaceId: payload.workspaceId,
      anomalyId: payload.anomalyId,
    });
    // Don't throw - notification failure shouldn't break the job
  }
}

/**
 * Format metric name for display
 */
function formatMetricName(name: string): string {
  const displayNames: Record<string, string> = {
    revenue: 'Revenue',
    orders: 'Orders',
    aov: 'Average Order Value',
    customers: 'Total Customers',
    newCustomers: 'New Customers',
    returningCustomers: 'Returning Customers',
    mrr: 'MRR',
    activeSubscribers: 'Active Subscribers',
    newMrr: 'New MRR',
    churnMrr: 'Churned MRR',
    churnRate: 'Churn Rate',
  };

  return displayNames[name] || name;
}

/**
 * Format metric value for display
 */
function formatMetricValue(metric: string, value: number): string {
  const currencyMetrics = ['revenue', 'aov', 'mrr', 'newMrr', 'churnMrr'];
  const percentMetrics = ['churnRate'];

  if (currencyMetrics.includes(metric)) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  if (percentMetrics.includes(metric)) {
    return `${value.toFixed(1)}%`;
  }

  return value.toLocaleString('en-US');
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
