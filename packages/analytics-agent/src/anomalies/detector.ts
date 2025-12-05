import { createLogger } from '@aibos/core';
import type { VerticalType } from '@aibos/core';

const logger = createLogger('analytics:anomalies');

export interface AnomalyConfig {
  workspaceId: string;
  verticalType: VerticalType;
  thresholds?: MetricThresholds;
}

export interface MetricThresholds {
  [metric: string]: number; // Percentage change threshold
}

export interface Anomaly {
  id: string;
  workspaceId: string;
  metricName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  explanation?: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  detectedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

// Default thresholds by vertical
const DEFAULT_THRESHOLDS: Record<string, MetricThresholds> = {
  ecommerce: {
    revenue: 20,
    orders: 25,
    aov: 15,
    customers: 20,
    conversion: 30,
  },
  saas: {
    mrr: 10,
    subscribers: 15,
    churn: 10,
    newMrr: 30,
  },
};

/**
 * Detect anomalies in metrics
 */
export async function detectAnomalies(config: AnomalyConfig): Promise<Anomaly[]> {
  logger.info('Detecting anomalies', { workspaceId: config.workspaceId });

  const thresholds =
    config.thresholds ?? DEFAULT_THRESHOLDS[config.verticalType] ?? DEFAULT_THRESHOLDS.ecommerce!;

  const anomalies: Anomaly[] = [];

  // TODO: Implement actual anomaly detection from database
  // For now, return demo anomalies if certain conditions would trigger them

  // Check each metric
  for (const [metric, threshold] of Object.entries(thresholds!)) {
    const { current, previous } = await getMetricValues(
      config.workspaceId,
      metric,
      config.verticalType
    );

    if (previous === 0) continue;

    const changePercent = ((current - previous) / previous) * 100;

    if (Math.abs(changePercent) >= threshold) {
      const anomaly = createAnomaly({
        workspaceId: config.workspaceId,
        metricName: metric,
        currentValue: current,
        previousValue: previous,
        changePercent,
        threshold,
      });

      anomalies.push(anomaly);
    }
  }

  logger.info('Anomaly detection complete', {
    workspaceId: config.workspaceId,
    anomalyCount: anomalies.length,
  });

  return anomalies;
}

/**
 * Get metric values for comparison (placeholder)
 */
async function getMetricValues(
  workspaceId: string,
  metric: string,
  verticalType: VerticalType
): Promise<{ current: number; previous: number }> {
  // TODO: Implement actual metric fetching from database

  // Demo values - no anomalies by default
  const demoValues: Record<string, { current: number; previous: number }> = {
    revenue: { current: 24500, previous: 21778 }, // 12.5% - below threshold
    orders: { current: 356, previous: 329 }, // 8.2% - below threshold
    mrr: { current: 45200, previous: 41658 }, // 8.5% - below threshold
  };

  return demoValues[metric] || { current: 100, previous: 100 };
}

/**
 * Create an anomaly object
 */
function createAnomaly(params: {
  workspaceId: string;
  metricName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  threshold: number;
}): Anomaly {
  const { workspaceId, metricName, currentValue, previousValue, changePercent, threshold } = params;

  const direction = changePercent > 0 ? 'increased' : 'decreased';
  const severity = determineSeverity(Math.abs(changePercent), threshold);

  return {
    id: `anomaly_${Date.now()}_${metricName}`,
    workspaceId,
    metricName,
    severity,
    title: `${formatMetricName(metricName)} ${direction} significantly`,
    description: `${formatMetricName(metricName)} ${direction} by ${Math.abs(changePercent).toFixed(1)}% compared to the previous period.`,
    currentValue,
    previousValue,
    changePercent,
    detectedAt: new Date(),
    periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    periodEnd: new Date(),
  };
}

/**
 * Determine severity based on change percentage
 */
function determineSeverity(
  absChange: number,
  threshold: number
): 'low' | 'medium' | 'high' | 'critical' {
  const ratio = absChange / threshold;

  if (ratio >= 3) return 'critical';
  if (ratio >= 2) return 'high';
  if (ratio >= 1.5) return 'medium';
  return 'low';
}

/**
 * Format metric name for display
 */
function formatMetricName(name: string): string {
  const displayNames: Record<string, string> = {
    revenue: 'Revenue',
    orders: 'Orders',
    aov: 'Average Order Value',
    customers: 'Customers',
    conversion: 'Conversion Rate',
    mrr: 'MRR',
    subscribers: 'Subscribers',
    churn: 'Churn Rate',
    newMrr: 'New MRR',
  };

  return displayNames[name] || name;
}

/**
 * Generate an explanation for an anomaly using AI
 */
export async function explainAnomaly(anomaly: Anomaly): Promise<string> {
  // TODO: Implement AI-powered explanation generation

  const direction = anomaly.changePercent > 0 ? 'increase' : 'decrease';

  return `The ${Math.abs(anomaly.changePercent).toFixed(1)}% ${direction} in ${anomaly.metricName} could be due to several factors. Further investigation is recommended to identify the root cause.`;
}

