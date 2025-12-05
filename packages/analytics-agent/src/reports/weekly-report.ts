import { createLogger } from '@aibos/core';
import type { VerticalType, DateRange } from '@aibos/core';
import { getDateRangeForPeriod, getPreviousPeriod } from '@aibos/core';

const logger = createLogger('analytics:reports');

export interface WeeklyReportData {
  workspaceId: string;
  verticalType: VerticalType;
  periodStart: Date;
  periodEnd: Date;
  metrics: ReportMetrics;
  insights: ReportInsight[];
  summary: string;
}

export interface ReportMetrics {
  [key: string]: {
    current: number;
    previous: number;
    change: number;
  };
}

export interface ReportInsight {
  type: 'highlight' | 'concern' | 'opportunity';
  title: string;
  description: string;
  metric?: string;
  priority: number;
}

/**
 * Generate a weekly report
 */
export async function generateWeeklyReport(
  workspaceId: string,
  verticalType: VerticalType
): Promise<WeeklyReportData> {
  logger.info('Generating weekly report', { workspaceId, verticalType });

  // Get date ranges
  const currentPeriod = getDateRangeForPeriod('last_7_days');
  const previousPeriod = getPreviousPeriod(currentPeriod);

  // Calculate metrics based on vertical
  const metrics =
    verticalType === 'ecommerce'
      ? await calculateEcommerceReportMetrics(workspaceId, currentPeriod, previousPeriod)
      : await calculateSaasReportMetrics(workspaceId, currentPeriod, previousPeriod);

  // Generate insights
  const insights = generateInsights(metrics, verticalType);

  // Generate summary
  const summary = generateSummary(metrics, insights, verticalType);

  return {
    workspaceId,
    verticalType,
    periodStart: currentPeriod.start,
    periodEnd: currentPeriod.end,
    metrics,
    insights,
    summary,
  };
}

/**
 * Calculate ecommerce metrics for report
 */
async function calculateEcommerceReportMetrics(
  workspaceId: string,
  current: DateRange,
  previous: DateRange
): Promise<ReportMetrics> {
  // TODO: Implement actual metric calculations from database

  // Demo data for now
  return {
    revenue: { current: 24500, previous: 21778, change: 12.5 },
    orders: { current: 356, previous: 329, change: 8.2 },
    aov: { current: 68.82, previous: 66.11, change: 4.1 },
    customers: { current: 2340, previous: 2280, change: 2.6 },
    newCustomers: { current: 180, previous: 165, change: 9.1 },
    returningCustomers: { current: 120, previous: 108, change: 11.1 },
  };
}

/**
 * Calculate SaaS metrics for report
 */
async function calculateSaasReportMetrics(
  workspaceId: string,
  current: DateRange,
  previous: DateRange
): Promise<ReportMetrics> {
  // TODO: Implement actual metric calculations from database

  // Demo data for now
  return {
    mrr: { current: 45200, previous: 41658, change: 8.5 },
    activeSubscribers: { current: 234, previous: 222, change: 5.4 },
    newMrr: { current: 4200, previous: 3800, change: 10.5 },
    churnMrr: { current: 890, previous: 1200, change: -25.8 },
    churnRate: { current: 2.3, previous: 3.1, change: -25.8 },
  };
}

/**
 * Generate insights from metrics
 */
function generateInsights(metrics: ReportMetrics, verticalType: VerticalType): ReportInsight[] {
  const insights: ReportInsight[] = [];

  for (const [metricName, metricData] of Object.entries(metrics)) {
    const change = metricData.change;

    // Highlight significant positive changes
    if (change > 10) {
      insights.push({
        type: 'highlight',
        title: `${formatMetricName(metricName)} increased significantly`,
        description: `${formatMetricName(metricName)} grew by ${change.toFixed(1)}% compared to last week.`,
        metric: metricName,
        priority: change > 20 ? 1 : 2,
      });
    }

    // Flag concerning negative changes
    if (change < -10) {
      insights.push({
        type: 'concern',
        title: `${formatMetricName(metricName)} declined`,
        description: `${formatMetricName(metricName)} dropped by ${Math.abs(change).toFixed(1)}% compared to last week.`,
        metric: metricName,
        priority: change < -20 ? 1 : 2,
      });
    }
  }

  // Sort by priority
  return insights.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate a summary of the report
 */
function generateSummary(
  metrics: ReportMetrics,
  insights: ReportInsight[],
  verticalType: VerticalType
): string {
  const primaryMetric = verticalType === 'saas' ? 'mrr' : 'revenue';
  const primary = metrics[primaryMetric];

  if (!primary) {
    return 'Weekly performance summary is being generated.';
  }

  const direction = primary.change > 0 ? 'up' : primary.change < 0 ? 'down' : 'unchanged';
  const highlights = insights.filter((i) => i.type === 'highlight').length;
  const concerns = insights.filter((i) => i.type === 'concern').length;

  let summary = `This week, ${formatMetricName(primaryMetric)} was ${direction} ${Math.abs(primary.change).toFixed(1)}% compared to last week. `;

  if (highlights > 0 && concerns === 0) {
    summary += `Overall a strong week with ${highlights} positive highlights.`;
  } else if (concerns > 0 && highlights === 0) {
    summary += `There are ${concerns} areas that need attention.`;
  } else if (highlights > 0 && concerns > 0) {
    summary += `Mixed results with ${highlights} highlights and ${concerns} areas to watch.`;
  } else {
    summary += 'Performance was relatively stable.';
  }

  return summary;
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






