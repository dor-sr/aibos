import type { VerticalPack, MetricDefinition, QueryDefinition, InsightTemplate, DashboardConfig } from '../types';

/**
 * Hospitality metric definitions
 * Based on standard hotel/rental industry KPIs
 */
export const hospitalityMetrics: MetricDefinition[] = [
  {
    id: 'revenue',
    name: 'Total Revenue',
    description: 'Total revenue from all bookings',
    type: 'currency',
    aggregation: 'sum',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'room_revenue',
    name: 'Room Revenue',
    description: 'Revenue from room/unit rentals',
    type: 'currency',
    aggregation: 'sum',
    icon: 'bed',
    goodDirection: 'up',
  },
  {
    id: 'occupancy_rate',
    name: 'Occupancy Rate',
    description: 'Percentage of available rooms occupied',
    type: 'percent',
    aggregation: 'avg',
    icon: 'percent',
    goodDirection: 'up',
  },
  {
    id: 'adr',
    name: 'ADR',
    description: 'Average Daily Rate per occupied room',
    type: 'currency',
    aggregation: 'avg',
    icon: 'trending-up',
    goodDirection: 'up',
  },
  {
    id: 'revpar',
    name: 'RevPAR',
    description: 'Revenue Per Available Room',
    type: 'currency',
    aggregation: 'avg',
    icon: 'chart-bar',
    goodDirection: 'up',
  },
  {
    id: 'goppar',
    name: 'GOPPAR',
    description: 'Gross Operating Profit Per Available Room',
    type: 'currency',
    aggregation: 'avg',
    icon: 'dollar-sign',
    goodDirection: 'up',
  },
  {
    id: 'bookings',
    name: 'Total Bookings',
    description: 'Number of confirmed bookings',
    type: 'count',
    aggregation: 'count',
    icon: 'calendar',
    goodDirection: 'up',
  },
  {
    id: 'room_nights',
    name: 'Room Nights',
    description: 'Total nights booked across all rooms',
    type: 'count',
    aggregation: 'sum',
    icon: 'moon',
    goodDirection: 'up',
  },
  {
    id: 'avg_length_stay',
    name: 'Average Length of Stay',
    description: 'Average nights per booking',
    type: 'count',
    aggregation: 'avg',
    icon: 'clock',
    goodDirection: 'neutral',
  },
  {
    id: 'avg_lead_time',
    name: 'Average Lead Time',
    description: 'Average days between booking and check-in',
    type: 'count',
    aggregation: 'avg',
    icon: 'calendar-clock',
    goodDirection: 'neutral',
  },
  {
    id: 'cancellation_rate',
    name: 'Cancellation Rate',
    description: 'Percentage of bookings cancelled',
    type: 'percent',
    aggregation: 'avg',
    icon: 'x-circle',
    goodDirection: 'down',
  },
  {
    id: 'direct_booking_rate',
    name: 'Direct Booking Rate',
    description: 'Percentage of bookings made directly (not via OTA)',
    type: 'percent',
    aggregation: 'avg',
    icon: 'link',
    goodDirection: 'up',
  },
  {
    id: 'repeat_guest_rate',
    name: 'Repeat Guest Rate',
    description: 'Percentage of returning guests',
    type: 'percent',
    aggregation: 'avg',
    icon: 'user-check',
    goodDirection: 'up',
  },
  {
    id: 'guest_satisfaction',
    name: 'Guest Satisfaction',
    description: 'Average review score',
    type: 'count',
    aggregation: 'avg',
    icon: 'star',
    format: '0.0/5',
    goodDirection: 'up',
  },
  {
    id: 'ancillary_revenue',
    name: 'Ancillary Revenue',
    description: 'Revenue from extras (spa, restaurant, services)',
    type: 'currency',
    aggregation: 'sum',
    icon: 'plus-circle',
    goodDirection: 'up',
  },
];

/**
 * Hospitality dashboard configuration
 */
export const hospitalityDashboardConfig: DashboardConfig = {
  primaryMetrics: ['revpar', 'occupancy_rate', 'adr', 'bookings'],
  chartMetric: 'revenue',
  secondaryCharts: [
    {
      type: 'line',
      metricId: 'occupancy_rate',
      title: 'Occupancy Trend',
    },
    {
      type: 'bar',
      metricId: 'revenue',
      title: 'Revenue by Booking Source',
      dimension: 'booking_source',
    },
    {
      type: 'pie',
      metricId: 'bookings',
      title: 'Room Type Distribution',
      dimension: 'room_type',
    },
    {
      type: 'bar',
      metricId: 'adr',
      title: 'ADR by Day of Week',
      dimension: 'day_of_week',
    },
  ],
};

/**
 * Hospitality query definitions
 */
