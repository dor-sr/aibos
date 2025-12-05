/**
 * Supported vertical types
 */
export type VerticalType = 
  | 'ecommerce'
  | 'saas'
  | 'hospitality'
  | 'restaurant'
  | 'services'
  | 'agency'
  | 'generic';

/**
 * Vertical display information
 */
export interface VerticalInfo {
  type: VerticalType;
  name: string;
  description: string;
  icon: string;
  supportedConnectors: string[];
  metrics: string[];
}

/**
 * Vertical registry - display info for each vertical
 */
export const VERTICALS: Record<VerticalType, VerticalInfo> = {
  ecommerce: {
    type: 'ecommerce',
    name: 'Ecommerce',
    description: 'Online stores, retail, and product sales',
    icon: 'shopping-cart',
    supportedConnectors: ['shopify', 'tiendanube', 'mercadolibre', 'woocommerce', 'stripe', 'ga4'],
    metrics: ['revenue', 'orders', 'aov', 'conversion_rate', 'customers', 'ltv'],
  },
  saas: {
    type: 'saas',
    name: 'SaaS / Subscription',
    description: 'Software and subscription-based businesses',
    icon: 'cloud',
    supportedConnectors: ['stripe', 'ga4', 'mixpanel'],
    metrics: ['mrr', 'arr', 'churn', 'expansion', 'customers', 'arpu', 'ltv'],
  },
  hospitality: {
    type: 'hospitality',
    name: 'Hospitality & Travel',
    description: 'Hotels, vacation rentals, and travel accommodations',
    icon: 'bed',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'occupancy_rate', 'adr', 'revpar', 'bookings', 'room_nights', 'guest_satisfaction'],
  },
  restaurant: {
    type: 'restaurant',
    name: 'Restaurant & Food',
    description: 'Restaurants, cafes, bars, and food service businesses',
    icon: 'utensils',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'covers', 'avg_check', 'table_turnover', 'delivery_revenue', 'food_cost_percent'],
  },
  services: {
    type: 'services',
    name: 'Services & Consulting',
    description: 'Professional services, consulting, and freelancers',
    icon: 'briefcase',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'utilization_rate', 'effective_rate', 'project_margin', 'clients', 'billable_hours'],
  },
  agency: {
    type: 'agency',
    name: 'Agency',
    description: 'Marketing, creative, and consulting agencies with multiple clients',
    icon: 'users',
    supportedConnectors: ['stripe', 'ga4', 'meta_ads', 'google_ads'],
    metrics: ['total_revenue', 'mrr', 'active_clients', 'utilization_rate', 'client_retention_rate', 'ad_spend_managed'],
  },
  generic: {
    type: 'generic',
    name: 'Other / Generic',
    description: 'General business analytics',
    icon: 'chart-bar',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'customers'],
  },
};

/**
 * V1 supported verticals (original)
 */
export const V1_VERTICALS: VerticalType[] = ['ecommerce', 'saas', 'generic'];

/**
 * V2 supported verticals (full set)
 */
export const V2_VERTICALS: VerticalType[] = ['ecommerce', 'saas', 'hospitality', 'restaurant', 'services', 'agency', 'generic'];

/**
 * Check if a vertical is supported in V2
 */
export function isV2Vertical(vertical: VerticalType): boolean {
  return V2_VERTICALS.includes(vertical);
}

/**
 * Check if a vertical is supported in V1
 */
export function isV1Vertical(vertical: VerticalType): boolean {
  return V1_VERTICALS.includes(vertical);
}





