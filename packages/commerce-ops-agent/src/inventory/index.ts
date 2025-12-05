// Inventory module exports
export {
  getInventoryStatus,
  getInventorySummary,
  getStockAlerts,
  createStockAlert,
  resolveStockAlert,
  recordStockMovement,
  checkInventoryAlerts,
} from './tracker';

export {
  getDemandForecast,
  getReorderRecommendations,
  calculateEOQ,
  calculateSafetyStock,
  getStockoutRiskProducts,
} from './forecaster';
