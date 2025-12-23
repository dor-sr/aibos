import type { VerticalPack, MetricDefinition, QueryDefinition, InsightTemplate, DashboardConfig } from '../types';

/**
 * Ecommerce metric definitions
 */
export const ecommerceMetrics: MetricDefinition[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    description: 'Total revenue from orders',
    type: 'currency',
    aggregation: 'sum',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'orders',
    name: 'Orders',
    description: 'Number of orders',
    type: 'count',
    aggregation: 'count',
    icon: 'shopping-cart',
    goodDirection: 'up',
  },
  {
    id: 'aov',
    name: 'Average Order Value',
    description: 'Average value per order',
    type: 'currency',
    aggregation: 'avg',
    icon: 'credit-card',
    goodDirection: 'up',
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Total unique customers',
    type: 'count',
    aggregation: 'count',
    icon: 'users',
    goodDirection: 'up',
  },
  {
    id: 'new_customers',
    name: 'New Customers',
    description: 'First-time customers',
    type: 'count',
    aggregation: 'count',
    icon: 'user-plus',
    goodDirection: 'up',
  },
  {
    id: 'returning_customers',
    name: 'Returning Customers',
    description: 'Repeat customers',
    type: 'count',
    aggregation: 'count',
    icon: 'user-check',
    goodDirection: 'up',
  },
  {
    id: 'conversion_rate',
    name: 'Conversion Rate',
    description: 'Visitors who made a purchase',
    type: 'percent',
    aggregation: 'avg',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'items_per_order',
    name: 'Items per Order',
    description: 'Average items in each order',
    type: 'count',
    aggregation: 'avg',
    icon: 'package',
    goodDirection: 'up',
  },
];

/**
 * Ecommerce dashboard configuration
 */
export const ecommerceDashboardConfig: DashboardConfig = {
  primaryMetrics: ['revenue', 'orders', 'aov', 'customers'],
  chartMetric: 'revenue',
  secondaryCharts: [
    {
      type: 'bar',
      metricId: 'revenue',
      title: 'Revenue by Channel',
      dimension: 'channel',
    },
    {
      type: 'pie',
      metricId: 'customers',
      title: 'New vs Returning',
      dimension: 'customer_type',
    },
  ],
};

/**
 * Ecommerce query definitions
 */
export const ecommerceQueries: QueryDefinition[] = [
  {
    id: 'total_revenue',
    name: 'Total Revenue',
    description: 'Get total revenue for a period',
    patterns: [
      'what (is|was) (my|our|the) revenue',
      'how much revenue',
      'total (revenue|sales)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
  {
    id: 'top_products',
    name: 'Top Products',
    description: 'Get best performing products',
    patterns: [
      'top (selling|performing) products',
      'best (selling|performing) products',
      'which products (are|were) (selling|performing) best',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
      { name: 'limit', type: 'number', required: false, default: 5 },
      { name: 'metric', type: 'enum', required: false, default: 'revenue', enum: ['revenue', 'quantity', 'orders'] },
    ],
  },
  {
    id: 'customer_segments',
    name: 'Customer Segments',
    description: 'Breakdown of new vs returning customers',
    patterns: [
      'new vs returning customers',
      'customer (breakdown|segments)',
      'how (are|were) (new|returning) customers (doing|performing)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
];

/**
 * Ecommerce insight templates
 */
export const ecommerceInsights: InsightTemplate[] = [
  {
    id: 'revenue_spike',
    type: 'highlight',
    title: 'Revenue spike detected',
    condition: { metricId: 'revenue', operator: 'change_gt', value: 20 },
    messageTemplate: 'Revenue increased by {{change}}% compared to the previous period.',
  },
  {
    id: 'revenue_drop',
    type: 'concern',
    title: 'Revenue decline detected',
    condition: { metricId: 'revenue', operator: 'change_lt', value: -15 },
    messageTemplate: 'Revenue decreased by {{change}}% compared to the previous period.',
  },
  {
    id: 'aov_improvement',
    type: 'highlight',
    title: 'AOV improving',
    condition: { metricId: 'aov', operator: 'change_gt', value: 10 },
    messageTemplate: 'Average order value increased by {{change}}%, indicating stronger purchasing behavior.',
  },
  {
    id: 'new_customer_growth',
    type: 'opportunity',
    title: 'New customer acquisition up',
    condition: { metricId: 'new_customers', operator: 'change_gt', value: 15 },
    messageTemplate: 'New customer acquisition increased by {{change}}%. Consider retention campaigns.',
  },
];

/**
 * Complete ecommerce vertical pack
 */
export const ecommercePack: VerticalPack = {
  type: 'ecommerce',
  name: 'Ecommerce',
  description: 'Online stores, retail, and product sales',
  metrics: ecommerceMetrics,
  dashboardConfig: ecommerceDashboardConfig,
  queries: ecommerceQueries,
  insights: ecommerceInsights,
};









