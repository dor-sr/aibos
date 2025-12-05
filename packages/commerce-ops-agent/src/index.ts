/**
 * Commerce Operations Agent Package
 * 
 * Full implementation of the AI-powered Commerce Operations Agent
 * 
 * Features:
 * - Inventory management and tracking
 * - Demand forecasting and stockout prediction
 * - Reorder recommendations
 * - Pricing analysis and suggestions
 * - Multi-channel inventory coordination
 * - Supplier performance tracking
 * - Natural language queries for operations
 */

// Main exports
export * from './types';
export { CommerceOpsAgent, createCommerceOpsAgent } from './agent';

// Inventory exports
export {
  getInventoryStatus,
  getInventorySummary,
  getStockAlerts,
  createStockAlert,
  resolveStockAlert,
  recordStockMovement,
  checkInventoryAlerts,
  getDemandForecast,
  getReorderRecommendations,
  calculateEOQ,
  calculateSafetyStock,
  getStockoutRiskProducts,
} from './inventory';

// Pricing exports
export {
  getPriceAnalysis,
  getMarginAnalysis,
  getProductMargins,
  recordPriceChange,
  getPricingSuggestions,
} from './pricing';

// Channels exports
export {
  getMultiChannelInventory,
  getChannelPerformance,
  getAllocationRecommendations,
  getUnifiedCatalog,
} from './channels';

// Metrics exports
export {
  getCommerceOpsMetrics,
  getSupplierPerformance,
  getInventoryHealthScore,
} from './metrics';

// NLQ exports
export {
  handleCommerceOpsNLQ,
  detectCommerceOpsIntent,
  getSuggestedQuestions,
  extractQuestionContext,
  formatCurrency,
  formatNumber,
  formatPercent,
} from './nlq';
