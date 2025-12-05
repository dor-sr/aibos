import type { VerticalType } from '@aibos/core';

/**
 * Commerce Operations Agent configuration
 */
export interface CommerceOpsAgentConfig {
  workspaceId: string;
  verticalType: VerticalType;
  connectedPlatforms: CommercePlatform[];
  currency?: string;
  timezone?: string;
}

/**
 * Supported commerce platforms
 */
export type CommercePlatform = 
  | 'shopify'
  | 'tiendanube'
  | 'woocommerce'
  | 'mercadolibre'
  | 'rappi'
  | 'pedidosya';

/**
 * Stock status types
 */
export type StockStatus = 'healthy' | 'low' | 'critical' | 'out_of_stock' | 'overstock';

/**
 * Product inventory status
 */
export interface InventoryStatus {
  productId: string;
  sku: string | null;
  name: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  daysOfStock: number | null;
  reorderPoint: number | null;
  safetyStock: number;
  status: StockStatus;
  averageDailySales: number | null;
  locations: {
    locationId: string;
    locationName: string;
    quantity: number;
    status: StockStatus;
  }[];
}

/**
 * Inventory summary
 */
export interface InventorySummary {
  totalProducts: number;
  totalStockValue: number;
  healthyProducts: number;
  lowStockProducts: number;
  criticalProducts: number;
  outOfStockProducts: number;
  overstockProducts: number;
  totalLocations: number;
  activeAlerts: number;
  currency: string;
}

/**
 * Stock alert
 */
export interface StockAlert {
  id: string;
  productId: string;
  sku: string | null;
  productName: string;
  locationId: string | null;
  locationName: string | null;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'reorder_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  suggestedAction: string;
  currentStock: number;
  threshold: number | null;
  isResolved: boolean;
  createdAt: Date;
}

/**
 * Demand forecast
 */
export interface DemandForecast {
  productId: string;
  sku: string | null;
  productName: string;
  currentStock: number;
  forecastPeriodDays: number;
  expectedDemand: number;
  forecastedStockoutDate: Date | null;
  daysUntilStockout: number | null;
  recommendedReorderDate: Date | null;
  recommendedReorderQuantity: number | null;
  confidence: 'high' | 'medium' | 'low';
  historicalAvgDailySales: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Reorder recommendation
 */
export interface ReorderRecommendation {
  id: string;
  productId: string;
  sku: string | null;
  productName: string;
  supplierId: string | null;
  supplierName: string | null;
  currentStock: number;
  reorderPoint: number;
  recommendedQuantity: number;
  estimatedCost: number | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reason: string;
  expectedDeliveryDays: number | null;
}

/**
 * Price analysis
 */
export interface PriceAnalysis {
  productId: string;
  sku: string | null;
  productName: string;
  currentPrice: number;
  cost: number | null;
  margin: number | null;
  marginPercent: number | null;
  priceHistory: {
    date: Date;
    price: number;
  }[];
  salesAtCurrentPrice: number;
  revenueAtCurrentPrice: number;
  currency: string;
}

/**
 * Pricing suggestion
 */
export interface PricingSuggestion {
  id: string;
  productId: string;
  sku: string | null;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  priceChangePercent: number;
  reason: string;
  expectedImpact: string;
  estimatedRevenueChange: number | null;
  confidence: 'high' | 'medium' | 'low';
  platform?: CommercePlatform;
}

/**
 * Margin analysis
 */
export interface MarginAnalysis {
  totalProducts: number;
  averageMargin: number;
  averageMarginPercent: number;
  productsWithMargin: number;
  productsWithoutCost: number;
  highMarginProducts: number;
  lowMarginProducts: number;
  negativeMarginProducts: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  currency: string;
}

/**
 * Product margin detail
 */
export interface ProductMargin {
  productId: string;
  sku: string | null;
  productName: string;
  price: number;
  cost: number | null;
  margin: number | null;
  marginPercent: number | null;
  unitsSold: number;
  revenue: number;
  profit: number | null;
  category: 'high' | 'medium' | 'low' | 'negative' | 'unknown';
}

/**
 * Multi-channel inventory view
 */
export interface MultiChannelInventory {
  productId: string;
  sku: string | null;
  productName: string;
  totalStock: number;
  channels: {
    platform: CommercePlatform;
    locationId: string;
    locationName: string;
    stock: number;
    status: StockStatus;
    allocatedPercent: number;
  }[];
  recommendedAllocation: {
    platform: CommercePlatform;
    recommendedStock: number;
    reason: string;
  }[] | null;
}

/**
 * Inventory allocation recommendation
 */
export interface AllocationRecommendation {
  productId: string;
  sku: string | null;
  productName: string;
  sourcePlatform: CommercePlatform;
  targetPlatform: CommercePlatform;
  currentSourceStock: number;
  currentTargetStock: number;
  recommendedTransfer: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Commerce operations metrics
 */
export interface CommerceOpsMetrics {
  inventory: InventorySummary;
  stockValue: number;
  turnoverRate: number | null;
  avgDaysOfStock: number | null;
  stockoutRate: number;
  overstockRate: number;
  pendingPurchaseOrders: number;
  pendingPurchaseOrdersValue: number;
  currency: string;
}

/**
 * NLQ request for commerce operations
 */
export interface CommerceOpsNLQRequest {
  question: string;
  workspaceId: string;
  context?: {
    productId?: string;
    locationId?: string;
    platform?: CommercePlatform;
  };
}

/**
 * NLQ response
 */
export interface CommerceOpsNLQResponse {
  answer: string;
  intent: CommerceOpsIntent;
  data?: unknown;
  suggestedQuestions?: string[];
}

/**
 * Commerce ops intents
 */
export type CommerceOpsIntent =
  | 'inventory_status'
  | 'stock_alerts'
  | 'demand_forecast'
  | 'reorder_recommendations'
  | 'pricing_analysis'
  | 'margin_analysis'
  | 'multi_channel_inventory'
  | 'supplier_performance'
  | 'purchase_orders'
  | 'general_commerce'
  | 'unknown';

/**
 * Supplier performance
 */
export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  onTimeDeliveryRate: number;
  averageLeadTime: number;
  totalSpent: number;
  outstandingOrders: number;
  outstandingValue: number;
  rating: number | null;
  lastOrderDate: Date | null;
  currency: string;
}
