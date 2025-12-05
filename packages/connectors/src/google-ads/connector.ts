/**
 * Google Ads Connector
 */

import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from '../types';
import { GoogleAdsClient } from './client';
import {
  syncGoogleAdsAccount,
  syncGoogleAdsCampaigns,
  syncGoogleAdsAdGroups,
  syncGoogleAdsAds,
  syncGoogleAdsPerformance,
  syncGoogleAdsKeywords,
} from './sync';
import type { GoogleAdsOAuthConfig } from './types';

// Google Ads API required scopes
const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords'];

/**
 * Google Ads Connector Implementation
 * Syncs Google Ads campaign data including keywords and performance
 */
export class GoogleAdsConnector extends BaseConnector {
  private client: GoogleAdsClient;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.accessToken) {
      throw new Error('Google Ads connector requires accessToken');
    }

    if (!config.credentials.developerToken) {
      throw new Error('Google Ads connector requires developerToken');
    }

    if (!config.credentials.customerId) {
      throw new Error('Google Ads connector requires customerId');
    }

    this.client = new GoogleAdsClient({
      accessToken: config.credentials.accessToken as string,
      refreshToken: config.credentials.refreshToken as string | undefined,
      developerToken: config.credentials.developerToken as string,
      clientId: config.credentials.clientId as string || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: config.credentials.clientSecret as string || process.env.GOOGLE_CLIENT_SECRET || '',
      customerId: config.credentials.customerId as string,
      managerId: config.credentials.managerId as string | undefined,
    });
  }

  override get type(): string {
    return 'google_ads';
  }

  /**
   * Get the Google Ads client for direct API access
   */
  getClient(): GoogleAdsClient {
    return this.client;
  }

  /**
   * Get OAuth authorization URL
   */
  static override getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const googleConfig: GoogleAdsOAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: GOOGLE_ADS_SCOPES,
    };
    return GoogleAdsClient.getAuthorizationUrl(googleConfig, state);
  }

  /**
   * Exchange OAuth code for tokens
   */
  static override async handleOAuthCallback(
    config: OAuthConfig,
    code: string
  ): Promise<OAuthResult> {
    const googleConfig: GoogleAdsOAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: GOOGLE_ADS_SCOPES,
    };

    const tokens = await GoogleAdsClient.exchangeCodeForTokens(googleConfig, code);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    };
  }

  /**
   * Refresh OAuth tokens
   */
  override async refreshTokens(): Promise<OAuthResult> {
    if (!this.config.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const googleConfig: GoogleAdsOAuthConfig = {
      clientId,
      clientSecret,
      redirectUri: '',
      scopes: GOOGLE_ADS_SCOPES,
    };

    const tokens = await GoogleAdsClient.refreshAccessToken(
      googleConfig,
      this.config.credentials.refreshToken as string
    );

    this.client.updateAccessToken(tokens.access_token);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || (this.config.credentials.refreshToken as string),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    };
  }

  /**
   * Test connection to Google Ads
   */
  override async testConnection(): Promise<boolean> {
    this.logger.info('Testing Google Ads connection');
    return this.client.testConnection();
  }

  /**
   * Full sync of all Google Ads data
   */
  override async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Google Ads full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      adAccount: 0,
      campaigns: 0,
      adGroups: 0,
      ads: 0,
      performance: 0,
      keywords: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      // 1. Sync ad account
      let adAccountId: string;
      try {
        adAccountId = await syncGoogleAdsAccount(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        recordsProcessed.adAccount = 1;
        this.logger.info('Synced Google Ads account');
      } catch (error) {
        this.logger.error('Failed to sync ad account', error as Error);
        errors.push({
          type: 'ad_account_sync_error',
          message: (error as Error).message,
        });
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
        recordsProcessed.campaigns = await syncGoogleAdsCampaigns(
          this.client,
          this.config.workspaceId,
          adAccountId
        );
        this.logger.info('Synced Google Ads campaigns', { count: recordsProcessed.campaigns });
      } catch (error) {
        this.logger.error('Failed to sync campaigns', error as Error);
        errors.push({
          type: 'campaign_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync ad groups
      try {
        recordsProcessed.adGroups = await syncGoogleAdsAdGroups(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Google Ads ad groups', { count: recordsProcessed.adGroups });
      } catch (error) {
        this.logger.error('Failed to sync ad groups', error as Error);
        errors.push({
          type: 'adgroup_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync ads
      try {
        recordsProcessed.ads = await syncGoogleAdsAds(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Google Ads ads', { count: recordsProcessed.ads });
      } catch (error) {
        this.logger.error('Failed to sync ads', error as Error);
        errors.push({
          type: 'ad_sync_error',
          message: (error as Error).message,
        });
      }

      // 5. Sync performance (last 30 days)
      try {
        recordsProcessed.performance = await syncGoogleAdsPerformance(
          this.client,
          this.config.workspaceId,
          adAccountId
        );
        this.logger.info('Synced Google Ads performance', { count: recordsProcessed.performance });
      } catch (error) {
        this.logger.error('Failed to sync performance', error as Error);
        errors.push({
          type: 'performance_sync_error',
          message: (error as Error).message,
        });
      }

      // 6. Sync keywords
      try {
        recordsProcessed.keywords = await syncGoogleAdsKeywords(
          this.client,
          this.config.workspaceId,
          adAccountId
        );
        this.logger.info('Synced Google Ads keywords', { count: recordsProcessed.keywords });
      } catch (error) {
        this.logger.error('Failed to sync keywords', error as Error);
        errors.push({
          type: 'keyword_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('Google Ads full sync completed', {
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
      this.logger.error('Google Ads full sync failed', error as Error);
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
    this.logger.info('Starting Google Ads incremental sync', {
      workspaceId: this.config.workspaceId,
      since: since.toISOString(),
    });

    const recordsProcessed = {
      campaigns: 0,
      adGroups: 0,
      ads: 0,
      performance: 0,
      keywords: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      const adAccountId = `gads_account_${this.client.getCustomerId().replace(/-/g, '')}`;

      // 1. Sync campaigns (always get latest state)
      try {
        recordsProcessed.campaigns = await syncGoogleAdsCampaigns(
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

      // 2. Sync ad groups
      try {
        recordsProcessed.adGroups = await syncGoogleAdsAdGroups(
          this.client,
          this.config.workspaceId
        );
      } catch (error) {
        this.logger.error('Failed to sync ad groups', error as Error);
        errors.push({
          type: 'adgroup_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync ads
      try {
        recordsProcessed.ads = await syncGoogleAdsAds(
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
        recordsProcessed.performance = await syncGoogleAdsPerformance(
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

      // 5. Sync keywords since last sync
      try {
        recordsProcessed.keywords = await syncGoogleAdsKeywords(
          this.client,
          this.config.workspaceId,
          adAccountId,
          { startDate: since, endDate: new Date() }
        );
      } catch (error) {
        this.logger.error('Failed to sync keywords', error as Error);
        errors.push({
          type: 'keyword_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('Google Ads incremental sync completed', {
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
      this.logger.error('Google Ads incremental sync failed', error as Error);
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
