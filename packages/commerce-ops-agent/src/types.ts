import type { VerticalType } from '@aibos/core';

/**
 * Commerce Operations Agent configuration
 */
export interface CommerceOpsAgentConfig {
  workspaceId: string;
  verticalType: VerticalType;
  connectedPlatforms: CommercePlatform[];
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
 * Product inventory status
 */
export interface InventoryStatus {
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
  daysOfStock: number;
  reorderPoint: number;
  status: 'healthy' | 'low' | 'out_of_stock' | 'overstock';
  platforms: {
    platform: CommercePlatform;
    stock: number;
  }[];
}

/**
 * Stock alert
 */
export interface StockAlert {
  id: string;
  productId: string;
  sku: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedAction: string;
  createdAt: Date;
}

/**
 * Pricing suggestion
 */
export interface PricingSuggestion {
  id: string;
  productId: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  expectedImpact: string;
  platform?: CommercePlatform;
}

/**
 * Promotion recommendation
 */
export interface PromotionRecommendation {
  id: string;
  type: 'discount' | 'bundle' | 'flash_sale' | 'clearance';
  products: string[];
  suggestedDiscount: number;
  reason: string;
  timing: string;
  platform?: CommercePlatform;
}


