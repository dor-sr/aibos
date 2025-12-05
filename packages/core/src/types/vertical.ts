/**
 * Supported vertical types
 */
export type VerticalType = 
  | 'ecommerce'
  | 'saas'
  | 'hospitality'
  | 'restaurant'
  | 'services'
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
    supportedConnectors: ['shopify', 'tiendanube', 'woocommerce', 'stripe', 'ga4'],
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
    description: 'Hotels, rentals, and travel services',
    icon: 'bed',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'occupancy', 'adr', 'revpar', 'bookings'],
  },
  restaurant: {
    type: 'restaurant',
    name: 'Restaurant & Food',
    description: 'Restaurants, cafes, and food delivery',
    icon: 'utensils',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'orders', 'avg_ticket', 'customers'],
  },
  services: {
    type: 'services',
    name: 'Services',
    description: 'Professional and personal services',
    icon: 'briefcase',
    supportedConnectors: ['stripe', 'ga4'],
    metrics: ['revenue', 'clients', 'avg_project_value'],
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
 * V1 supported verticals
 */
export const V1_VERTICALS: VerticalType[] = ['ecommerce', 'saas', 'generic'];

/**
 * Check if a vertical is supported in V1
 */
export function isV1Vertical(vertical: VerticalType): boolean {
  return V1_VERTICALS.includes(vertical);
}



