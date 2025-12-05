/**
 * Google Ads API Client
 */

import { createLogger } from '@aibos/core';
import type {
  GoogleAdsClientConfig,
  GoogleAdsOAuthConfig,
  GoogleAdsTokenResponse,
  GoogleAdsSearchResponse,
  GoogleAdsRow,
} from './types';

const logger = createLogger('google-ads:client');

const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v15';
const GOOGLE_OAUTH_BASE = 'https://oauth2.googleapis.com';
const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

export class GoogleAdsClient {
  private config: GoogleAdsClientConfig;

  constructor(config: GoogleAdsClientConfig) {
    this.config = config;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(config: GoogleAdsOAuthConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    config: GoogleAdsOAuthConfig,
    code: string
  ): Promise<GoogleAdsTokenResponse> {
    const response = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to exchange code for tokens', new Error(errorText));
      throw new Error(`Failed to exchange code: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    config: GoogleAdsOAuthConfig,
    refreshToken: string
  ): Promise<GoogleAdsTokenResponse> {
    const response = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to refresh access token', new Error(errorText));
      throw new Error(`Failed to refresh token: ${errorText}`);
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
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'developer-token': this.config.developerToken,
      'Content-Type': 'application/json',
    };

    // Add login-customer-id header if using manager account
    if (this.config.managerId) {
      headers['login-customer-id'] = this.config.managerId.replace(/-/g, '');
    }

    const response = await fetch(`${GOOGLE_ADS_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      logger.error('Google Ads API request failed', new Error(JSON.stringify(error)));
      throw new Error(`Google Ads API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Execute GAQL query
   */
  async search(query: string, pageToken?: string): Promise<GoogleAdsSearchResponse> {
    const customerId = this.config.customerId.replace(/-/g, '');
    
    const body: Record<string, string> = { query };
    if (pageToken) {
      body.pageToken = pageToken;
    }

    return this.request<GoogleAdsSearchResponse>(
      `/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }

  /**
   * Search all pages
   */
  async searchAll(query: string): Promise<GoogleAdsRow[]> {
    const allResults: GoogleAdsRow[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.search(query, pageToken);
      if (response.results) {
        allResults.push(...response.results);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allResults;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const query = `
        SELECT customer.id, customer.descriptive_name
        FROM customer
        LIMIT 1
      `;
      const result = await this.search(query);
      return !!result.results;
    } catch (error) {
      logger.error('Google Ads connection test failed', error as Error);
      return false;
    }
  }

  /**
   * Get customer details
   */
  async getCustomer(): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.status
      FROM customer
    `;
    return this.searchAll(query);
  }

  /**
   * Get campaigns
   */
  async getCampaigns(): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.advertising_channel_sub_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        campaign.campaign_budget,
        campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas,
        campaign.maximize_conversions.target_cpa_micros,
        campaign.maximize_conversion_value.target_roas
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id
    `;
    return this.searchAll(query);
  }

  /**
   * Get campaign budgets
   */
  async getCampaignBudgets(): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        campaign_budget.id,
        campaign_budget.name,
        campaign_budget.amount_micros,
        campaign_budget.type,
        campaign_budget.delivery_method
      FROM campaign_budget
    `;
    return this.searchAll(query);
  }

  /**
   * Get ad groups
   */
  async getAdGroups(campaignId?: string): Promise<GoogleAdsRow[]> {
    let query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.type,
        ad_group.campaign,
        ad_group.cpc_bid_micros,
        ad_group.cpm_bid_micros,
        ad_group.target_cpa_micros,
        ad_group.effective_target_cpa_micros
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
    `;

    if (campaignId) {
      query += ` AND campaign.id = ${campaignId}`;
    }

    query += ' ORDER BY ad_group.id';
    return this.searchAll(query);
  }

  /**
   * Get ads
   */
  async getAds(adGroupId?: string): Promise<GoogleAdsRow[]> {
    let query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.display_url,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2,
        ad_group_ad.ad.responsive_display_ad.headlines,
        ad_group_ad.ad.responsive_display_ad.long_headline,
        ad_group_ad.ad.responsive_display_ad.descriptions,
        ad_group_ad.ad.responsive_display_ad.business_name,
        ad_group_ad.ad.responsive_display_ad.call_to_action_text,
        ad_group_ad.status,
        ad_group_ad.ad_group,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.policy_summary.review_status
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED'
    `;

    if (adGroupId) {
      query += ` AND ad_group.id = ${adGroupId}`;
    }

    query += ' ORDER BY ad_group_ad.ad.id';
    return this.searchAll(query);
  }

  /**
   * Get keywords with quality scores
   */
  async getKeywords(adGroupId?: string): Promise<GoogleAdsRow[]> {
    let query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.status,
        ad_group_criterion.type,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        ad_group_criterion.quality_info.creative_quality_score,
        ad_group_criterion.quality_info.post_click_quality_score,
        ad_group_criterion.quality_info.search_predicted_ctr,
        ad_group_criterion.effective_cpc_bid_micros,
        ad_group_criterion.position_estimates.first_page_cpc_micros,
        ad_group_criterion.position_estimates.first_position_cpc_micros,
        ad_group_criterion.position_estimates.top_of_page_cpc_micros,
        ad_group.id,
        ad_group.campaign
      FROM ad_group_criterion
      WHERE ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.status != 'REMOVED'
    `;

    if (adGroupId) {
      query += ` AND ad_group.id = ${adGroupId}`;
    }

    query += ' ORDER BY ad_group_criterion.criterion_id';
    return this.searchAll(query);
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.all_conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm,
        metrics.cost_per_conversion,
        metrics.value_per_conversion,
        metrics.video_views,
        metrics.video_quartile_p25_rate,
        metrics.video_quartile_p50_rate,
        metrics.video_quartile_p75_rate,
        metrics.video_quartile_p100_rate,
        metrics.absolute_top_impression_percentage,
        metrics.top_impression_percentage,
        metrics.search_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.search_budget_lost_impression_share
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY segments.date DESC
    `;
    return this.searchAll(query);
  }

  /**
   * Get ad group performance
   */
  async getAdGroupPerformance(
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.campaign,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion,
        metrics.value_per_conversion
      FROM ad_group
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group.status != 'REMOVED'
      ORDER BY segments.date DESC
    `;
    return this.searchAll(query);
  }

  /**
   * Get ad performance
   */
  async getAdPerformance(
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad_group,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion,
        metrics.value_per_conversion
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group_ad.status != 'REMOVED'
      ORDER BY segments.date DESC
    `;
    return this.searchAll(query);
  }

  /**
   * Get keyword performance
   */
  async getKeywordPerformance(
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsRow[]> {
    const query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        ad_group.id,
        ad_group.campaign,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_position,
        metrics.cost_per_conversion
      FROM keyword_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY segments.date DESC
    `;
    return this.searchAll(query);
  }

  /**
   * Update access token
   */
  updateAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
  }

  /**
   * Get customer ID
   */
  getCustomerId(): string {
    return this.config.customerId;
  }
}

export type { GoogleAdsClientConfig };