export const hospitalityQueries: QueryDefinition[] = [
  {
    id: 'occupancy',
    name: 'Occupancy Rate',
    description: 'Get occupancy rate for a period',
    patterns: [
      'what (is|was) (my|our|the) occupancy',
      'how (full|occupied) (is|was|were) (we|the hotel|the property)',
      'occupancy rate',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'revpar',
    name: 'RevPAR Analysis',
    description: 'Get RevPAR and related metrics',
    patterns: [
      'what (is|was) (my|our|the) revpar',
      'revenue per available room',
      'how (is|was) revpar (doing|performing)',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
    ],
  },
  {
    id: 'adr_analysis',
    name: 'ADR Analysis',
    description: 'Get Average Daily Rate breakdown',
    patterns: [
      'what (is|was) (my|our|the) (adr|average daily rate)',
      'average (room|nightly) rate',
      'how much (are we|am I) charging per night',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'this_month' },
      { name: 'breakdown', type: 'enum', required: false, enum: ['room_type', 'source', 'day_of_week'] },
    ],
  },
  {
    id: 'booking_sources',
    name: 'Booking Source Analysis',
    description: 'Analyze bookings by source/channel',
    patterns: [
      'where (do|did) (my|our) bookings come from',
      'booking (source|channel) (breakdown|analysis)',
      '(direct|ota) bookings',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
  {
    id: 'seasonal_analysis',
    name: 'Seasonal Analysis',
    description: 'Compare performance across seasons',
    patterns: [
      'seasonal (performance|analysis)',
      'compare (seasons|months)',
      '(high|low|peak|off) season (performance|analysis)',
    ],
    parameters: [
      { name: 'year', type: 'number', required: false },
    ],
  },
  {
    id: 'cancellation_analysis',
    name: 'Cancellation Analysis',
    description: 'Analyze booking cancellations',
    patterns: [
      'cancellation (rate|analysis)',
      'how many (bookings|reservations) (were|got) cancelled',
      'why (are|did) (guests|people) cancel',
    ],
    parameters: [
      { name: 'period', type: 'string', required: false, default: 'last_30_days' },
    ],
  },
  {
    id: 'forecast',
    name: 'Occupancy Forecast',
    description: 'Forecast upcoming occupancy',
    patterns: [
      '(forecast|predict) (occupancy|bookings)',
      'what (is|will be) (the|my) occupancy (next|upcoming)',
      'future bookings',
    ],
    parameters: [
      { name: 'days_ahead', type: 'number', required: false, default: 30 },
    ],
  },
];

/**
 * Hospitality insight templates
 */
export const hospitalityInsights: InsightTemplate[] = [
  {
    id: 'revpar_spike',
    type: 'highlight',
    title: 'RevPAR increase detected',
    condition: { metricId: 'revpar', operator: 'change_gt', value: 15 },
    messageTemplate: 'RevPAR increased by {{change}}%, indicating strong pricing power or improved occupancy.',
  },
  {
    id: 'revpar_decline',
    type: 'concern',
    title: 'RevPAR declining',
    condition: { metricId: 'revpar', operator: 'change_lt', value: -10 },
    messageTemplate: 'RevPAR decreased by {{change}}%. Review pricing strategy and occupancy drivers.',
  },
  {
    id: 'high_occupancy',
    type: 'highlight',
    title: 'High occupancy achieved',
    condition: { metricId: 'occupancy_rate', operator: 'gt', value: 85 },
    messageTemplate: 'Occupancy rate of {{value}}% is excellent. Consider increasing rates.',
  },
  {
    id: 'low_occupancy',
    type: 'concern',
    title: 'Low occupancy alert',
    condition: { metricId: 'occupancy_rate', operator: 'lt', value: 50 },
    messageTemplate: 'Occupancy rate of {{value}}% is below target. Consider promotional pricing.',
  },
  {
    id: 'adr_improvement',
    type: 'highlight',
    title: 'ADR improving',
    condition: { metricId: 'adr', operator: 'change_gt', value: 10 },
    messageTemplate: 'Average Daily Rate increased by {{change}}%, indicating successful pricing.',
  },
  {
    id: 'high_cancellation',
    type: 'concern',
    title: 'High cancellation rate',
    condition: { metricId: 'cancellation_rate', operator: 'gt', value: 20 },
    messageTemplate: 'Cancellation rate of {{value}}% is concerning. Review booking policies.',
  },
  {
    id: 'direct_booking_growth',
    type: 'opportunity',
    title: 'Direct bookings increasing',
    condition: { metricId: 'direct_booking_rate', operator: 'change_gt', value: 10 },
    messageTemplate: 'Direct bookings increased by {{change}}%. Continue investing in direct channels.',
  },
  {
    id: 'repeat_guest_growth',
    type: 'highlight',
    title: 'Loyal guests increasing',
    condition: { metricId: 'repeat_guest_rate', operator: 'change_gt', value: 15 },
    messageTemplate: 'Repeat guest rate increased by {{change}}%. Your loyalty efforts are working.',
  },
];

/**
 * Complete hospitality vertical pack
 */
export const hospitalityPack: VerticalPack = {
  type: 'hospitality',
  name: 'Hospitality & Travel',
  description: 'Hotels, vacation rentals, and travel accommodations',
  metrics: hospitalityMetrics,
  dashboardConfig: hospitalityDashboardConfig,
  queries: hospitalityQueries,
  insights: hospitalityInsights,
};
