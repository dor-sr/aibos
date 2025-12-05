// NLQ module exports
export { handleCommerceOpsNLQ } from './handler';
export { detectCommerceOpsIntent, getSuggestedQuestions, extractQuestionContext } from './intent';
export {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatInventorySummaryResponse,
  formatStockAlertsResponse,
  formatDemandForecastResponse,
  formatReorderRecommendationsResponse,
  formatMarginAnalysisResponse,
  formatPricingSuggestionsResponse,
  formatCommerceOpsMetricsResponse,
  formatSupplierPerformanceResponse,
} from './formatter';
