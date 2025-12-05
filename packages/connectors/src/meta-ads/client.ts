/**
 * Meta Ads Marketing API Client
 */

import { createLogger } from '@aibos/core';
import type {
  MetaAdsClientConfig,
  MetaAdsOAuthConfig,
  MetaAdsTokenResponse,
  MetaApiResponse,
  MetaAdAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsights,
} from './types';

const logger = createLogger('meta-ads:client');

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';
const META_OAUTH_BASE = 'https://www.facebook.com/v18.0/dialog/oauth';

// Default fields to fetch
const CAMPAIGN_FIELDS = [
  'id',
  'account_id',
  'name',
  'status',
  'effective_status',
  'objective',
  'buying_type',
  'budget_remaining',
  'daily_budget',
  'lifetime_budget',
  'start_time',
  'stop_time',
  'created_time',
  'updated_time',
  'special_ad_categories',
].join(',');

const ADSET_FIELDS = [
  'id',
  'account_id',
  'campaign_id',
  'name',
  'status',
  'effective_status',
  'billing_event',
  'optimization_goal',
  'bid_strategy',
  'bid_amount',
  'daily_budget',
  'lifetime_budget',
  'budget_remaining',
  'start_time',
  'end_time',
  'targeting',
  'created_time',
  'updated_time',
].join(',');

const AD_FIELDS = [
  'id',
  'account_id',
  'adset_id',
  'campaign_id',
  'name',
  'status',
  'effective_status',
  'creative{id,name,object_story_spec,thumbnail_url,image_url}',
  'tracking_specs',
  'created_time',
  'updated_time',
].join(',');

const INSIGHTS_FIELDS = [
  'account_id',
  'campaign_id',
  'adset_id',
  'ad_id',
  'date_start',
  'date_stop',
  'impressions',
  'clicks',
  'spend',
  'reach',
  'frequency',
  'actions',
  'action_values',
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
  'cpc',
  'cpm',
  'ctr',
  'cpp',
  'cost_per_action_type',
].join(',');

export class MetaAdsClient {
  private config: MetaAdsClientConfig;

  constructor(config: MetaAdsClientConfig) {
    this.config = config;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(config: MetaAdsOAuthConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(','),
      state,
    });

    return `${META_OAUTH_BASE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    config: MetaAdsOAuthConfig,
    code: string
  ): Promise<MetaAdsTokenResponse> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    });

    const response = await fetch(
      `${META_GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error('Failed to exchange code for tokens', new Error(JSON.stringify(error)));
      throw new Error(`Failed to exchange code: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Get long-lived access token
   */
  static async getLongLivedToken(
    config: MetaAdsOAuthConfig,
    shortLivedToken: string
  ): Promise<MetaAdsTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${META_GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error('Failed to get long-lived token', new Error(JSON.stringify(error)));
      throw new Error(`Failed to get long-lived token: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(`${META_GRAPH_API_BASE}${endpoint}`);
    url.searchParams.append('access_token', this.config.accessToken);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Meta API request failed', new Error(JSON.stringify(error)));
      throw new Error(`Meta API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Paginate through all results
   */
  private async paginate<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const allResults: T[] = [];
    let url = new URL(`${META_GRAPH_API_BASE}${endpoint}`);
    
    url.searchParams.append('access_token', this.config.accessToken);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    while (url) {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API error: ${error.error?.message || response.statusText}`);
      }

      const data: MetaApiResponse<T> = await response.json();
      allResults.push(...data.data);

      if (data.paging?.next) {
        url = new URL(data.paging.next);
      } else {
        break;
      }
    }

    return allResults;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const account = await this.getAdAccount();
      return !!account.id;
    } catch (error) {
      logger.error('Meta Ads connection test failed', error as Error);
      return false;
    }
  }

  /**
   * Get ad account details
   */
  async getAdAccount(): Promise<MetaAdAccount> {
    return this.request<MetaAdAccount>(
      `/act_${this.config.adAccountId}?fields=id,account_id,name,currency,timezone_name,account_status,amount_spent,balance,spend_cap`
    );
  }

  /**
   * Get all ad accounts for user
   */
  async getAdAccounts(): Promise<MetaAdAccount[]> {
    const response = await this.request<MetaApiResponse<MetaAdAccount>>(
      '/me/adaccounts?fields=id,account_id,name,currency,timezone_name,account_status'
    );
    return response.data;
  }

  /**
   * Get campaigns
   */
  async getCampaigns(limit = 500): Promise<MetaCampaign[]> {
    return this.paginate<MetaCampaign>(
      `/act_${this.config.adAccountId}/campaigns`,
      { fields: CAMPAIGN_FIELDS, limit: String(limit) }
    );
  }

  /**
   * Get ad sets
   */
  async getAdSets(campaignId?: string, limit = 500): Promise<MetaAdSet[]> {
    const endpoint = campaignId
      ? `/${campaignId}/adsets`
      : `/act_${this.config.adAccountId}/adsets`;
    
    return this.paginate<MetaAdSet>(endpoint, {
      fields: ADSET_FIELDS,
      limit: String(limit),
    });
  }

  /**
   * Get ads
   */
  async getAds(adSetId?: string, limit = 500): Promise<MetaAd[]> {
    const endpoint = adSetId
      ? `/${adSetId}/ads`
      : `/act_${this.config.adAccountId}/ads`;
    
    return this.paginate<MetaAd>(endpoint, {
      fields: AD_FIELDS,
      limit: String(limit),
    });
  }

  /**
   * Get insights (performance data)
   */
  async getInsights(
    startDate: string,
    endDate: string,
    level: 'account' | 'campaign' | 'adset' | 'ad' = 'ad',
    limit = 500
  ): Promise<MetaInsights[]> {
    const endpoint = `/act_${this.config.adAccountId}/insights`;
    
    return this.paginate<MetaInsights>(endpoint, {
      fields: INSIGHTS_FIELDS,
      level,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      time_increment: '1', // Daily breakdown
      limit: String(limit),
    });
  }

  /**
   * Get insights for a specific campaign
   */
  async getCampaignInsights(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<MetaInsights[]> {
    return this.paginate<MetaInsights>(`/${campaignId}/insights`, {
      fields: INSIGHTS_FIELDS,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      time_increment: '1',
    });
  }

  /**
   * Get insights for a specific ad set
   */
  async getAdSetInsights(
    adSetId: string,
    startDate: string,
    endDate: string
  ): Promise<MetaInsights[]> {
    return this.paginate<MetaInsights>(`/${adSetId}/insights`, {
      fields: INSIGHTS_FIELDS,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      time_increment: '1',
    });
  }

  /**
   * Get insights for a specific ad
   */
  async getAdInsights(
    adId: string,
    startDate: string,
    endDate: string
  ): Promise<MetaInsights[]> {
    return this.paginate<MetaInsights>(`/${adId}/insights`, {
      fields: INSIGHTS_FIELDS,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      time_increment: '1',
    });
  }

  /**
   * Update access token
   */
  updateAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
  }

  /**
   * Get ad account ID
   */
  getAdAccountId(): string {
    return this.config.adAccountId;
  }
}

export type { MetaAdsClientConfig };
