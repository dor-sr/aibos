/**
 * Google Ads Connector Types
 */

export interface GoogleAdsClientConfig {
  accessToken: string;
  refreshToken?: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  customerId: string;
  managerId?: string;
}

export interface GoogleAdsOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleAdsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface GoogleAdsSyncOptions {
  startDate?: Date;
  endDate?: Date;
}

// Google Ads API Response Types
export interface GoogleAdsSearchResponse {
  results: GoogleAdsRow[];
  nextPageToken?: string;
  totalResultsCount?: string;
}

export interface GoogleAdsRow {
  customer?: GoogleAdsCustomer;
  campaign?: GoogleAdsCampaign;
  adGroup?: GoogleAdsAdGroup;
  adGroupAd?: GoogleAdsAd;
  keywordView?: GoogleAdsKeywordView;
  metrics?: GoogleAdsMetrics;
  segments?: GoogleAdsSegments;
}

export interface GoogleAdsCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  status?: string;
}

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  advertisingChannelSubType?: string;
  biddingStrategyType?: string;
  startDate?: string;
  endDate?: string;
  campaignBudget?: string;
  targetCpa?: {
    targetCpaMicros: string;
  };
  targetRoas?: {
    targetRoas: number;
  };
  maximizeConversions?: {
    targetCpaMicros?: string;
  };
  maximizeConversionValue?: {
    targetRoas?: number;
  };
}

export interface GoogleAdsCampaignBudget {
  resourceName: string;
  id: string;
  name?: string;
  amountMicros: string;
  type: string;
  deliveryMethod: string;
}

export interface GoogleAdsAdGroup {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  type: string;
  campaign: string;
  cpcBidMicros?: string;
  cpmBidMicros?: string;
  targetCpaMicros?: string;
  effectiveTargetCpaMicros?: string;
}

export interface GoogleAdsAd {
  resourceName: string;
  ad: {
    resourceName: string;
    id: string;
    type: string;
    finalUrls?: string[];
    displayUrl?: string;
    responsiveSearchAd?: {
      headlines: Array<{ text: string; pinnedField?: string }>;
      descriptions: Array<{ text: string; pinnedField?: string }>;
      path1?: string;
      path2?: string;
    };
    responsiveDisplayAd?: {
      headlines: Array<{ text: string }>;
      longHeadline?: { text: string };
      descriptions: Array<{ text: string }>;
      businessName?: string;
      callToActionText?: string;
    };
    expandedTextAd?: {
      headlinePart1: string;
      headlinePart2: string;
      headlinePart3?: string;
      description: string;
      description2?: string;
      path1?: string;
      path2?: string;
    };
  };
  status: string;
  adGroup: string;
  policySummary?: {
    approvalStatus: string;
    reviewStatus: string;
    policyTopicEntries?: Array<{
      topic: string;
      type: string;
    }>;
  };
}

export interface GoogleAdsKeywordView {
  resourceName: string;
}

export interface GoogleAdsCriterion {
  resourceName: string;
  criterionId: string;
  status: string;
  type: string;
  keyword?: {
    text: string;
    matchType: string;
  };
  qualityInfo?: {
    qualityScore?: number;
    creativeQualityScore?: string;
    postClickQualityScore?: string;
    searchPredictedCtr?: string;
  };
  effectiveCpcBidMicros?: string;
  effectiveCpmBidMicros?: string;
  positionEstimates?: {
    firstPageCpcMicros?: string;
    firstPositionCpcMicros?: string;
    topOfPageCpcMicros?: string;
  };
}

export interface GoogleAdsMetrics {
  impressions?: string;
  clicks?: string;
  costMicros?: string;
  conversions?: number;
  conversionsValue?: number;
  allConversions?: number;
  allConversionsValue?: number;
  ctr?: number;
  averageCpc?: string;
  averageCpm?: string;
  costPerConversion?: string;
  costPerAllConversions?: string;
  valuePerConversion?: number;
  valuePerAllConversions?: number;
  videoViews?: string;
  videoQuartileP25Rate?: number;
  videoQuartileP50Rate?: number;
  videoQuartileP75Rate?: number;
  videoQuartileP100Rate?: number;
  absoluteTopImpressionPercentage?: number;
  topImpressionPercentage?: number;
  searchImpressionShare?: number;
  searchRankLostImpressionShare?: number;
  searchBudgetLostImpressionShare?: number;
}

export interface GoogleAdsSegments {
  date?: string;
  device?: string;
  conversionAction?: string;
  conversionActionCategory?: string;
  conversionActionName?: string;
  slot?: string;
}

// Status mappings
export const GOOGLE_ADS_CAMPAIGN_STATUS: Record<string, string> = {
  ENABLED: 'active',
  PAUSED: 'paused',
  REMOVED: 'deleted',
  UNKNOWN: 'draft',
  UNSPECIFIED: 'draft',
};

export const GOOGLE_ADS_AD_GROUP_STATUS: Record<string, string> = {
  ENABLED: 'active',
  PAUSED: 'paused',
  REMOVED: 'deleted',
  UNKNOWN: 'draft',
  UNSPECIFIED: 'draft',
};

export const GOOGLE_ADS_AD_STATUS: Record<string, string> = {
  ENABLED: 'active',
  PAUSED: 'paused',
  REMOVED: 'deleted',
  UNKNOWN: 'draft',
  UNSPECIFIED: 'draft',
};

export const GOOGLE_ADS_APPROVAL_STATUS: Record<string, string> = {
  APPROVED: 'active',
  APPROVED_LIMITED: 'active',
  DISAPPROVED: 'rejected',
  AREA_OF_INTEREST_ONLY: 'active',
  UNDER_REVIEW: 'pending_review',
  UNKNOWN: 'draft',
  UNSPECIFIED: 'draft',
};

export const GOOGLE_ADS_CHANNEL_TYPE: Record<string, string> = {
  SEARCH: 'search',
  DISPLAY: 'display',
  SHOPPING: 'shopping',
  VIDEO: 'video',
  MULTI_CHANNEL: 'performance_max',
  LOCAL: 'local',
  SMART: 'smart',
  PERFORMANCE_MAX: 'performance_max',
  LOCAL_SERVICES: 'local_services',
  DISCOVERY: 'discovery',
  TRAVEL: 'travel',
};

export const GOOGLE_ADS_BIDDING_STRATEGY: Record<string, string> = {
  MANUAL_CPC: 'manual_cpc',
  MANUAL_CPM: 'manual_cpm',
  MANUAL_CPV: 'manual_cpv',
  TARGET_CPA: 'target_cpa',
  TARGET_ROAS: 'target_roas',
  MAXIMIZE_CONVERSIONS: 'maximize_conversions',
  MAXIMIZE_CONVERSION_VALUE: 'maximize_conversion_value',
  TARGET_IMPRESSION_SHARE: 'target_impression_share',
  COMMISSION: 'commission',
  ENHANCED_CPC: 'enhanced_cpc',
  INVALID: 'unknown',
  UNKNOWN: 'unknown',
  UNSPECIFIED: 'unknown',
};

export const GOOGLE_ADS_KEYWORD_MATCH_TYPE: Record<string, string> = {
  EXACT: 'exact',
  PHRASE: 'phrase',
  BROAD: 'broad',
  UNKNOWN: 'broad',
  UNSPECIFIED: 'broad',
};
