import { createLogger } from '@aibos/core';
import type { 
  CommerceOpsAgentConfig, 
  InventoryStatus, 
  InventorySummary,
  StockAlert,
  DemandForecast,
  ReorderRecommendation,
  PriceAnalysis,
  MarginAnalysis,
  ProductMargin,
  PricingSuggestion,
  MultiChannelInventory,
  AllocationRecommendation,
  CommerceOpsMetrics,
  SupplierPerformance,
  CommerceOpsNLQResponse,
} from './types';

// Import modules
import {
  getInventoryStatus,
  getInventorySummary,
  getStockAlerts,
  createStockAlert,
  resolveStockAlert,
  recordStockMovement,
  checkInventoryAlerts,
  getDemandForecast,
  getReorderRecommendations,
  getStockoutRiskProducts,
} from './inventory';

import {
  getPriceAnalysis,
  getMarginAnalysis,
  getProductMargins,
  recordPriceChange,
  getPricingSuggestions,
} from './pricing';

import {
  getMultiChannelInventory,
  getChannelPerformance,
  getAllocationRecommendations,
  getUnifiedCatalog,
} from './channels';

import {
  getCommerceOpsMetrics,
  getSupplierPerformance,
  getInventoryHealthScore,
} from './metrics';

import { handleCommerceOpsNLQ } from './nlq';

const logger = createLogger('commerce-ops-agent');

/**
 * Commerce Operations Agent
 * 
 * Full implementation for ecommerce operations:
 * - Inventory management and forecasting
 * - Stock alerts and reorder suggestions
 * - Pricing optimization
 * - Multi-channel coordination
 * - Supplier management
 */
export class CommerceOpsAgent {
  private config: CommerceOpsAgentConfig;

  constructor(config: CommerceOpsAgentConfig) {
    this.config = config;
    logger.info('Commerce Ops Agent initialized', {
      workspaceId: config.workspaceId,
      platforms: config.connectedPlatforms,
    });
  }

  // ============ Inventory Methods ============

  /**
   * Get inventory status for all products
   */
  async getInventoryStatus(): Promise<InventoryStatus[]> {
    return getInventoryStatus(this.config.workspaceId);
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(): Promise<InventorySummary> {
    return getInventorySummary(this.config.workspaceId, this.config.currency);
  }

  /**
   * Get active stock alerts
   */
  async getStockAlerts(includeResolved: boolean = false): Promise<StockAlert[]> {
    return getStockAlerts(this.config.workspaceId, includeResolved);
  }

  /**
   * Resolve a stock alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    return resolveStockAlert(alertId, resolvedBy);
  }

  /**
   * Record a stock movement
   */
  async recordStockMovement(
    productId: string,
    locationId: string,
    type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return',
    quantity: number,
    options?: {
      reason?: string;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      createdBy?: string;
    }
  ): Promise<boolean> {
    return recordStockMovement(this.config.workspaceId, productId, locationId, type, quantity, options);
  }

  /**
   * Check inventory and generate alerts
   */
  async checkInventoryAlerts(): Promise<StockAlert[]> {
    return checkInventoryAlerts(this.config.workspaceId);
  }

  // ============ Forecasting Methods ============

  /**
   * Get demand forecast
   */
  async getDemandForecast(forecastDays: number = 30, productIds?: string[]): Promise<DemandForecast[]> {
    return getDemandForecast(this.config.workspaceId, forecastDays, productIds);
  }

  /**
   * Get reorder recommendations
   */
  async getReorderRecommendations(): Promise<ReorderRecommendation[]> {
    return getReorderRecommendations(this.config.workspaceId);
  }

  /**
   * Get products at risk of stockout
   */
  async getStockoutRiskProducts(daysThreshold: number = 14): Promise<DemandForecast[]> {
    return getStockoutRiskProducts(this.config.workspaceId, daysThreshold);
  }

  // ============ Pricing Methods ============

  /**
   * Get price analysis for products
   */
  async getPriceAnalysis(productIds?: string[]): Promise<PriceAnalysis[]> {
    return getPriceAnalysis(this.config.workspaceId, productIds);
  }

  /**
   * Get margin analysis
   */
  async getMarginAnalysis(): Promise<MarginAnalysis> {
    return getMarginAnalysis(this.config.workspaceId, this.config.currency);
  }

  /**
   * Get product margins
   */
  async getProductMargins(sortBy: 'margin' | 'marginPercent' | 'profit' = 'marginPercent'): Promise<ProductMargin[]> {
    return getProductMargins(this.config.workspaceId, sortBy);
  }

  /**
   * Record a price change
   */
  async recordPriceChange(
    productId: string,
    newPrice: number,
    options?: {
      cost?: number;
      compareAtPrice?: number;
      platform?: string;
      changeReason?: string;
    }
  ): Promise<boolean> {
    return recordPriceChange(this.config.workspaceId, productId, newPrice, {
      ...options,
      currency: this.config.currency,
    });
  }

  /**
   * Get pricing suggestions
   */
  async getPricingSuggestions(): Promise<PricingSuggestion[]> {
    return getPricingSuggestions(this.config.workspaceId);
  }

  // ============ Multi-Channel Methods ============

  /**
   * Get multi-channel inventory view
   */
  async getMultiChannelInventory(productIds?: string[]): Promise<MultiChannelInventory[]> {
    return getMultiChannelInventory(this.config.workspaceId, productIds);
  }

  /**
   * Get channel performance
   */
  async getChannelPerformance(days: number = 30) {
    return getChannelPerformance(this.config.workspaceId, days);
  }

  /**
   * Get allocation recommendations
   */
  async getAllocationRecommendations(): Promise<AllocationRecommendation[]> {
    return getAllocationRecommendations(this.config.workspaceId);
  }

  /**
   * Get unified product catalog
   */
  async getUnifiedCatalog() {
    return getUnifiedCatalog(this.config.workspaceId);
  }

  // ============ Metrics Methods ============

  /**
   * Get commerce ops metrics
   */
  async getMetrics(): Promise<CommerceOpsMetrics> {
    return getCommerceOpsMetrics(this.config.workspaceId, this.config.currency);
  }

  /**
   * Get supplier performance
   */
  async getSupplierPerformance(): Promise<SupplierPerformance[]> {
    return getSupplierPerformance(this.config.workspaceId, this.config.currency);
  }

  /**
   * Get inventory health score
   */
  async getHealthScore(): Promise<number> {
    return getInventoryHealthScore(this.config.workspaceId);
  }

  // ============ NLQ Methods ============

  /**
   * Ask a commerce operations question
   */
  async ask(question: string): Promise<CommerceOpsNLQResponse> {
    return handleCommerceOpsNLQ({
      question,
      workspaceId: this.config.workspaceId,
    });
  }
}

/**
 * Create a Commerce Operations Agent instance
 */
export function createCommerceOpsAgent(config: CommerceOpsAgentConfig): CommerceOpsAgent {
  return new CommerceOpsAgent(config);
}
