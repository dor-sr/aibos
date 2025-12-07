import type { VerticalPack, MetricDefinition, DashboardConfig } from '../types';

/**
 * Generic metric definitions
 */
export const genericMetrics: MetricDefinition[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    description: 'Total revenue',
    type: 'currency',
    aggregation: 'sum',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Total customers',
    type: 'count',
    aggregation: 'count',
    icon: 'users',
    goodDirection: 'up',
  },
];

/**
 * Generic dashboard configuration
 */
export const genericDashboardConfig: DashboardConfig = {
  primaryMetrics: ['revenue', 'customers'],
  chartMetric: 'revenue',
};

/**
 * Complete generic vertical pack
 */
export const genericPack: VerticalPack = {
  type: 'generic',
  name: 'Generic',
  description: 'General business analytics',
  metrics: genericMetrics,
  dashboardConfig: genericDashboardConfig,
  queries: [],
  insights: [],
};







