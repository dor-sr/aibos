/**
 * Real-time Anomaly Detector
 * Detects anomalies in metrics as events arrive
 */

import { createLogger, generateId } from '@aibos/core';
import { db, anomalies, workspaces } from '@aibos/data-model';
import { eq } from 'drizzle-orm';
import type { AnomalyEventData, RealtimeEventType, MetricUpdateData } from './types';
import { emitRealtimeEvent, subscribeToEvents } from './event-emitter';
import { metricService } from './metric-service';

const logger = createLogger('realtime:anomaly');

// Threshold configuration per metric
interface MetricThreshold {
  name: string;
  warningThreshold: number; // Percentage change for warning
  criticalThreshold: number; // Percentage change for critical alert
  direction: 'both' | 'increase' | 'decrease'; // Which direction to monitor
}

// Default thresholds for common metrics
const DEFAULT_THRESHOLDS: Record<string, MetricThreshold> = {
  revenue: {
    name: 'Revenue',
    warningThreshold: 20,
    criticalThreshold: 40,
    direction: 'both',
  },
  orders: {
    name: 'Orders',
    warningThreshold: 25,
    criticalThreshold: 50,
    direction: 'both',
  },
  aov: {
    name: 'Average Order Value',
    warningThreshold: 15,
    criticalThreshold: 30,
    direction: 'both',
  },
  customers: {
    name: 'Customers',
    warningThreshold: 20,
    criticalThreshold: 40,
    direction: 'increase', // Usually only care about decreases
  },
  mrr: {
    name: 'Monthly Recurring Revenue',
    warningThreshold: 10,
    criticalThreshold: 20,
    direction: 'both',
  },
  activeSubscriptions: {
    name: 'Active Subscriptions',
    warningThreshold: 15,
    criticalThreshold: 30,
    direction: 'both',
  },
  churn: {
    name: 'Churn Rate',
    warningThreshold: 10,
    criticalThreshold: 25,
    direction: 'increase',
  },
};

/**
 * Real-time Anomaly Detector
 * Monitors metric changes and detects anomalies
 */
class RealtimeAnomalyDetector {
  private thresholds: Record<string, MetricThreshold>;
  private recentAnomalies: Map<string, Date> = new Map(); // Key: workspaceId:metricName, Value: last alert time
  private alertCooldownMs = 60 * 60 * 1000; // 1 hour cooldown between alerts for same metric
  private isInitialized = false;

  constructor(customThresholds?: Record<string, MetricThreshold>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
    logger.info('RealtimeAnomalyDetector initialized');
  }

  /**
   * Initialize the detector and subscribe to metric update events
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Subscribe to metric update events
    subscribeToEvents('metrics.updated', async (event) => {
      const data = event.data as unknown as MetricUpdateData;
      await this.checkForAnomaly(event.workspaceId, data);
    });

    this.isInitialized = true;
    logger.info('Anomaly detector subscribed to metric updates');
  }

  /**
   * Check if a metric update represents an anomaly
   */
  async checkForAnomaly(workspaceId: string, update: MetricUpdateData): Promise<void> {
    const { metricName, changePercent, previousValue, currentValue } = update;

    // Get threshold for this metric
    const threshold = this.thresholds[metricName];
    if (!threshold) {
      logger.debug('No threshold configured for metric', { metricName });
      return;
    }

    // Check direction
    const absChange = Math.abs(changePercent);
    const isIncrease = changePercent > 0;

    if (threshold.direction === 'increase' && !isIncrease) return;
    if (threshold.direction === 'decrease' && isIncrease) return;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' | null = null;

    if (absChange >= threshold.criticalThreshold) {
      severity = 'critical';
    } else if (absChange >= threshold.warningThreshold) {
      severity = 'high';
    } else if (absChange >= threshold.warningThreshold * 0.7) {
      severity = 'medium';
    }

    if (!severity) return;

    // Check cooldown
    const cooldownKey = `${workspaceId}:${metricName}`;
    const lastAlert = this.recentAnomalies.get(cooldownKey);
    if (lastAlert) {
      const timeSinceAlert = Date.now() - lastAlert.getTime();
      if (timeSinceAlert < this.alertCooldownMs) {
        logger.debug('Anomaly detection in cooldown', {
          workspaceId,
          metricName,
          timeSinceAlertMs: timeSinceAlert,
        });
        return;
      }
    }

    // Create anomaly record
    const anomaly = await this.createAnomaly({
      workspaceId,
      metricName,
      threshold,
      severity,
      currentValue,
      previousValue,
      changePercent,
    });

    // Update cooldown
    this.recentAnomalies.set(cooldownKey, new Date());

    // Emit anomaly event
    const anomalyData: AnomalyEventData = {
      anomalyId: anomaly.id,
      metricName: threshold.name,
      severity,
      title: anomaly.title,
      description: anomaly.description,
      currentValue,
      previousValue,
      changePercent,
    };

    emitRealtimeEvent({
      type: 'anomaly.detected',
      workspaceId,
      data: { ...anomalyData },
    });

    logger.info('Anomaly detected and emitted', {
      workspaceId,
      metricName,
      severity,
      changePercent: changePercent.toFixed(2),
    });
  }

