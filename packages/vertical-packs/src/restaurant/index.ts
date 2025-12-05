import type { VerticalPack, MetricDefinition, QueryDefinition, InsightTemplate, DashboardConfig } from '../types';

/**
 * Restaurant metric definitions
 * Based on standard restaurant industry KPIs
 */
export const restaurantMetrics: MetricDefinition[] = [
  {
    id: 'revenue',
    name: 'Total Revenue',
    description: 'Total revenue from all sales',
    type: 'currency',
    aggregation: 'sum',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'covers',
    name: 'Covers',
    description: 'Number of guests served',
    type: 'count',
    aggregation: 'sum',
    icon: 'users',
    goodDirection: 'up',
  },
  {
    id: 'orders',
    name: 'Total Orders',
    description: 'Number of orders/transactions',
    type: 'count',
    aggregation: 'count',
    icon: 'shopping-bag',
    goodDirection: 'up',
  },
  {
    id: 'avg_check',
    name: 'Average Check',
    description: 'Average revenue per order',
    type: 'currency',
    aggregation: 'avg',
    icon: 'receipt',
    goodDirection: 'up',
  },
  {
    id: 'revenue_per_cover',
    name: 'Revenue per Cover',
    description: 'Average spend per guest',
    type: 'currency',
    aggregation: 'avg',
    icon: 'user',
    goodDirection: 'up',
  },
  {
    id: 'table_turnover',
    name: 'Table Turnover',
    description: 'Average seatings per table per day',
    type: 'count',
    aggregation: 'avg',
    format: '0.0x',
    icon: 'rotate-ccw',
    goodDirection: 'up',
  },
  {
    id: 'revpash',
    name: 'RevPASH',
    description: 'Revenue Per Available Seat Hour',
    type: 'currency',
    aggregation: 'avg',
    icon: 'clock',
    goodDirection: 'up',
  },
  {
    id: 'food_cost_percent',
    name: 'Food Cost %',
    description: 'Food cost as percentage of revenue',
    type: 'percent',
    aggregation: 'avg',
    icon: 'pie-chart',
    goodDirection: 'down',
  },
  {
    id: 'labor_cost_percent',
    name: 'Labor Cost %',
    description: 'Labor cost as percentage of revenue',
    type: 'percent',
    aggregation: 'avg',
    icon: 'users',
    goodDirection: 'down',
  },
  {
    id: 'prime_cost',
    name: 'Prime Cost',
    description: 'Food + Labor costs combined',
    type: 'currency',
    aggregation: 'sum',
    icon: 'trending-down',
    goodDirection: 'down',
  },
  {
    id: 'delivery_revenue',
    name: 'Delivery Revenue',
    description: 'Revenue from delivery orders',
    type: 'currency',
    aggregation: 'sum',
    icon: 'truck',
    goodDirection: 'up',
  },
  {
    id: 'delivery_orders',
    name: 'Delivery Orders',
    description: 'Number of delivery orders',
    type: 'count',
    aggregation: 'count',
    icon: 'package',
    goodDirection: 'up',
  },
  {
    id: 'dine_in_revenue',
    name: 'Dine-in Revenue',
    description: 'Revenue from dine-in guests',
    type: 'currency',
    aggregation: 'sum',
    icon: 'utensils',
    goodDirection: 'up',
  },
  {
    id: 'takeout_revenue',
    name: 'Takeout Revenue',
    description: 'Revenue from takeout orders',
    type: 'currency',
    aggregation: 'sum',
    icon: 'shopping-bag',
    goodDirection: 'up',
  },
  {
    id: 'delivery_mix',
    name: 'Delivery Mix',
    description: 'Percentage of revenue from delivery',
    type: 'percent',
    aggregation: 'avg',
    icon: 'pie-chart',
    goodDirection: 'neutral',
  },
  {
    id: 'avg_order_time',
    name: 'Avg Order Time',
    description: 'Average time from order to delivery/pickup',
    type: 'duration',
    aggregation: 'avg',
    icon: 'timer',
    format: 'mm:ss',
    goodDirection: 'down',
  },
  {
    id: 'customer_satisfaction',
    name: 'Customer Rating',
    description: 'Average customer rating',
    type: 'count',
    aggregation: 'avg',
    icon: 'star',
    format: '0.0/5',
    goodDirection: 'up',
  },
  {
    id: 'repeat_customer_rate',
    name: 'Repeat Customer Rate',
    description: 'Percentage of returning customers',
    type: 'percent',
    aggregation: 'avg',
    icon: 'user-check',
    goodDirection: 'up',
  },
];

/**
 * Restaurant dashboard configuration
 */
export const restaurantDashboardConfig: DashboardConfig = {
  primaryMetrics: ['revenue', 'covers', 'avg_check', 'table_turnover'],
  chartMetric: 'revenue',
  secondaryCharts: [
    {
      type: 'line',
      metricId: 'revenue',
      title: 'Revenue by Hour',
      dimension: 'hour',
    },
    {
      type: 'pie',
      metricId: 'revenue',
      title: 'Revenue by Channel',
      dimension: 'order_type',
    },
    {
      type: 'bar',
      metricId: 'revenue',
      title: 'Revenue by Day of Week',
      dimension: 'day_of_week',
    },
    {
      type: 'bar',
      metricId: 'orders',
      title: 'Top Selling Items',
      dimension: 'menu_item',
    },
  ],
};

