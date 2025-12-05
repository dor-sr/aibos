/**
 * Marketing NLQ Module
 */

export { handleMarketingNLQ, type MarketingNLQRequest } from './handler';
export { detectMarketingIntent, CHANNEL_PATTERNS, PERIOD_PATTERNS } from './intent';
export {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatRoas,
  formatDateRange,
  formatPeriodLabel,
} from './formatter';
