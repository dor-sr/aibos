/**
 * Notification Triggers
 * 
 * Service to create notification triggers for metric changes and anomalies.
 */

import { createLogger } from '@aibos/core';
import type { RealtimeEvent, MetricUpdateData, AnomalyEventData } from './types';

const logger = createLogger('realtime:notification-triggers');

export interface NotificationThreshold {
  metricName: string;
  warningThreshold: number;
  criticalThreshold: number;
  direction: 'above' | 'below' | 'any';
  period: 'hourly' | 'daily' | 'weekly';
}

export const DEFAULT_THRESHOLDS: NotificationThreshold[] = [
  {
    metricName: 'revenue',
    warningThreshold: -10,
    criticalThreshold: -25,
    direction: 'below',
    period: 'daily',
  },
  {
    metricName: 'orders',
    warningThreshold: -15,
    criticalThreshold: -30,
    direction: 'below',
    period: 'daily',
  },
  {
    metricName: 'aov',
    warningThreshold: -5,
    criticalThreshold: -15,
    direction: 'below',
    period: 'daily',
  },
  {
    metricName: 'conversion_rate',
    warningThreshold: -10,
    criticalThreshold: -20,
    direction: 'below',
    period: 'daily',
  },
  {
    metricName: 'churn_rate',
    warningThreshold: 10,
    criticalThreshold: 25,
    direction: 'above',
    period: 'weekly',
  },
  {
    metricName: 'mrr',
    warningThreshold: -5,
    criticalThreshold: -15,
    direction: 'below',
    period: 'weekly',
  },
];

export interface MetricNotification {
  id: string;
  workspaceId: string;
  type: 'warning' | 'critical' | 'info';
  source: 'metric_change' | 'anomaly';
  title: string;
  message: string;
  metricName: string;
  currentValue: number;
  previousValue?: number;
  changePercent?: number;
  threshold?: NotificationThreshold;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type NotificationCallback = (notification: MetricNotification) => Promise<void> | void;

/**
 * Notification Trigger Service class
 */
export class NotificationTriggerService {
  private thresholds: NotificationThreshold[];
  private callbacks: NotificationCallback[] = [];
  private workspaceThresholds: Map<string, NotificationThreshold[]> = new Map();

  constructor(defaultThresholds: NotificationThreshold[] = DEFAULT_THRESHOLDS) {
    this.thresholds = defaultThresholds;
  }

  /**
   * Set custom thresholds for a workspace
   */
  setWorkspaceThresholds(workspaceId: string, thresholds: NotificationThreshold[]): void {
    this.workspaceThresholds.set(workspaceId, thresholds);
    logger.info('Custom thresholds set', {
      workspaceId,
      thresholdCount: thresholds.length,
    });
  }

  /**
   * Get thresholds for a workspace
   */
  getThresholds(workspaceId?: string): NotificationThreshold[] {
    if (workspaceId) {
      const custom = this.workspaceThresholds.get(workspaceId);
      if (custom) return custom;
    }
    return this.thresholds;
  }

