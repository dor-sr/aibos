import type { VerticalPack, MetricDefinition, QueryDefinition, InsightTemplate, DashboardConfig } from '../types';

/**
 * Services/Consulting metric definitions
 * For professional services, consulting firms, freelancers, and service businesses
 */
export const servicesMetrics: MetricDefinition[] = [
  {
    id: 'revenue',
    name: 'Total Revenue',
    description: 'Total revenue from all services',
    type: 'currency',
    aggregation: 'sum',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'billable_revenue',
    name: 'Billable Revenue',
    description: 'Revenue from billable hours',
    type: 'currency',
    aggregation: 'sum',
    icon: 'clock',
    goodDirection: 'up',
  },
  {
    id: 'project_revenue',
    name: 'Project Revenue',
    description: 'Revenue from fixed-price projects',
    type: 'currency',
    aggregation: 'sum',
    icon: 'briefcase',
    goodDirection: 'up',
  },
  {
    id: 'clients',
    name: 'Active Clients',
    description: 'Number of active clients',
    type: 'count',
    aggregation: 'count',
    icon: 'users',
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
    id: 'utilization_rate',
    name: 'Utilization Rate',
    description: 'Percentage of available hours that are billable',
    type: 'percent',
    aggregation: 'avg',
    icon: 'percent',
    goodDirection: 'up',
  },
  {
    id: 'billable_rate',
    name: 'Billable Rate',
    description: 'Standard hourly rate charged',
    type: 'currency',
    aggregation: 'avg',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'effective_rate',
    name: 'Effective Rate',
    description: 'Actual revenue per hour worked (including non-billable)',
    type: 'currency',
    aggregation: 'avg',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'revenue_per_hour',
    name: 'Revenue per Hour',
    description: 'Revenue divided by total hours',
    type: 'currency',
    aggregation: 'avg',
    icon: 'clock',
    goodDirection: 'up',
  },
  {
    id: 'projects_active',
    name: 'Active Projects',
    description: 'Number of ongoing projects',
    type: 'count',
    aggregation: 'count',
    icon: 'folder-open',
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
    id: 'project_margin',
    name: 'Project Margin',
    description: 'Average profit margin per project',
    type: 'percent',
    aggregation: 'avg',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'gross_margin',
    name: 'Gross Margin',
    description: 'Revenue minus direct costs',
    type: 'percent',
    aggregation: 'avg',
    icon: 'pie-chart',
    goodDirection: 'up',
  },
  {
    id: 'client_retention_rate',
    name: 'Client Retention',
    description: 'Percentage of clients retained year-over-year',
    type: 'percent',
    aggregation: 'avg',
    icon: 'user-check',
    goodDirection: 'up',
  },
  {
    id: 'avg_engagement_length',
    name: 'Avg Engagement Length',
    description: 'Average duration of client engagements',
    type: 'duration',
    aggregation: 'avg',
    format: 'months',
    icon: 'calendar',
    goodDirection: 'up',
  },
  {
    id: 'revenue_per_client',
    name: 'Revenue per Client',
    description: 'Average revenue per client',
    type: 'currency',
    aggregation: 'avg',
    icon: 'user',
    goodDirection: 'up',
  },
  {
    id: 'pipeline_value',
    name: 'Pipeline Value',
    description: 'Total value of proposals and opportunities',
    type: 'currency',
    aggregation: 'sum',
    icon: 'filter',
    goodDirection: 'up',
  },
  {
    id: 'win_rate',
    name: 'Win Rate',
    description: 'Percentage of proposals won',
    type: 'percent',
    aggregation: 'avg',
    icon: 'trophy',
    goodDirection: 'up',
  },
  {
    id: 'avg_project_duration',
    name: 'Avg Project Duration',
    description: 'Average time to complete projects',
    type: 'duration',
    aggregation: 'avg',
    format: 'days',
    icon: 'clock',
    goodDirection: 'neutral',
  },
  {
    id: 'on_time_rate',
    name: 'On-Time Delivery',
    description: 'Percentage of projects delivered on schedule',
    type: 'percent',
    aggregation: 'avg',
    icon: 'calendar-check',
    goodDirection: 'up',
  },
  {
    id: 'on_budget_rate',
    name: 'On-Budget Rate',
    description: 'Percentage of projects delivered within budget',
    type: 'percent',
    aggregation: 'avg',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
];

/**
 * Services dashboard configuration
 */
export const servicesDashboardConfig: DashboardConfig = {
  primaryMetrics: ['revenue', 'utilization_rate', 'effective_rate', 'project_margin'],
  chartMetric: 'revenue',
  secondaryCharts: [
    {
      type: 'line',
      metricId: 'utilization_rate',
      title: 'Utilization Trend',
    },
    {
      type: 'bar',
      metricId: 'revenue',
      title: 'Revenue by Service Type',
      dimension: 'service_type',
    },
    {
      type: 'pie',
      metricId: 'billable_hours',
      title: 'Hours by Project',
      dimension: 'project',
    },
    {
      type: 'bar',
      metricId: 'project_margin',
      title: 'Project Profitability',
      dimension: 'project',
    },
  ],
};

/**
 * Services query definitions
 */
export const servicesQueries: QueryDefinition[] = [
  {
    id: 'utilization',
    name: 'Utilization Analysis',
    description: 'Get utilization rate and breakdown',
    patterns: [
      'what (is|was) (my|our|the) utilization',
      'how (busy|utilized) (am I|are we|is the team)',
      'utilization (rate|analysis)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
      { name: 'team_member', type: 'string', required: false },
    ],
  },
  {
    id: 'hourly_analysis',
    name: 'Hourly Rate Analysis',
    description: 'Analyze effective hourly rate',
    patterns: [
      'what (is|was) (my|our) (hourly|effective) rate',
      'revenue per hour',
      'how much (am I|are we) making per hour',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'project_profitability',
    name: 'Project Profitability',
    description: 'Analyze profitability by project',
    patterns: [
      'project (profitability|margins)',
      'which projects are (most|least) profitable',
      '(best|worst) performing projects',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_quarter' },
    ],
  },
  {
    id: 'client_revenue',
    name: 'Client Revenue',
    description: 'Revenue breakdown by client',
    patterns: [
      'revenue by client',
      '(top|best) clients',
      'client (breakdown|analysis)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_year' },
      { name: 'limit', type: 'number', required: false, default: 10 },
    ],
  },
  {
    id: 'time_tracking',
    name: 'Time Tracking Summary',
    description: 'Summary of time spent',
    patterns: [
      'time (tracking|spent)',
      'where (did|do) (I|we) spend (my|our) time',
      'hours (breakdown|by project|by client)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_week' },
    ],
  },
  {
    id: 'pipeline_status',
    name: 'Pipeline Status',
    description: 'View sales pipeline and proposals',
    patterns: [
      '(sales|proposal) pipeline',
      'pending (proposals|opportunities)',
      'new business outlook',
    ],
    parameters: [],
  },
  {
    id: 'service_breakdown',
    name: 'Service Breakdown',
    description: 'Revenue by service type',
    patterns: [
      'revenue by service',
      'service (breakdown|mix)',
      'which services (are|were) (most|best) (profitable|popular)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_quarter' },
    ],
  },
  {
    id: 'forecast',
    name: 'Revenue Forecast',
    description: 'Project future revenue',
    patterns: [
      '(revenue|income) forecast',
      '(projected|expected) revenue',
      'how much (will|can) (I|we) (make|earn)',
    ],
    parameters: [
      { name: 'months_ahead', type: 'number', required: false, default: 3 },
    ],
  },
];

