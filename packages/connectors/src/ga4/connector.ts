/**
 * Google Analytics 4 Connector
 */

import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from '../types';
import { GA4Client } from './client';
import { syncGA4Sessions } from './sessions';
import { syncGA4Pageviews } from './pageviews';
import { syncGA4Events } from './events';
import { syncGA4TrafficSources, syncGA4Channels, syncGA4UserAcquisition } from './traffic-sources';
import { syncGA4Conversions } from './conversions';
import type { GA4OAuthConfig, GA4TokenResponse } from './types';

// Google OAuth scopes for GA4
const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
];

/**
 * GA4 Connector Implementation
 * Syncs Google Analytics 4 data for web analytics
 */
export class GA4Connector extends BaseConnector {
  private client: GA4Client;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.accessToken) {
      throw new Error('GA4 connector requires accessToken');
    }

    if (!config.credentials.propertyId) {
      throw new Error('GA4 connector requires propertyId');
    }

    this.client = new GA4Client({
      accessToken: config.credentials.accessToken as string,
      refreshToken: config.credentials.refreshToken as string | undefined,
      propertyId: config.credentials.propertyId as string,
    });
  }

  override get type(): string {
    return 'ga4';
  }

  /**
   * Get the GA4 client for direct API access
   */
  getClient(): GA4Client {
    return this.client;
  }

  /**
   * Get OAuth authorization URL
   */
  static override getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const ga4Config: GA4OAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: GA4_SCOPES,
    };
    return GA4Client.getAuthorizationUrl(ga4Config, state);
  }

  /**
   * Exchange OAuth code for tokens
   */
  static override async handleOAuthCallback(
    config: OAuthConfig,
    code: string
  ): Promise<OAuthResult> {
    const ga4Config: GA4OAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: GA4_SCOPES,
    };
    
    const tokens = await GA4Client.exchangeCodeForTokens(ga4Config, code);
    
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

    const ga4Config: GA4OAuthConfig = {
      clientId,
      clientSecret,
      redirectUri: '', // Not needed for refresh
      scopes: GA4_SCOPES,
    };

    const tokens = await GA4Client.refreshAccessToken(
      ga4Config,
      this.config.credentials.refreshToken as string
    );

    // Update the client with new access token
    this.client.updateAccessToken(
      tokens.access_token,
      new Date(Date.now() + tokens.expires_in * 1000)
    );

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || (this.config.credentials.refreshToken as string),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    };
  }

  /**
   * Test connection to GA4
   */
  override async testConnection(): Promise<boolean> {
    this.logger.info('Testing GA4 connection');
    return this.client.testConnection();
  }

  /**
   * Full sync of all GA4 data
   */
  override async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting GA4 full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      sessions: 0,
      pageviews: 0,
      events: 0,
      trafficSources: 0,
      channels: 0,
      userAcquisition: 0,
      conversions: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      // 1. Sync sessions
      try {
        recordsProcessed.sessions = await syncGA4Sessions(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 sessions', {
          count: recordsProcessed.sessions,
        });
      } catch (error) {
        this.logger.error('Failed to sync sessions', error as Error);
        errors.push({
          type: 'session_sync_error',
          message: (error as Error).message,
        });
      }

      // 2. Sync pageviews
      try {
        recordsProcessed.pageviews = await syncGA4Pageviews(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 pageviews', {
          count: recordsProcessed.pageviews,
        });
      } catch (error) {
        this.logger.error('Failed to sync pageviews', error as Error);
        errors.push({
          type: 'pageview_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync events
      try {
        recordsProcessed.events = await syncGA4Events(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 events', {
          count: recordsProcessed.events,
        });
      } catch (error) {
        this.logger.error('Failed to sync events', error as Error);
        errors.push({
          type: 'event_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync traffic sources
      try {
        recordsProcessed.trafficSources = await syncGA4TrafficSources(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 traffic sources', {
          count: recordsProcessed.trafficSources,
        });
      } catch (error) {
        this.logger.error('Failed to sync traffic sources', error as Error);
        errors.push({
          type: 'traffic_source_sync_error',
          message: (error as Error).message,
        });
      }

      // 5. Sync channels
      try {
        recordsProcessed.channels = await syncGA4Channels(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 channels', {
          count: recordsProcessed.channels,
        });
      } catch (error) {
        this.logger.error('Failed to sync channels', error as Error);
        errors.push({
          type: 'channel_sync_error',
          message: (error as Error).message,
        });
      }

      // 6. Sync user acquisition
      try {
        recordsProcessed.userAcquisition = await syncGA4UserAcquisition(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 user acquisition', {
          count: recordsProcessed.userAcquisition,
        });
      } catch (error) {
        this.logger.error('Failed to sync user acquisition', error as Error);
        errors.push({
          type: 'user_acquisition_sync_error',
          message: (error as Error).message,
        });
      }

      // 7. Sync conversions
      try {
        recordsProcessed.conversions = await syncGA4Conversions(
          this.client,
          this.config.workspaceId,
          this.config.id
        );
        this.logger.info('Synced GA4 conversions', {
          count: recordsProcessed.conversions,
        });
      } catch (error) {
        this.logger.error('Failed to sync conversions', error as Error);
        errors.push({
          type: 'conversion_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('GA4 full sync completed', {
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
      this.logger.error('GA4 full sync failed', error as Error);
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
    this.logger.info('Starting GA4 incremental sync', {
      workspaceId: this.config.workspaceId,
      since: since.toISOString(),
    });

    const recordsProcessed = {
      sessions: 0,
      pageviews: 0,
      events: 0,
      trafficSources: 0,
      channels: 0,
      userAcquisition: 0,
      conversions: 0,
    };

    const errors: SyncResult['errors'] = [];
    const syncOptions = { startDate: since, endDate: new Date() };

    try {
      // 1. Sync sessions
      try {
        recordsProcessed.sessions = await syncGA4Sessions(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync sessions', error as Error);
        errors.push({
          type: 'session_sync_error',
          message: (error as Error).message,
        });
      }

      // 2. Sync pageviews
      try {
        recordsProcessed.pageviews = await syncGA4Pageviews(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync pageviews', error as Error);
        errors.push({
          type: 'pageview_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync events
      try {
        recordsProcessed.events = await syncGA4Events(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync events', error as Error);
        errors.push({
          type: 'event_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync traffic sources
      try {
        recordsProcessed.trafficSources = await syncGA4TrafficSources(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync traffic sources', error as Error);
        errors.push({
          type: 'traffic_source_sync_error',
          message: (error as Error).message,
        });
      }

      // 5. Sync channels
      try {
        recordsProcessed.channels = await syncGA4Channels(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync channels', error as Error);
        errors.push({
          type: 'channel_sync_error',
          message: (error as Error).message,
        });
      }

      // 6. Sync user acquisition
      try {
        recordsProcessed.userAcquisition = await syncGA4UserAcquisition(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync user acquisition', error as Error);
        errors.push({
          type: 'user_acquisition_sync_error',
          message: (error as Error).message,
        });
      }

      // 7. Sync conversions
      try {
        recordsProcessed.conversions = await syncGA4Conversions(
          this.client,
          this.config.workspaceId,
          this.config.id,
          syncOptions
        );
      } catch (error) {
        this.logger.error('Failed to sync conversions', error as Error);
        errors.push({
          type: 'conversion_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('GA4 incremental sync completed', {
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
      this.logger.error('GA4 incremental sync failed', error as Error);
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



