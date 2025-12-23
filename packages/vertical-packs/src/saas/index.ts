import type { VerticalPack, MetricDefinition, QueryDefinition, InsightTemplate, DashboardConfig } from '../types';

/**
 * SaaS metric definitions
 */
export const saasMetrics: MetricDefinition[] = [
  {
    id: 'mrr',
    name: 'MRR',
    description: 'Monthly Recurring Revenue',
    type: 'currency',
    aggregation: 'last',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'arr',
    name: 'ARR',
    description: 'Annual Recurring Revenue',
    type: 'currency',
    aggregation: 'last',
    icon: 'calendar',
    goodDirection: 'up',
  },
  {
    id: 'subscribers',
    name: 'Active Subscribers',
    description: 'Number of paying subscribers',
    type: 'count',
    aggregation: 'last',
    icon: 'users',
    goodDirection: 'up',
  },
  {
    id: 'new_mrr',
    name: 'New MRR',
    description: 'MRR from new subscriptions',
    type: 'currency',
    aggregation: 'sum',
    icon: 'plus-circle',
    goodDirection: 'up',
  },
  {
    id: 'expansion_mrr',
    name: 'Expansion MRR',
    description: 'MRR from upgrades',
    type: 'currency',
    aggregation: 'sum',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'contraction_mrr',
    name: 'Contraction MRR',
    description: 'MRR lost to downgrades',
    type: 'currency',
    aggregation: 'sum',
    icon: 'trending-down',
    goodDirection: 'down',
  },
  {
    id: 'churn_mrr',
    name: 'Churned MRR',
    description: 'MRR lost to cancellations',
    type: 'currency',
    aggregation: 'sum',
    icon: 'x-circle',
    goodDirection: 'down',
  },
  {
    id: 'churn_rate',
    name: 'Churn Rate',
    description: 'Monthly customer churn rate',
    type: 'percent',
    aggregation: 'avg',
    icon: 'percent',
    goodDirection: 'down',
  },
  {
    id: 'arpu',
    name: 'ARPU',
    description: 'Average Revenue Per User',
    type: 'currency',
    aggregation: 'avg',
    icon: 'user',
    goodDirection: 'up',
  },
  {
    id: 'ltv',
    name: 'LTV',
    description: 'Customer Lifetime Value',
    type: 'currency',
    aggregation: 'avg',
    icon: 'star',
    goodDirection: 'up',
  },
];

/**
 * SaaS dashboard configuration
 */
export const saasDashboardConfig: DashboardConfig = {
  primaryMetrics: ['mrr', 'subscribers', 'churn_rate', 'new_mrr'],
  chartMetric: 'mrr',
  secondaryCharts: [
    {
      type: 'bar',
      metricId: 'mrr_movements',
      title: 'MRR Movements',
      dimension: 'movement_type',
    },
    {
      type: 'pie',
      metricId: 'subscribers',
      title: 'Subscribers by Plan',
      dimension: 'plan',
    },
  ],
};

/**
 * SaaS query definitions
 */
export const saasQueries: QueryDefinition[] = [
  {
    id: 'current_mrr',
    name: 'Current MRR',
    description: 'Get current Monthly Recurring Revenue',
    patterns: [
      'what (is|was) (my|our|the) mrr',
      'how much mrr',
      'monthly recurring revenue',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'mrr_growth',
    name: 'MRR Growth',
    description: 'Get MRR growth and movements',
    patterns: [
      'how (did|has) mrr (change|grow)',
      'mrr (growth|trend)',
      'net mrr change',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
  {
    id: 'churn_analysis',
    name: 'Churn Analysis',
    description: 'Analyze customer churn',
    patterns: [
      'what (is|was) (my|our|the) churn',
      'churn rate',
      'how many customers churned',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
  {
    id: 'plan_breakdown',
    name: 'Plan Breakdown',
    description: 'Get breakdown of customers by plan',
    patterns: [
      'customers by plan',
      'plan (distribution|breakdown)',
      'which plans are most popular',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
];

/**
 * SaaS insight templates
 */
export const saasInsights: InsightTemplate[] = [
  {
    id: 'mrr_growth',
    type: 'highlight',
    title: 'Strong MRR growth',
    condition: { metricId: 'mrr', operator: 'change_gt', value: 10 },
    messageTemplate: 'MRR grew by {{change}}% this period, indicating healthy growth.',
  },
  {
    id: 'mrr_decline',
    type: 'concern',
    title: 'MRR declining',
    condition: { metricId: 'mrr', operator: 'change_lt', value: -5 },
    messageTemplate: 'MRR decreased by {{change}}%. Review churn and expansion metrics.',
  },
  {
    id: 'high_churn',
    type: 'concern',
    title: 'Elevated churn rate',
    condition: { metricId: 'churn_rate', operator: 'gt', value: 5 },
    messageTemplate: 'Churn rate of {{value}}% is above healthy levels. Consider retention initiatives.',
  },
  {
    id: 'low_churn',
    type: 'highlight',
    title: 'Excellent retention',
    condition: { metricId: 'churn_rate', operator: 'lt', value: 2 },
    messageTemplate: 'Churn rate of {{value}}% indicates excellent customer retention.',
  },
  {
    id: 'expansion_strong',
    type: 'opportunity',
    title: 'Strong expansion revenue',
    condition: { metricId: 'expansion_mrr', operator: 'change_gt', value: 20 },
    messageTemplate: 'Expansion MRR increased by {{change}}%. Customers are upgrading.',
  },
];

/**
 * Complete SaaS vertical pack
 */
export const saasPack: VerticalPack = {
  type: 'saas',
  name: 'SaaS / Subscription',
  description: 'Software and subscription-based businesses',
  metrics: saasMetrics,
  dashboardConfig: saasDashboardConfig,
  queries: saasQueries,
  insights: saasInsights,
};