/**
 * Restaurant query definitions
 */
export const restaurantQueries: QueryDefinition[] = [
  {
    id: 'daily_performance',
    name: 'Daily Performance',
    description: 'Get daily revenue and covers',
    patterns: [
      'how (did|was) (today|yesterday) (go|do)',
      '(daily|today) (performance|sales|revenue)',
      'how many covers (today|yesterday)',
    ],
    parameters: [
      { name: 'date', type: 'date', required: false },
    ],
  },
  {
    id: 'covers_analysis',
    name: 'Covers Analysis',
    description: 'Analyze guest counts',
    patterns: [
      'how many (covers|guests|customers)',
      'covers (breakdown|analysis)',
      'guest counts',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_week' },
    ],
  },
  {
    id: 'avg_check_analysis',
    name: 'Average Check Analysis',
    description: 'Analyze average check size',
    patterns: [
      'what (is|was) (my|our|the) average check',
      'average (order|ticket|check) (size|amount)',
      'how much (are|do) (guests|customers) spending',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_week' },
    ],
  },
  {
    id: 'menu_performance',
    name: 'Menu Performance',
    description: 'Analyze menu item performance',
    patterns: [
      'top (selling|performing) (items|dishes|menu items)',
      'best (sellers|performing items)',
      'menu (performance|analysis)',
      'what (is|are) (selling|performing) (best|well)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
      { name: 'limit', type: 'number', required: false, default: 10 },
    ],
  },
  {
    id: 'delivery_analysis',
    name: 'Delivery Analysis',
    description: 'Analyze delivery channel performance',
    patterns: [
      'delivery (performance|analysis)',
      'how (is|was) delivery (doing|performing)',
      '(rappi|ubereats|doordash|ifood) (performance|orders)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
  {
    id: 'peak_hours',
    name: 'Peak Hours Analysis',
    description: 'Identify peak and slow periods',
    patterns: [
      'peak (hours|times|periods)',
      'when (is|are) (we|the restaurant) busiest',
      'slow (hours|times|periods)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_7_days' },
    ],
  },
  {
    id: 'food_cost_analysis',
    name: 'Food Cost Analysis',
    description: 'Analyze food cost percentage',
    patterns: [
      'food cost (percentage|analysis)',
      'what (is|was) (my|our) food cost',
      'cost of goods',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'daypart_analysis',
    name: 'Daypart Analysis',
    description: 'Compare breakfast, lunch, dinner performance',
    patterns: [
      'daypart (analysis|breakdown)',
      '(breakfast|lunch|dinner) (performance|sales)',
      'compare (meal|day) parts',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_7_days' },
    ],
  },
];

/**
 * Restaurant insight templates
 */
export const restaurantInsights: InsightTemplate[] = [
  {
    id: 'revenue_spike',
    type: 'highlight',
    title: 'Strong revenue day',
    condition: { metricId: 'revenue', operator: 'change_gt', value: 20 },
    messageTemplate: 'Revenue increased by {{change}}% compared to the previous period.',
  },
  {
    id: 'revenue_decline',
    type: 'concern',
    title: 'Revenue below target',
    condition: { metricId: 'revenue', operator: 'change_lt', value: -15 },
    messageTemplate: 'Revenue decreased by {{change}}%. Review traffic and check averages.',
  },
  {
    id: 'avg_check_up',
    type: 'highlight',
    title: 'Average check improving',
    condition: { metricId: 'avg_check', operator: 'change_gt', value: 10 },
    messageTemplate: 'Average check increased by {{change}}%. Upselling efforts are working.',
  },
  {
    id: 'avg_check_down',
    type: 'concern',
    title: 'Average check declining',
    condition: { metricId: 'avg_check', operator: 'change_lt', value: -10 },
    messageTemplate: 'Average check decreased by {{change}}%. Review menu pricing and upselling.',
  },
  {
    id: 'high_food_cost',
    type: 'concern',
    title: 'Food cost above target',
    condition: { metricId: 'food_cost_percent', operator: 'gt', value: 35 },
    messageTemplate: 'Food cost at {{value}}% is above the target range. Review portions and waste.',
  },
  {
    id: 'low_table_turnover',
    type: 'opportunity',
    title: 'Table turnover opportunity',
    condition: { metricId: 'table_turnover', operator: 'lt', value: 2 },
    messageTemplate: 'Table turnover of {{value}}x is below optimal. Consider improving service speed.',
  },
  {
    id: 'delivery_growth',
    type: 'highlight',
    title: 'Delivery channel growing',
    condition: { metricId: 'delivery_revenue', operator: 'change_gt', value: 25 },
    messageTemplate: 'Delivery revenue increased by {{change}}%. Strong off-premise growth.',
  },
  {
    id: 'repeat_customers_up',
    type: 'highlight',
    title: 'Customer loyalty improving',
    condition: { metricId: 'repeat_customer_rate', operator: 'change_gt', value: 10 },
    messageTemplate: 'Repeat customer rate increased by {{change}}%. Guests are returning.',
  },
];

/**
 * Complete restaurant vertical pack
 */
export const restaurantPack: VerticalPack = {
  type: 'restaurant',
  name: 'Restaurant & Food',
  description: 'Restaurants, cafes, bars, and food service businesses',
  metrics: restaurantMetrics,
  dashboardConfig: restaurantDashboardConfig,
  queries: restaurantQueries,
  insights: restaurantInsights,
};
