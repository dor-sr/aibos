/**
 * GA4 Connector Exports
 */

// Main connector and client
export { GA4Connector } from './connector';
export { GA4Client, type GA4ClientConfig } from './client';

// Sync functions
export { syncGA4Sessions } from './sessions';
export { syncGA4Pageviews } from './pageviews';
export { syncGA4Events } from './events';
export {
  syncGA4TrafficSources,
  syncGA4Channels,
  syncGA4UserAcquisition,
} from './traffic-sources';
export { syncGA4Conversions, GA4_CONVERSION_EVENTS } from './conversions';

// Types
export type {
  // API types
  GA4Dimension,
  GA4Metric,
  GA4DateRange,
  GA4FilterExpression,
  GA4RunReportRequest,
  GA4RunReportResponse,
  GA4Row,
  GA4DimensionHeader,
  GA4MetricHeader,
  GA4DimensionValue,
  GA4MetricValue,
  GA4PropertyQuota,
  // OAuth types
  GA4OAuthConfig,
  GA4TokenResponse,
  // Normalized data types
  GA4Session,
  GA4Event,
  GA4TrafficSource,
  GA4Conversion,
  GA4PageView,
  // Options
  GA4SyncOptions,
  // Constants
  GA4DimensionName,
  GA4MetricName,
} from './types';

export { GA4_DIMENSIONS, GA4_METRICS } from './types';






