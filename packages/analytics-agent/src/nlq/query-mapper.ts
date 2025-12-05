import type { IntentType } from './intent';

/**
 * Query pattern types
 */
export type QueryPattern =
  | 'total_metric'
  | 'metric_over_time'
  | 'metric_comparison'
  | 'top_n'
  | 'segment_breakdown'
  | 'anomaly_analysis'
  | 'custom';

/**
 * Query parameters extracted from the question
 */
export interface QueryParams {
  pattern: QueryPattern;
  metric?: string;
  period?: string;
  comparisonPeriod?: string;
  dimension?: string;
  limit?: number;
  filters?: Record<string, string>;
}

/**
 * Map an intent to a query pattern
 */
export function mapQueryToPattern(intent: IntentType, question: string): QueryPattern {
  switch (intent) {
    case 'metric_value':
      return 'total_metric';
    case 'metric_trend':
      return 'metric_over_time';
    case 'metric_comparison':
      return 'metric_comparison';
    case 'top_performers':
      return 'top_n';
    case 'segment_analysis':
      return 'segment_breakdown';
    case 'anomaly_explanation':
      return 'anomaly_analysis';
    default:
      return 'custom';
  }
}

/**
 * Extract parameters from a question
 */
export function extractQueryParams(question: string, pattern: QueryPattern): QueryParams {
  const params: QueryParams = { pattern };

  // Extract metric
  const metricMatch = question.match(
    /\b(revenue|orders|customers|aov|mrr|arr|churn|sales|conversion)\b/i
  );
  if (metricMatch?.[1]) {
    params.metric = metricMatch[1].toLowerCase();
  }

  // Extract time period
  const periodMatch = question.match(
    /\b(today|yesterday|this week|last week|this month|last month|this quarter|last quarter|this year|last year|last (\d+) days)\b/i
  );
  if (periodMatch?.[1]) {
    params.period = periodMatch[1].toLowerCase();
  }

  // Extract dimension for breakdowns
  const dimensionMatch = question.match(
    /\bby (channel|source|product|category|region|country|customer type)\b/i
  );
  if (dimensionMatch?.[1]) {
    params.dimension = dimensionMatch[1].toLowerCase();
  }

  // Extract limit for top N queries
  const limitMatch = question.match(/\btop (\d+)\b/i);
  if (limitMatch?.[1]) {
    params.limit = parseInt(limitMatch[1], 10);
  }

  return params;
}

/**
 * Named query patterns - predefined queries that can be executed
 */
export const NAMED_QUERIES = {
  // Ecommerce queries
  totalRevenue: {
    name: 'Total Revenue',
    metric: 'revenue',
    pattern: 'total_metric' as QueryPattern,
    description: 'Sum of all order totals',
  },
  revenueOverTime: {
    name: 'Revenue Over Time',
    metric: 'revenue',
    pattern: 'metric_over_time' as QueryPattern,
    description: 'Daily revenue trend',
  },
  topProducts: {
    name: 'Top Products',
    dimension: 'product',
    pattern: 'top_n' as QueryPattern,
    description: 'Products by revenue',
  },
  customerSegments: {
    name: 'Customer Segments',
    dimension: 'customer_type',
    pattern: 'segment_breakdown' as QueryPattern,
    description: 'New vs returning customers',
  },

  // SaaS queries
  totalMRR: {
    name: 'Total MRR',
    metric: 'mrr',
    pattern: 'total_metric' as QueryPattern,
    description: 'Monthly Recurring Revenue',
  },
  mrrOverTime: {
    name: 'MRR Over Time',
    metric: 'mrr',
    pattern: 'metric_over_time' as QueryPattern,
    description: 'MRR trend over time',
  },
  churnRate: {
    name: 'Churn Rate',
    metric: 'churn',
    pattern: 'total_metric' as QueryPattern,
    description: 'Customer churn rate',
  },
};

