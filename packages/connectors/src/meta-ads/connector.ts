/**
 * Meta Ads Connector
 */

import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from '../types';
import { MetaAdsClient } from './client';
import {
  syncMetaAdAccount,
  syncMetaCampaigns,
  syncMetaAdSets,
  syncMetaAds,
  syncMetaPerformance,
} from './sync';
import type { MetaAdsOAuthConfig } from './types';

// Meta Marketing API required scopes
const META_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'read_insights',
];

/**
 * Meta Ads Connector Implementation
 * Syncs Facebook/Instagram advertising data
 */
export class MetaAdsConnector extends BaseConnector {
  private client: MetaAdsClient;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.accessToken) {
      throw new Error('Meta Ads connector requires accessToken');
    }

    if (!config.credentials.adAccountId) {
      throw new Error('Meta Ads connector requires adAccountId');
    }

    this.client = new MetaAdsClient({
      accessToken: config.credentials.accessToken as string,
      adAccountId: config.credentials.adAccountId as string,
    });
  }

  override get type(): string {
    return 'meta_ads';
  }

  /**
   * Get the Meta Ads client for direct API access
   */
  getClient(): MetaAdsClient {
    return this.client;
  }

  /**
   * Get OAuth authorization URL
   */
  static override getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const metaConfig: MetaAdsOAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: META_SCOPES,
    };
    return MetaAdsClient.getAuthorizationUrl(metaConfig, state);
  }

  /**
   * Exchange OAuth code for tokens
   */
  static override async handleOAuthCallback(
    config: OAuthConfig,
    code: string
  ): Promise<OAuthResult> {
    const metaConfig: MetaAdsOAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: META_SCOPES,
    };

    // Exchange code for short-lived token
    const shortLivedTokens = await MetaAdsClient.exchangeCodeForTokens(metaConfig, code);

    // Exchange for long-lived token (60 days)
    const longLivedTokens = await MetaAdsClient.getLongLivedToken(
      metaConfig,
      shortLivedTokens.access_token
    );

    return {
      accessToken: longLivedTokens.access_token,
      expiresAt: longLivedTokens.expires_in
        ? new Date(Date.now() + longLivedTokens.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Refresh OAuth tokens
   * Note: Meta long-lived tokens don't have a traditional refresh flow
   * They need to be refreshed before expiry using the same exchange process
   */
  override async refreshTokens(): Promise<OAuthResult> {
    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Meta OAuth credentials not configured');
    }

    const metaConfig: MetaAdsOAuthConfig = {
      clientId,
      clientSecret,
      redirectUri: '',
      scopes: META_SCOPES,
    };

    // Exchange current token for new long-lived token
    const newTokens = await MetaAdsClient.getLongLivedToken(
      metaConfig,
      this.config.credentials.accessToken as string
    );

    this.client.updateAccessToken(newTokens.access_token);

    return {
      accessToken: newTokens.access_token,
      expiresAt: newTokens.expires_in
        ? new Date(Date.now() + newTokens.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Test connection to Meta Ads
   */
  override async testConnection(): Promise<boolean> {
    this.logger.info('Testing Meta Ads connection');
    return this.client.testConnection();
  }

  /**
   * Full sync of all Meta Ads data
   */
  override async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Meta Ads full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      adAccount: 0,
      campaigns: 0,
      adSets: 0,
      ads: 0,
      performance: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      // 1. Sync ad account
      let adAccountId: string;
      try {
        adAccountId = await syncMetaAdAccount(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        recordsProcessed.adAccount = 1;
        this.logger.info('Synced Meta ad account');
      } catch (error) {
        this.logger.error('Failed to sync ad account', error as Error);
        errors.push({
          type: 'ad_account_sync_error',
          message: (error as Error).message,
        });
        // Can't continue without ad account
        return {
          success: false,
          recordsProcessed,
          errors,
          startedAt,
          completedAt: new Date(),
        };
      }

      // 2. Sync campaigns
      try {
        recordsProcessed.campaigns = await syncMetaCampaigns(
          this.client,
          this.config.workspaceId,
          adAccountId
        );
        this.logger.info('Synced Meta campaigns', { count: recordsProcessed.campaigns });
      } catch (error) {
        this.logger.error('Failed to sync campaigns', error as Error);
        errors.push({
          type: 'campaign_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync ad sets
      try {
        recordsProcessed.adSets = await syncMetaAdSets(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Meta ad sets', { count: recordsProcessed.adSets });
      } catch (error) {
        this.logger.error('Failed to sync ad sets', error as Error);
        errors.push({
          type: 'adset_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync ads
      try {
        recordsProcessed.ads = await syncMetaAds(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Meta ads', { count: recordsProcessed.ads });
      } catch (error) {
        this.logger.error('Failed to sync ads', error as Error);
        errors.push({
          type: 'ad_sync_error',
          message: (error as Error).message,
        });
      }

      // 5. Sync performance (last 30 days)
      try {
        recordsProcessed.performance = await syncMetaPerformance(
          this.client,
          this.config.workspaceId,
          adAccountId
        );
        this.logger.info('Synced Meta performance', { count: recordsProcessed.performance });
      } catch (error) {
        this.logger.error('Failed to sync performance', error as Error);
        errors.push({
          type: 'performance_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('Meta Ads full sync completed', {
        workspaceId: this.config.workspaceId,
        recordsProcessed,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Meta Ads full sync failed', error as Error);
      return {
        success: false,
        recordsProcessed,
        errors: [
          {
            type: 'sync_error',
            message: (error as Error).message,
          },
        ],
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Incremental sync since last sync date
   */
  override async incrementalSync(since: Date): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Meta Ads incremental sync', {
      workspaceId: this.config.workspaceId,
      since: since.toISOString(),
    });

    const recordsProcessed = {
      campaigns: 0,
      adSets: 0,
      ads: 0,
      performance: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      // Get ad account ID from existing record
      const adAccountId = `meta_account_${this.client.getAdAccountId()}`;

      // 1. Sync campaigns (always get latest state)
      try {
        recordsProcessed.campaigns = await syncMetaCampaigns(
          this.client,
          this.config.workspaceId,
          adAccountId
        );
      } catch (error) {
        this.logger.error('Failed to sync campaigns', error as Error);
        errors.push({
          type: 'campaign_sync_error',
          message: (error as Error).message,
        });
      }

      // 2. Sync ad sets
      try {
        recordsProcessed.adSets = await syncMetaAdSets(
          this.client,
          this.config.workspaceId
        );
      } catch (error) {
        this.logger.error('Failed to sync ad sets', error as Error);
        errors.push({
          type: 'adset_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync ads
      try {
        recordsProcessed.ads = await syncMetaAds(
          this.client,
          this.config.workspaceId
        );
      } catch (error) {
        this.logger.error('Failed to sync ads', error as Error);
        errors.push({
          type: 'ad_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync performance since last sync
      try {
        recordsProcessed.performance = await syncMetaPerformance(
          this.client,
          this.config.workspaceId,
          adAccountId,
          { startDate: since, endDate: new Date() }
        );
      } catch (error) {
        this.logger.error('Failed to sync performance', error as Error);
        errors.push({
          type: 'performance_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('Meta Ads incremental sync completed', {
        workspaceId: this.config.workspaceId,
        recordsProcessed,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Meta Ads incremental sync failed', error as Error);
      return {
        success: false,
        recordsProcessed,
        errors: [
          {
            type: 'sync_error',
            message: (error as Error).message,
          },
        ],
        startedAt,
        completedAt: new Date(),
      };
    }
  }
}
