import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from '../types';
import { ShopifyClient } from './client';
import { syncOrders } from './orders';
import { syncProducts } from './products';
import { syncCustomers } from './customers';

/**
 * Shopify connector implementation
 */
export class ShopifyConnector extends BaseConnector {
  private client: ShopifyClient;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.shopDomain || !config.credentials.accessToken) {
      throw new Error('Shopify connector requires shopDomain and accessToken');
    }

    this.client = new ShopifyClient({
      shopDomain: config.credentials.shopDomain as string,
      accessToken: config.credentials.accessToken as string,
    });
  }

  get type(): string {
    return 'shopify';
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Full sync of all Shopify data
   */
  async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Shopify full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      orders: 0,
      customers: 0,
      products: 0,
    };

    try {
      // Sync customers first (orders reference them)
      recordsProcessed.customers = await syncCustomers(
        this.client,
        this.config.workspaceId
      );

      // Sync products
      recordsProcessed.products = await syncProducts(
        this.client,
        this.config.workspaceId
      );

      // Sync orders
      recordsProcessed.orders = await syncOrders(
        this.client,
        this.config.workspaceId
      );

      this.logger.info('Shopify full sync completed', {
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
      this.logger.error('Shopify full sync failed', error as Error);
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

    this.logger.info('Starting Shopify incremental sync', {
      workspaceId: this.config.workspaceId,
      since: sinceISO,
    });

    const recordsProcessed = {
      orders: 0,
      customers: 0,
      products: 0,
    };

    try {
      // Sync only records updated since last sync
      recordsProcessed.customers = await syncCustomers(
        this.client,
        this.config.workspaceId,
        { createdAtMin: sinceISO }
      );

      recordsProcessed.products = await syncProducts(
        this.client,
        this.config.workspaceId,
        { createdAtMin: sinceISO }
      );

      recordsProcessed.orders = await syncOrders(
        this.client,
        this.config.workspaceId,
        { createdAtMin: sinceISO }
      );

      this.logger.info('Shopify incremental sync completed', {
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
      this.logger.error('Shopify incremental sync failed', error as Error);
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
   * Get Shopify OAuth authorization URL
   */
  static override getAuthorizationUrl(config: OAuthConfig, state: string, shop: string): string {
    const scopes = config.scopes.join(',');
    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: scopes,
      redirect_uri: config.redirectUri,
      state,
    });

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  static override async handleOAuthCallback(
    config: OAuthConfig,
    code: string,
    shop: string
  ): Promise<OAuthResult> {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange OAuth code: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      scope: data.scope,
      shopDomain: shop,
    };
  }

  /**
   * Shopify access tokens don't expire, so this is a no-op
   */
  override async refreshTokens(): Promise<OAuthResult> {
    return {
      accessToken: this.config.credentials.accessToken as string,
      shopDomain: this.config.credentials.shopDomain as string,
    };
  }
}

