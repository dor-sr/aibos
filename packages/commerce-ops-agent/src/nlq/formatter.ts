import type {
  InventorySummary,
  StockAlert,
  DemandForecast,
  ReorderRecommendation,
  MarginAnalysis,
  ProductMargin,
  PricingSuggestion,
  MultiChannelInventory,
  SupplierPerformance,
  CommerceOpsMetrics,
} from '../types';

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

/**
 * Format percent
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format inventory summary response
 */
export function formatInventorySummaryResponse(summary: InventorySummary): string {
  const lines: string[] = [
    `**Inventory Overview**`,
    ``,
    `- **Total Products:** ${formatNumber(summary.totalProducts)}`,
    `- **Stock Value:** ${formatCurrency(summary.totalStockValue, summary.currency)}`,
    `- **Locations:** ${summary.totalLocations}`,
    ``,
    `**Stock Status:**`,
    `- Healthy: ${summary.healthyProducts} products`,
    `- Low Stock: ${summary.lowStockProducts} products`,
    `- Critical: ${summary.criticalProducts} products`,
    `- Out of Stock: ${summary.outOfStockProducts} products`,
    `- Overstock: ${summary.overstockProducts} products`,
  ];

  if (summary.activeAlerts > 0) {
    lines.push(``, `**Active Alerts:** ${summary.activeAlerts}`);
  }

  return lines.join('\n');
}

/**
 * Format stock alerts response
 */
