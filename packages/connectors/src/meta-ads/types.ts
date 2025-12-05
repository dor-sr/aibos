/**
 * Meta Ads (Facebook/Instagram) Connector Types
 */

export interface MetaAdsClientConfig {
  accessToken: string;
  adAccountId: string;
  appId?: string;
  appSecret?: string;
}

export interface MetaAdsOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface MetaAdsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaAdsSyncOptions {
  startDate?: Date;
  endDate?: Date;
  level?: 'account' | 'campaign' | 'adset' | 'ad';
}

// Meta Marketing API Response Types
export interface MetaApiResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
  summary?: Record<string, unknown>;
}

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  business?: {
    id: string;
    name: string;
  };
  amount_spent?: string;
  balance?: string;
  spend_cap?: string;
}

export interface MetaCampaign {
  id: string;
  account_id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  buying_type?: string;
  budget_remaining?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
  special_ad_categories?: string[];
}

export interface MetaAdSet {
  id: string;
  account_id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
  billing_event: string;
  optimization_goal: string;
  bid_strategy?: string;
  bid_amount?: number;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  start_time?: string;
  end_time?: string;
  targeting?: MetaTargeting;
  created_time: string;
  updated_time: string;
}

export interface MetaTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string; name: string }>;
    cities?: Array<{ key: string; name: string }>;
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  custom_audiences?: Array<{ id: string; name: string }>;
  excluded_custom_audiences?: Array<{ id: string; name: string }>;
  flexible_spec?: Array<Record<string, unknown>>;
  publisher_platforms?: string[];
  device_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
}

export interface MetaAd {
  id: string;
  account_id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
  creative?: {
    id: string;
    name?: string;
    object_story_spec?: {
      page_id?: string;
      link_data?: {
        link?: string;
        message?: string;
        name?: string;
        description?: string;
        call_to_action?: {
          type?: string;
          value?: {
            link?: string;
          };
        };
        image_hash?: string;
        image_crops?: Record<string, unknown>;
      };
      video_data?: {
        video_id?: string;
        title?: string;
        message?: string;
        call_to_action?: {
          type?: string;
        };
      };
    };
    thumbnail_url?: string;
    image_url?: string;
  };
  tracking_specs?: Array<Record<string, unknown>>;
  created_time: string;
  updated_time: string;
}

export interface MetaInsights {
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  date_start: string;
  date_stop: string;
  // Core metrics
  impressions: string;
  clicks: string;
  spend: string;
  reach?: string;
  frequency?: string;
  // Engagement
  actions?: MetaAction[];
  action_values?: MetaAction[];
  // Video
  video_p25_watched_actions?: MetaAction[];
  video_p50_watched_actions?: MetaAction[];
  video_p75_watched_actions?: MetaAction[];
  video_p100_watched_actions?: MetaAction[];
  video_play_actions?: MetaAction[];
  // Calculated
  cpc?: string;
  cpm?: string;
  ctr?: string;
  cpp?: string;
  cost_per_action_type?: MetaAction[];
  // Attribution
  attribution_setting?: string;
}

export interface MetaAction {
  action_type: string;
  value: string;
}

// Status mappings
export const META_ACCOUNT_STATUS: Record<number, string> = {
  1: 'active',
  2: 'disabled',
  3: 'unsettled',
  7: 'pending_review',
  8: 'pending_closure',
  9: 'in_grace_period',
  100: 'pending_risk_review',
  101: 'pending_settlement',
  201: 'any_active',
  202: 'any_closed',
};

export const META_CAMPAIGN_OBJECTIVES: Record<string, string> = {
  OUTCOME_AWARENESS: 'awareness',
  OUTCOME_ENGAGEMENT: 'engagement',
  OUTCOME_LEADS: 'leads',
  OUTCOME_SALES: 'sales',
  OUTCOME_TRAFFIC: 'traffic',
  OUTCOME_APP_PROMOTION: 'app_promotion',
  // Legacy objectives
  BRAND_AWARENESS: 'brand_awareness',
  REACH: 'reach',
  LINK_CLICKS: 'traffic',
  POST_ENGAGEMENT: 'engagement',
  VIDEO_VIEWS: 'video_views',
  LEAD_GENERATION: 'leads',
  MESSAGES: 'engagement',
  CONVERSIONS: 'conversions',
  CATALOG_SALES: 'sales',
  STORE_VISITS: 'store_traffic',
};

export const META_STATUS_MAP: Record<string, string> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DELETED: 'deleted',
  ARCHIVED: 'archived',
  IN_PROCESS: 'draft',
  WITH_ISSUES: 'active',
  CAMPAIGN_PAUSED: 'paused',
  ADSET_PAUSED: 'paused',
  PENDING_REVIEW: 'pending_review',
  DISAPPROVED: 'rejected',
  PREAPPROVED: 'active',
  PENDING_BILLING_INFO: 'draft',
};
