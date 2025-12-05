import type { VerticalPack, MetricDefinition, QueryDefinition, InsightTemplate, DashboardConfig } from '../types';

/**
 * Agency metric definitions
 * For marketing agencies, creative agencies, and similar multi-client businesses
 */
export const agencyMetrics: MetricDefinition[] = [
  {
    id: 'total_revenue',
    name: 'Total Revenue',
    description: 'Total revenue across all clients',
    type: 'currency',
    aggregation: 'sum',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'mrr',
    name: 'Monthly Retainer Revenue',
    description: 'Recurring revenue from retainer clients',
    type: 'currency',
    aggregation: 'last',
    icon: 'repeat',
    goodDirection: 'up',
  },
  {
    id: 'project_revenue',
    name: 'Project Revenue',
    description: 'Revenue from one-time projects',
    type: 'currency',
    aggregation: 'sum',
    icon: 'briefcase',
    goodDirection: 'up',
  },
  {
    id: 'active_clients',
    name: 'Active Clients',
    description: 'Number of active client accounts',
    type: 'count',
    aggregation: 'count',
    icon: 'users',
    goodDirection: 'up',
  },
  {
    id: 'avg_client_value',
    name: 'Average Client Value',
    description: 'Average revenue per client',
    type: 'currency',
    aggregation: 'avg',
    icon: 'user',
    goodDirection: 'up',
  },
  {
    id: 'client_retention_rate',
    name: 'Client Retention Rate',
    description: 'Percentage of clients retained',
    type: 'percent',
    aggregation: 'avg',
    icon: 'user-check',
    goodDirection: 'up',
  },
  {
    id: 'client_churn_rate',
    name: 'Client Churn Rate',
    description: 'Percentage of clients lost',
    type: 'percent',
    aggregation: 'avg',
    icon: 'user-x',
    goodDirection: 'down',
  },
  {
    id: 'new_clients',
    name: 'New Clients',
    description: 'Number of new clients acquired',
    type: 'count',
    aggregation: 'count',
    icon: 'user-plus',
    goodDirection: 'up',
  },
  {
    id: 'client_lifetime_value',
    name: 'Client Lifetime Value',
    description: 'Average total revenue per client relationship',
    type: 'currency',
    aggregation: 'avg',
    icon: 'star',
    goodDirection: 'up',
  },
  {
    id: 'utilization_rate',
    name: 'Team Utilization',
    description: 'Percentage of billable hours vs available hours',
    type: 'percent',
    aggregation: 'avg',
    icon: 'clock',
    goodDirection: 'up',
  },
  {
    id: 'billable_hours',
    name: 'Billable Hours',
    description: 'Total hours billed to clients',
    type: 'count',
    aggregation: 'sum',
    icon: 'timer',
    goodDirection: 'up',
  },
  {
    id: 'effective_rate',
    name: 'Effective Hourly Rate',
    description: 'Revenue divided by hours spent',
    type: 'currency',
    aggregation: 'avg',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'active_projects',
    name: 'Active Projects',
    description: 'Number of ongoing projects',
    type: 'count',
    aggregation: 'count',
    icon: 'folder',
    goodDirection: 'neutral',
  },
  {
    id: 'projects_completed',
    name: 'Projects Completed',
    description: 'Number of projects delivered',
    type: 'count',
    aggregation: 'count',
    icon: 'check-circle',
    goodDirection: 'up',
  },
  {
    id: 'avg_project_value',
    name: 'Average Project Value',
    description: 'Average revenue per project',
    type: 'currency',
    aggregation: 'avg',
    icon: 'package',
    goodDirection: 'up',
  },
  {
    id: 'on_time_delivery_rate',
    name: 'On-Time Delivery Rate',
    description: 'Percentage of projects delivered on schedule',
    type: 'percent',
    aggregation: 'avg',
    icon: 'calendar-check',
    goodDirection: 'up',
  },
  {
    id: 'profit_margin',
    name: 'Profit Margin',
    description: 'Net profit as percentage of revenue',
    type: 'percent',
    aggregation: 'avg',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'ad_spend_managed',
    name: 'Ad Spend Managed',
    description: 'Total advertising budget managed',
    type: 'currency',
    aggregation: 'sum',
    icon: 'megaphone',
    goodDirection: 'up',
  },
  {
    id: 'client_nps',
    name: 'Client NPS',
    description: 'Net Promoter Score from clients',
    type: 'count',
    aggregation: 'avg',
    icon: 'heart',
    format: '0',
    goodDirection: 'up',
  },
];

/**
 * Agency dashboard configuration
 */
export const agencyDashboardConfig: DashboardConfig = {
  primaryMetrics: ['total_revenue', 'active_clients', 'mrr', 'utilization_rate'],
  chartMetric: 'total_revenue',
  secondaryCharts: [
    {
      type: 'pie',
      metricId: 'revenue',
      title: 'Revenue by Client',
      dimension: 'client',
    },
    {
      type: 'bar',
      metricId: 'revenue',
      title: 'Revenue by Service Type',
      dimension: 'service_type',
    },
    {
      type: 'line',
      metricId: 'active_clients',
      title: 'Client Growth',
    },
    {
      type: 'bar',
      metricId: 'utilization_rate',
      title: 'Team Utilization',
      dimension: 'team_member',
    },
  ],
};