export function formatStockAlertsResponse(alerts: StockAlert[]): string {
  if (alerts.length === 0) {
    return 'No active stock alerts. All inventory levels are healthy.';
  }

  const lines: string[] = [
    `**Stock Alerts (${alerts.length})**`,
    ``,
  ];

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const highAlerts = alerts.filter((a) => a.severity === 'high');
  const otherAlerts = alerts.filter((a) => a.severity !== 'critical' && a.severity !== 'high');

  if (criticalAlerts.length > 0) {
    lines.push(`**Critical (${criticalAlerts.length}):**`);
    criticalAlerts.slice(0, 5).forEach((alert) => {
      lines.push(`- ${alert.productName}: ${alert.message}`);
    });
    lines.push('');
  }

  if (highAlerts.length > 0) {
    lines.push(`**High Priority (${highAlerts.length}):**`);
    highAlerts.slice(0, 5).forEach((alert) => {
      lines.push(`- ${alert.productName}: ${alert.message}`);
    });
    lines.push('');
  }

  if (otherAlerts.length > 0 && criticalAlerts.length + highAlerts.length < 5) {
    lines.push(`**Other Alerts (${otherAlerts.length}):**`);
    otherAlerts.slice(0, 3).forEach((alert) => {
      lines.push(`- ${alert.productName}: ${alert.message}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format demand forecast response
 */
export function formatDemandForecastResponse(forecasts: DemandForecast[]): string {
  if (forecasts.length === 0) {
    return 'No demand forecast data available. Need more sales history to generate forecasts.';
  }

  const atRisk = forecasts.filter((f) => f.daysUntilStockout !== null && f.daysUntilStockout <= 14);
  
  const lines: string[] = [
    `**Demand Forecast Summary**`,
    ``,
  ];

  if (atRisk.length > 0) {
    lines.push(`**Products at Risk of Stockout (${atRisk.length}):**`);
    lines.push('');
    
    atRisk.slice(0, 5).forEach((f) => {
      const stockoutText = f.daysUntilStockout !== null && f.daysUntilStockout <= 0
        ? 'OUT OF STOCK'
        : `${f.daysUntilStockout} days`;
      const trendIcon = f.trend === 'increasing' ? '(trending up)' : 
                        f.trend === 'decreasing' ? '(trending down)' : '';
      lines.push(`- **${f.productName}**: ${stockoutText} ${trendIcon}`);
      lines.push(`  Current stock: ${f.currentStock}, Avg daily sales: ${f.historicalAvgDailySales.toFixed(1)}`);
    });
  } else {
    lines.push('All products have sufficient stock for the next 14 days.');
  }

  return lines.join('\n');
}

/**
 * Format reorder recommendations response
 */
export function formatReorderRecommendationsResponse(recommendations: ReorderRecommendation[]): string {
  if (recommendations.length === 0) {
    return 'No reorder recommendations at this time. Inventory levels are healthy.';
  }

  const urgent = recommendations.filter((r) => r.priority === 'urgent');
  const high = recommendations.filter((r) => r.priority === 'high');

  const lines: string[] = [
    `**Reorder Recommendations (${recommendations.length})**`,
    ``,
  ];

  if (urgent.length > 0) {
    lines.push(`**Urgent (${urgent.length}):**`);
    urgent.forEach((r) => {
      lines.push(`- **${r.productName}**: Order ${r.recommendedQuantity} units`);
      lines.push(`  ${r.reason}`);
    });
    lines.push('');
  }

  if (high.length > 0) {
    lines.push(`**High Priority (${high.length}):**`);
    high.slice(0, 5).forEach((r) => {
      lines.push(`- **${r.productName}**: Order ${r.recommendedQuantity} units`);
    });
  }

  const totalToOrder = recommendations.reduce((sum, r) => sum + r.recommendedQuantity, 0);
  lines.push('');
  lines.push(`**Total units to order:** ${formatNumber(totalToOrder)}`);

  return lines.join('\n');
}

/**
 * Format margin analysis response
 */
export function formatMarginAnalysisResponse(analysis: MarginAnalysis): string {
  const lines: string[] = [
    `**Margin Analysis**`,
    ``,
    `- **Total Products:** ${formatNumber(analysis.totalProducts)}`,
    `- **Products with Cost Data:** ${analysis.productsWithMargin}`,
    `- **Average Margin:** ${formatPercent(analysis.averageMarginPercent)}`,
    ``,
    `**Profitability (30 days):**`,
    `- Revenue: ${formatCurrency(analysis.totalRevenue, analysis.currency)}`,
    `- Cost: ${formatCurrency(analysis.totalCost, analysis.currency)}`,
    `- Profit: ${formatCurrency(analysis.totalProfit, analysis.currency)}`,
    ``,
    `**Product Breakdown:**`,
    `- High Margin (40%+): ${analysis.highMarginProducts} products`,
    `- Low Margin (15-40%): ${analysis.lowMarginProducts} products`,
    `- Negative Margin: ${analysis.negativeMarginProducts} products`,
  ];

  if (analysis.productsWithoutCost > 0) {
    lines.push(`- Missing Cost Data: ${analysis.productsWithoutCost} products`);
  }

  return lines.join('\n');
}

/**
 * Format pricing suggestions response
 */
export function formatPricingSuggestionsResponse(suggestions: PricingSuggestion[]): string {
  if (suggestions.length === 0) {
    return 'No pricing suggestions at this time. All products appear to be priced appropriately.';
  }

  const lines: string[] = [
    `**Pricing Suggestions (${suggestions.length})**`,
    ``,
  ];

  const critical = suggestions.filter((s) => s.confidence === 'high');
  const others = suggestions.filter((s) => s.confidence !== 'high');

  if (critical.length > 0) {
    lines.push(`**High Confidence (${critical.length}):**`);
    critical.slice(0, 5).forEach((s) => {
      const direction = s.priceChangePercent > 0 ? 'Increase' : 'Decrease';
      lines.push(`- **${s.productName}**: ${direction} to ${formatCurrency(s.suggestedPrice)}`);
      lines.push(`  ${s.reason}`);
    });
    lines.push('');
  }

  if (others.length > 0 && critical.length < 5) {
    lines.push(`**Other Suggestions (${others.length}):**`);
    others.slice(0, 3).forEach((s) => {
      const direction = s.priceChangePercent > 0 ? 'Increase' : 'Decrease';
      lines.push(`- **${s.productName}**: ${direction} by ${formatPercent(Math.abs(s.priceChangePercent))}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format commerce ops metrics response
 */
export function formatCommerceOpsMetricsResponse(metrics: CommerceOpsMetrics): string {
  const lines: string[] = [
    `**Commerce Operations Summary**`,
    ``,
    `**Inventory:**`,
    `- Total Products: ${formatNumber(metrics.inventory.totalProducts)}`,
    `- Stock Value: ${formatCurrency(metrics.stockValue, metrics.currency)}`,
    `- Active Alerts: ${metrics.inventory.activeAlerts}`,
    ``,
    `**Health Indicators:**`,
    `- Out of Stock Rate: ${formatPercent(metrics.stockoutRate)}`,
    `- Overstock Rate: ${formatPercent(metrics.overstockRate)}`,
  ];

  if (metrics.turnoverRate !== null) {
    lines.push(`- Inventory Turnover: ${metrics.turnoverRate.toFixed(1)}x/year`);
  }

  if (metrics.avgDaysOfStock !== null) {
    lines.push(`- Avg Days of Stock: ${Math.round(metrics.avgDaysOfStock)} days`);
  }

  if (metrics.pendingPurchaseOrders > 0) {
    lines.push('');
    lines.push(`**Pending Purchase Orders:** ${metrics.pendingPurchaseOrders}`);
    lines.push(`- Value: ${formatCurrency(metrics.pendingPurchaseOrdersValue, metrics.currency)}`);
  }

  return lines.join('\n');
}

/**
 * Format supplier performance response
 */
export function formatSupplierPerformanceResponse(suppliers: SupplierPerformance[]): string {
  if (suppliers.length === 0) {
    return 'No supplier data available.';
  }

  const lines: string[] = [
    `**Supplier Performance**`,
    ``,
  ];

  suppliers.slice(0, 5).forEach((s, i) => {
    lines.push(`**${i + 1}. ${s.supplierName}**`);
    lines.push(`- Total Orders: ${s.totalOrders}`);
    lines.push(`- Total Spent: ${formatCurrency(s.totalSpent, s.currency)}`);
    lines.push(`- On-Time Delivery: ${formatPercent(s.onTimeDeliveryRate)}`);
    lines.push(`- Lead Time: ${s.averageLeadTime} days`);
    if (s.rating !== null) {
      lines.push(`- Rating: ${s.rating.toFixed(1)}/5`);
    }
    lines.push('');
  });

  return lines.join('\n');
}
