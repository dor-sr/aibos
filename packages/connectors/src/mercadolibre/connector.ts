/**
 * MercadoLibre Connector Implementation
 */

import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from '../types';
import { MercadoLibreClient } from './client';
import { syncMercadoLibreOrders } from './orders';
import { syncMercadoLibreListings } from './listings';
import { syncMercadoLibreQuestions } from './questions';
import type { MercadoLibreSiteId } from './types';

/**
 * MercadoLibre connector implementation
 */
export class MercadoLibreConnector extends BaseConnector {
  private client: MercadoLibreClient;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.userId || !config.credentials.accessToken) {
      throw new Error('MercadoLibre connector requires userId and accessToken');
    }

    const siteId = (config.credentials.siteId as MercadoLibreSiteId) || 'MLA';

    this.client = new MercadoLibreClient({
      userId: config.credentials.userId as string,
      accessToken: config.credentials.accessToken as string,
      refreshToken: config.credentials.refreshToken as string | undefined,
      siteId,
    });
  }

  get type(): string {
    return 'mercadolibre';
  }

  /**
   * Test connection to MercadoLibre
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Full sync of all MercadoLibre data
   */
  async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting MercadoLibre full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      orders: 0,
      products: 0,
      questions: 0,
    };

    try {
      // Sync listings (products) first
      recordsProcessed.products = await syncMercadoLibreListings(
        this.client,
        this.config.workspaceId
      );

      // Sync orders
      recordsProcessed.orders = await syncMercadoLibreOrders(
        this.client,
        this.config.workspaceId
      );

      // Sync questions
      recordsProcessed.questions = await syncMercadoLibreQuestions(
        this.client,
        this.config.workspaceId
      );

      this.logger.info('MercadoLibre full sync completed', {
        workspaceId: this.config.workspaceId,
        recordsProcessed,
      });

      return {
        success: true,
        recordsProcessed,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('MercadoLibre full sync failed', error as Error);
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
  async incrementalSync(since: Date): Promise<SyncResult> {
    const startedAt = new Date();
    const sinceISO = since.toISOString();

    this.logger.info('Starting MercadoLibre incremental sync', {
      workspaceId: this.config.workspaceId,
      since: sinceISO,
    });

    const recordsProcessed = {
      orders: 0,
      products: 0,
      questions: 0,
    };

    try {
      // For MercadoLibre, we can only filter orders by date
      // Products and questions need full sync
      recordsProcessed.orders = await syncMercadoLibreOrders(
        this.client,
        this.config.workspaceId,
        { sinceDate: sinceISO }
      );

      // Questions - only sync unanswered (incremental by nature)
      recordsProcessed.questions = await syncMercadoLibreQuestions(
        this.client,
        this.config.workspaceId
      );

      this.logger.info('MercadoLibre incremental sync completed', {
        workspaceId: this.config.workspaceId,
        recordsProcessed,
      });

      return {
        success: true,
        recordsProcessed,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('MercadoLibre incremental sync failed', error as Error);
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
   * Get MercadoLibre OAuth authorization URL
   */
  static override getAuthorizationUrl(config: OAuthConfig, state: string): string {
    return MercadoLibreClient.getAuthorizationUrl(
      {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
      },
      state
    );
  }

  /**
   * Exchange OAuth code for access token
   */
  static override async handleOAuthCallback(
    config: OAuthConfig,
    code: string
  ): Promise<OAuthResult> {
    const tokens = await MercadoLibreClient.exchangeCodeForTokens(
      {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
      },
      code
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope,
      // Store user_id as shopDomain for consistency
      shopDomain: String(tokens.user_id),
    };
  }

  /**
   * Refresh OAuth tokens
   */
  override async refreshTokens(): Promise<OAuthResult> {
    const refreshToken = this.config.credentials.refreshToken as string;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokens = await MercadoLibreClient.refreshAccessToken(
      {
        clientId: process.env.MERCADOLIBRE_CLIENT_ID || '',
        clientSecret: process.env.MERCADOLIBRE_CLIENT_SECRET || '',
        redirectUri: process.env.MERCADOLIBRE_REDIRECT_URI || '',
      },
      refreshToken
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope,
      shopDomain: String(tokens.user_id),
    };
  }

  /**
   * Get user/seller information
   */
  async getUserInfo() {
    return this.client.getUser();
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    return this.client.getCurrentUser();
  }
}