  /**
   * Register notification callback
   */
  onNotification(callback: NotificationCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Process a realtime event and generate notifications if needed
   */
  async processEvent(event: RealtimeEvent): Promise<MetricNotification | null> {
    if (event.type === 'metrics.updated') {
      return this.processMetricUpdate(event);
    }
    
    if (event.type === 'anomaly.detected') {
      return this.processAnomalyEvent(event);
    }

    return null;
  }

  /**
   * Process metric update event
   */
  private async processMetricUpdate(event: RealtimeEvent): Promise<MetricNotification | null> {
    const data = event.data as Record<string, unknown>;
    
    // Extract metric data with fallbacks
    const metricName = (data.metricName as string) || 'unknown';
    const previousValue = (data.previousValue as number) || 0;
    const currentValue = (data.currentValue as number) || 0;
    const changePercent = (data.changePercent as number) || 0;
    const period = (data.period as string) || 'daily';

    const thresholds = this.getThresholds(event.workspaceId);
    const threshold = thresholds.find(
      (t) => t.metricName === metricName && t.period === period
    );

    if (!threshold) {
      return null;
    }

    // Check if threshold is breached
    const breachType = this.checkThresholdBreach(changePercent, threshold);
    if (!breachType) {
      return null;
    }

    const notification: MetricNotification = {
      id: crypto.randomUUID(),
      workspaceId: event.workspaceId,
      type: breachType,
      source: 'metric_change',
      title: `${metricName} ${breachType === 'critical' ? 'Alert' : 'Warning'}`,
      message: this.generateMetricMessage(metricName, changePercent, threshold, breachType),
      metricName,
      currentValue,
      previousValue,
      changePercent,
      threshold,
      timestamp: new Date(event.timestamp),
    };

    await this.emitNotification(notification);
    return notification;
  }

  /**
   * Process anomaly event
   */
  private async processAnomalyEvent(event: RealtimeEvent): Promise<MetricNotification | null> {
    const data = event.data as Record<string, unknown>;
    
    // Extract anomaly data with fallbacks
    const anomalyId = (data.anomalyId as string) || crypto.randomUUID();
    const metricName = (data.metricName as string) || 'unknown';
    const severity = (data.severity as string) || 'medium';
    const title = (data.title as string) || 'Anomaly Detected';
    const description = (data.description as string) || 'An anomaly was detected';
    const currentValue = (data.currentValue as number) || 0;
    const expectedValue = (data.expectedValue as number) || 0;

    const notificationType = severity === 'high' ? 'critical' : 'warning';

    const notification: MetricNotification = {
      id: crypto.randomUUID(),
      workspaceId: event.workspaceId,
      type: notificationType,
      source: 'anomaly',
      title,
      message: description,
      metricName,
      currentValue,
      previousValue: expectedValue,
      changePercent: expectedValue > 0
        ? ((currentValue - expectedValue) / expectedValue) * 100
        : 0,
      timestamp: new Date(event.timestamp),
      data: {
        anomalyId,
        severity,
      },
    };

    await this.emitNotification(notification);
    return notification;
  }

  /**
   * Check if a threshold is breached
   */
  private checkThresholdBreach(
    changePercent: number,
    threshold: NotificationThreshold
  ): 'warning' | 'critical' | null {
    const { warningThreshold, criticalThreshold, direction } = threshold;

    let breached = false;
    let isCritical = false;

    switch (direction) {
      case 'below':
        breached = changePercent <= warningThreshold;
        isCritical = changePercent <= criticalThreshold;
        break;
      case 'above':
        breached = changePercent >= warningThreshold;
        isCritical = changePercent >= criticalThreshold;
        break;
      case 'any':
        breached = Math.abs(changePercent) >= Math.abs(warningThreshold);
        isCritical = Math.abs(changePercent) >= Math.abs(criticalThreshold);
        break;
    }

    if (isCritical) return 'critical';
    if (breached) return 'warning';
    return null;
  }

  /**
   * Generate notification message for metric change
   */
  private generateMetricMessage(
    metricName: string,
    changePercent: number,
    threshold: NotificationThreshold,
    breachType: 'warning' | 'critical'
  ): string {
    const direction = changePercent > 0 ? 'increased' : 'decreased';
    const severity = breachType === 'critical' ? 'significantly ' : '';
    
    return `${metricName} has ${severity}${direction} by ${Math.abs(changePercent).toFixed(1)}% ` +
           `in the ${threshold.period} period. ` +
           `Threshold: ${threshold[breachType === 'critical' ? 'criticalThreshold' : 'warningThreshold']}%`;
  }

  /**
   * Emit notification to all callbacks
   */
  private async emitNotification(notification: MetricNotification): Promise<void> {
    logger.info('Notification triggered', {
      id: notification.id,
      type: notification.type,
      source: notification.source,
      metricName: notification.metricName,
    });

    for (const callback of this.callbacks) {
      try {
        await callback(notification);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Notification callback error', error);
      }
    }
  }
}

// Export singleton instance
export const notificationTriggerService = new NotificationTriggerService();

/**
 * Setup notification triggers with a callback
 */
export function setupNotificationTriggers(
  callback: NotificationCallback,
  customThresholds?: NotificationThreshold[]
): () => void {
  const service = new NotificationTriggerService(customThresholds || DEFAULT_THRESHOLDS);
  return service.onNotification(callback);
}
