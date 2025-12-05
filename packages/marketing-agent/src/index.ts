/**
 * Marketing Agent Package
 *
 * Full implementation of the AI-powered Marketing Agent
 *
 * Features:
 * - Natural language queries about marketing performance
 * - Channel and campaign performance analysis
 * - Budget allocation recommendations
 * - Creative fatigue detection
 * - Ad copy and headline generation
 */

// Main exports
export * from './types';
export { MarketingAgent, createMarketingAgent } from './agent';

// NLQ exports
export {
  handleMarketingNLQ,
  detectMarketingIntent,
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatRoas,
  formatDateRange,
  formatPeriodLabel,
  type MarketingNLQRequest,
} from './nlq';

// Metrics exports
export {
  getMarketingMetricsSummary,
  getChannelPerformance,
  getCampaignPerformance,
  getTopCampaigns,
  getUnderperformingCampaigns,
  getSpendTrend,
  getDateRange,
  getPreviousPeriodRange,
} from './metrics';

// Recommendations exports
export {
  getBudgetRecommendations,
  detectCreativeFatigue,
  generateMarketingSuggestions,
} from './recommendations';

// Generation exports
export {
  generateCreatives,
  generateAdVariations,
} from './generation';
