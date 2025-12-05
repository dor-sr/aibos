import type { VerticalType } from '@aibos/core';

/**
 * Vertical pack configuration
 */
export interface VerticalPack {
  type: VerticalType;
  name: string;
  description: string;
  metrics: MetricDefinition[];
  dashboardConfig: DashboardConfig;
  queries: QueryDefinition[];
  insights: InsightTemplate[];
}

/**
 * Metric definition
 */
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: 'currency' | 'count' | 'percent' | 'duration';
  aggregation: 'sum' | 'avg' | 'count' | 'last';
  icon?: string;
  format?: string;
  goodDirection?: 'up' | 'down' | 'neutral';
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  primaryMetrics: string[]; // Metric IDs to show in cards
  chartMetric: string; // Metric ID for main chart
  secondaryCharts?: ChartConfig[];
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie';
  metricId: string;
  title: string;
  dimension?: string;
}

/**
 * Query definition for NLQ
 */
export interface QueryDefinition {
  id: string;
  name: string;
  description: string;
  patterns: string[]; // Regex patterns to match
  parameters: QueryParameter[];
}

/**
 * Query parameter
 */
export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'enum';
  required: boolean;
  default?: string | number;
  enum?: string[];
}

/**
 * Insight template
 */
export interface InsightTemplate {
  id: string;
  type: 'highlight' | 'concern' | 'opportunity';
  title: string;
  condition: InsightCondition;
  messageTemplate: string;
}

/**
 * Insight condition
 */
export interface InsightCondition {
  metricId: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'change_gt' | 'change_lt';
  value: number;
}