/**
 * Services insight templates
 */
export const servicesInsights: InsightTemplate[] = [
  {
    id: 'revenue_growth',
    type: 'highlight',
    title: 'Revenue growing',
    condition: { metricId: 'revenue', operator: 'change_gt', value: 15 },
    messageTemplate: 'Revenue increased by {{change}}% compared to the previous period.',
  },
  {
    id: 'revenue_decline',
    type: 'concern',
    title: 'Revenue declining',
    condition: { metricId: 'revenue', operator: 'change_lt', value: -10 },
    messageTemplate: 'Revenue decreased by {{change}}%. Review pipeline and client retention.',
  },
  {
    id: 'high_utilization',
    type: 'highlight',
    title: 'Strong utilization',
    condition: { metricId: 'utilization_rate', operator: 'gt', value: 80 },
    messageTemplate: 'Utilization at {{value}}% is excellent. Consider raising rates.',
  },
  {
    id: 'low_utilization',
    type: 'concern',
    title: 'Low utilization',
    condition: { metricId: 'utilization_rate', operator: 'lt', value: 50 },
    messageTemplate: 'Utilization at {{value}}% is below target. Need more billable work.',
  },
  {
    id: 'margin_improvement',
    type: 'highlight',
    title: 'Margins improving',
    condition: { metricId: 'project_margin', operator: 'change_gt', value: 10 },
    messageTemplate: 'Project margins increased by {{change}}%. Efficiency is improving.',
  },
  {
    id: 'margin_decline',
    type: 'concern',
    title: 'Margins declining',
    condition: { metricId: 'project_margin', operator: 'change_lt', value: -10 },
    messageTemplate: 'Project margins decreased by {{change}}%. Review pricing and scope.',
  },
  {
    id: 'effective_rate_up',
    type: 'highlight',
    title: 'Effective rate increasing',
    condition: { metricId: 'effective_rate', operator: 'change_gt', value: 15 },
    messageTemplate: 'Effective rate increased by {{change}}%. Better efficiency or pricing.',
  },
  {
    id: 'win_rate_high',
    type: 'highlight',
    title: 'Strong win rate',
    condition: { metricId: 'win_rate', operator: 'gt', value: 60 },
    messageTemplate: 'Win rate of {{value}}% is excellent. Consider raising prices.',
  },
  {
    id: 'win_rate_low',
    type: 'concern',
    title: 'Low win rate',
    condition: { metricId: 'win_rate', operator: 'lt', value: 30 },
    messageTemplate: 'Win rate of {{value}}% is concerning. Review proposal quality and targeting.',
  },
  {
    id: 'on_time_excellent',
    type: 'highlight',
    title: 'Excellent delivery record',
    condition: { metricId: 'on_time_rate', operator: 'gt', value: 90 },
    messageTemplate: 'On-time delivery rate of {{value}}% builds client trust.',
  },
];

/**
 * Complete services vertical pack
 */
export const servicesPack: VerticalPack = {
  type: 'services',
  name: 'Services & Consulting',
  description: 'Professional services, consulting, freelancers, and service-based businesses',
  metrics: servicesMetrics,
  dashboardConfig: servicesDashboardConfig,
  queries: servicesQueries,
  insights: servicesInsights,
};
