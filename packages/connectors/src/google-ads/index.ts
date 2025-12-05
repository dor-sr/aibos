/**
 * Google Ads Connector Module
 */

export { GoogleAdsConnector } from './connector';
export { GoogleAdsClient } from './client';
export {
  syncGoogleAdsAccount,
  syncGoogleAdsCampaigns,
  syncGoogleAdsAdGroups,
  syncGoogleAdsAds,
  syncGoogleAdsPerformance,
  syncGoogleAdsKeywords,
} from './sync';
export {
  GOOGLE_ADS_CAMPAIGN_STATUS,
  GOOGLE_ADS_AD_GROUP_STATUS,
  GOOGLE_ADS_AD_STATUS,
  GOOGLE_ADS_APPROVAL_STATUS,
  GOOGLE_ADS_CHANNEL_TYPE,
  GOOGLE_ADS_BIDDING_STRATEGY,
  GOOGLE_ADS_KEYWORD_MATCH_TYPE,
} from './types';
export type {
  GoogleAdsClientConfig,
  GoogleAdsOAuthConfig,
  GoogleAdsTokenResponse,
  GoogleAdsSyncOptions,
  GoogleAdsSearchResponse,
  GoogleAdsRow,
  GoogleAdsCustomer,
  GoogleAdsCampaign,
  GoogleAdsCampaignBudget,
  GoogleAdsAdGroup,
  GoogleAdsAd,
  GoogleAdsKeywordView,
  GoogleAdsCriterion,
  GoogleAdsMetrics,
  GoogleAdsSegments,
} from './types';
