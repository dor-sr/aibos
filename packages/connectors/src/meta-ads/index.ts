/**
 * Meta Ads Connector Module
 */

export { MetaAdsConnector } from './connector';
export { MetaAdsClient } from './client';
export {
  syncMetaAdAccount,
  syncMetaCampaigns,
  syncMetaAdSets,
  syncMetaAds,
  syncMetaPerformance,
} from './sync';
export {
  META_ACCOUNT_STATUS,
  META_CAMPAIGN_OBJECTIVES,
  META_STATUS_MAP,
} from './types';
export type {
  MetaAdsClientConfig,
  MetaAdsOAuthConfig,
  MetaAdsTokenResponse,
  MetaAdsSyncOptions,
  MetaApiResponse,
  MetaAdAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsights,
  MetaTargeting,
  MetaAction,
} from './types';