  /**
   * Create anomaly record in database
   */
  private async createAnomaly(params: {
    workspaceId: string;
    metricName: string;
    threshold: MetricThreshold;
    severity: 'low' | 'medium' | 'high' | 'critical';
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }): Promise<{ id: string; title: string; description: string }> {
    const {
      workspaceId,
      metricName,
      threshold,
      severity,
      currentValue,
      previousValue,
      changePercent,
    } = params;

    const id = generateId();
    const direction = changePercent > 0 ? 'increased' : 'decreased';
    const title = `${threshold.name} ${direction} significantly`;
    const description = `${threshold.name} ${direction} by ${Math.abs(changePercent).toFixed(1)}% from ${formatValue(previousValue, metricName)} to ${formatValue(currentValue, metricName)}.`;

    try {
      await db.insert(anomalies).values({
        id,
        workspaceId,
        metricName,
        severity,
        title,
        description,
        currentValue: currentValue.toString(),
        previousValue: previousValue.toString(),
        changePercent: changePercent.toString(),
        detectedAt: new Date(),
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        periodEnd: new Date(),
        status: 'active',
      });

      logger.info('Anomaly saved to database', { id, workspaceId, metricName, severity });
    } catch (err) {
      logger.error('Failed to save anomaly', err as Error, { workspaceId, metricName });
    }

    return { id, title, description };
  }

  /**
   * Run one-time anomaly check for a workspace
   */
  async checkWorkspace(workspaceId: string): Promise<AnomalyEventData[]> {
    logger.info('Running anomaly check for workspace', { workspaceId });

    const metrics = await metricService.getMetrics(workspaceId);
    const cachedMetrics = metricService.getCachedMetrics(workspaceId);
    
    if (!cachedMetrics) {
      logger.debug('No cached metrics for comparison', { workspaceId });
      return [];
    }

    const detectedAnomalies: AnomalyEventData[] = [];

    // This would normally compare against historical data
    // For now, we'll return any metrics that have been flagged
    for (const [metricName, currentValue] of Object.entries(metrics)) {
      const threshold = this.thresholds[metricName];
      if (!threshold) continue;

      // In real implementation, compare against historical average
      // For demo, we'll check if values seem anomalous
    }

    return detectedAnomalies;
  }

  /**
   * Update threshold for a metric
   */
  updateThreshold(metricName: string, threshold: Partial<MetricThreshold>): void {
    const existing = this.thresholds[metricName] || {
      name: metricName,
      warningThreshold: 20,
      criticalThreshold: 40,
      direction: 'both' as const,
    };

    this.thresholds[metricName] = { ...existing, ...threshold };
    logger.info('Threshold updated', { metricName, threshold: this.thresholds[metricName] });
  }

  /**
   * Clear cooldown for testing
   */
  clearCooldowns(): void {
    this.recentAnomalies.clear();
    logger.debug('Anomaly cooldowns cleared');
  }
}

// Helper function to format values based on metric type
function formatValue(value: number, metricName: string): string {
  if (metricName.includes('revenue') || metricName === 'mrr' || metricName === 'aov') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (metricName.includes('churn') || metricName.includes('rate')) {
    return `${value.toFixed(1)}%`;
  }

  return new Intl.NumberFormat('en-US').format(value);
}

// Export singleton instance
export const realtimeAnomalyDetector = new RealtimeAnomalyDetector();

// Initialize on module load
realtimeAnomalyDetector.initialize();