/**
 * Agency query definitions
 */
export const agencyQueries: QueryDefinition[] = [
  {
    id: 'client_performance',
    name: 'Client Performance',
    description: 'Get performance metrics for a specific client',
    patterns: [
      'how (is|was) (client|account) .+ (doing|performing)',
      'client .+ (performance|metrics|revenue)',
      'show me .+ (account|client)',
    ],
    parameters: [
      { name: 'client_id', type: 'string', required: false },
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'revenue_breakdown',
    name: 'Revenue Breakdown',
    description: 'Break down revenue by client or service',
    patterns: [
      'revenue (breakdown|by client|by service)',
      'where (is|does) (my|our) revenue come from',
      '(top|best) (clients|accounts)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
      { name: 'breakdown', type: 'enum', required: false, enum: ['client', 'service', 'team'] },
    ],
  },
  {
    id: 'retainer_analysis',
    name: 'Retainer Analysis',
    description: 'Analyze recurring retainer revenue',
    patterns: [
      '(retainer|mrr) (analysis|breakdown)',
      'recurring revenue',
      'how much (in|from) retainers',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'utilization_analysis',
    name: 'Utilization Analysis',
    description: 'Analyze team utilization',
    patterns: [
      '(team|staff) utilization',
      'how (busy|utilized) (is|are) (the team|we)',
      'billable hours',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
      { name: 'team_member', type: 'string', required: false },
    ],
  },
  {
    id: 'client_health',
    name: 'Client Health',
    description: 'Review at-risk or healthy clients',
    patterns: [
      '(at-risk|healthy) clients',
      'client health',
      'which clients (are|might) (leave|churn)',
    ],
    parameters: [],
  },
  {
    id: 'pipeline_analysis',
    name: 'Pipeline Analysis',
    description: 'Analyze sales pipeline and proposals',
    patterns: [
      '(sales|proposal) pipeline',
      'pending (proposals|deals)',
      'new business pipeline',
    ],
    parameters: [],
  },
  {
    id: 'profitability_analysis',
    name: 'Profitability Analysis',
    description: 'Analyze profitability by client or project',
    patterns: [
      'profitability (analysis|by client|by project)',
      'which (clients|projects) are most profitable',
      'margin analysis',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_quarter' },
    ],
  },
  {
    id: 'cross_client_report',
    name: 'Cross-Client Report',
    description: 'Generate report across multiple clients',
    patterns: [
      'cross-client (report|analysis)',
      'compare (all|multiple) clients',
      'portfolio (overview|report)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
      { name: 'metric', type: 'enum', required: false, enum: ['revenue', 'roas', 'growth'] },
    ],
  },
];

/**
 * Agency insight templates
 */
export const agencyInsights: InsightTemplate[] = [
  {
    id: 'revenue_growth',
    type: 'highlight',
    title: 'Revenue growing',
    condition: { metricId: 'total_revenue', operator: 'change_gt', value: 15 },
    messageTemplate: 'Agency revenue increased by {{change}}% this period.',
  },
  {
    id: 'revenue_decline',
    type: 'concern',
    title: 'Revenue declining',
    condition: { metricId: 'total_revenue', operator: 'change_lt', value: -10 },
    messageTemplate: 'Agency revenue decreased by {{change}}%. Review client status and new business.',
  },
  {
    id: 'high_utilization',
    type: 'highlight',
    title: 'Team fully utilized',
    condition: { metricId: 'utilization_rate', operator: 'gt', value: 85 },
    messageTemplate: 'Team utilization at {{value}}% - consider hiring or raising rates.',
  },
  {
    id: 'low_utilization',
    type: 'concern',
    title: 'Team underutilized',
    condition: { metricId: 'utilization_rate', operator: 'lt', value: 60 },
    messageTemplate: 'Team utilization at {{value}}% - need more client work.',
  },
  {
    id: 'client_churn_high',
    type: 'concern',
    title: 'Client churn elevated',
    condition: { metricId: 'client_churn_rate', operator: 'gt', value: 15 },
    messageTemplate: 'Client churn at {{value}}% is concerning. Review client satisfaction.',
  },
  {
    id: 'new_client_growth',
    type: 'highlight',
    title: 'Strong new business',
    condition: { metricId: 'new_clients', operator: 'change_gt', value: 50 },
    messageTemplate: 'New client acquisition increased by {{change}}%. Sales efforts paying off.',
  },
  {
    id: 'mrr_growth',
    type: 'highlight',
    title: 'Retainer revenue growing',
    condition: { metricId: 'mrr', operator: 'change_gt', value: 10 },
    messageTemplate: 'Monthly retainer revenue increased by {{change}}%. More predictable revenue.',
  },
  {
    id: 'avg_client_value_up',
    type: 'highlight',
    title: 'Client value increasing',
    condition: { metricId: 'avg_client_value', operator: 'change_gt', value: 20 },
    messageTemplate: 'Average client value increased by {{change}}%. Upselling or better targeting.',
  },
];

/**
 * Complete agency vertical pack
 */
export const agencyPack: VerticalPack = {
  type: 'agency',
  name: 'Agency',
  description: 'Marketing agencies, creative agencies, and consultancies with multiple clients',
  metrics: agencyMetrics,
  dashboardConfig: agencyDashboardConfig,
  queries: agencyQueries,
  insights: agencyInsights,
};
