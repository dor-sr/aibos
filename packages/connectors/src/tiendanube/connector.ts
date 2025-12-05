/**
 * Tiendanube Connector Implementation
 */

import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from '../types';
import { TiendanubeClient } from './client';
import { syncTiendanubeOrders } from './orders';
import { syncTiendanubeProducts } from './products';
import { syncTiendanubeCustomers } from './customers';
import type { TiendanubeOAuthConfig, TiendanubeTokenResponse } from './types';

// Tiendanube OAuth URLs
const TIENDANUBE_AUTH_URL = 'https://www.tiendanube.com/apps/authorize/token';
const TIENDANUBE_TOKEN_URL = 'https://www.tiendanube.com/apps/authorize/token';

// Default scopes for Tiendanube app
export const TIENDANUBE_SCOPES = [
  'read_products',
  'write_products',
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_content',
  'read_shipping',
];

/**
 * Tiendanube connector implementation
 */
export class TiendanubeConnector extends BaseConnector {
  private client: TiendanubeClient;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.storeId || !config.credentials.accessToken) {
      throw new Error('Tiendanube connector requires storeId and accessToken');
    }

    this.client = new TiendanubeClient({
      storeId: config.credentials.storeId as string,
      accessToken: config.credentials.accessToken as string,
    });
  }

  get type(): string {
    return 'tiendanube';
  }

  /**
   * Test connection to Tiendanube
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Full sync of all Tiendanube data
   */
  async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Tiendanube full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      orders: 0,
      customers: 0,
      products: 0,
    };

    try {
      // Sync customers first (orders reference them)
      recordsProcessed.customers = await syncTiendanubeCustomers(
        this.client,
        this.config.workspaceId
      );

      // Sync products
      recordsProcessed.products = await syncTiendanubeProducts(
        this.client,
        this.config.workspaceId
      );

      // Sync orders
      recordsProcessed.orders = await syncTiendanubeOrders(
        this.client,
        this.config.workspaceId
      );

      this.logger.info('Tiendanube full sync completed', {
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
      this.logger.error('Tiendanube full sync failed', error as Error);
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

    this.logger.info('Starting Tiendanube incremental sync', {
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
      recordsProcessed.customers = await syncTiendanubeCustomers(
        this.client,
        this.config.workspaceId,
        { updatedAtMin: sinceISO }
      );

      recordsProcessed.products = await syncTiendanubeProducts(
        this.client,
        this.config.workspaceId,
        { updatedAtMin: sinceISO }
      );

      recordsProcessed.orders = await syncTiendanubeOrders(
        this.client,
        this.config.workspaceId,
        { updatedAtMin: sinceISO }
      );

      this.logger.info('Tiendanube incremental sync completed', {
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
      this.logger.error('Tiendanube incremental sync failed', error as Error);
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
   * Get Tiendanube OAuth authorization URL
   */
  static override getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      state,
    });

    return `${TIENDANUBE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  static override async handleOAuthCallback(
    config: OAuthConfig,
    code: string
  ): Promise<OAuthResult> {
    const response = await fetch(TIENDANUBE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange OAuth code: ${error}`);
    }

    const data: TiendanubeTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      scope: data.scope,
      // Tiendanube returns user_id which is the store ID
      shopDomain: String(data.user_id),
    };
  }

  /**
   * Tiendanube access tokens don't expire, so this is a no-op
   */
  override async refreshTokens(): Promise<OAuthResult> {
    return {
      accessToken: this.config.credentials.accessToken as string,
      shopDomain: this.config.credentials.storeId as string,
    };
  }

  /**
   * Register webhooks for real-time updates
   */
  async registerWebhooks(baseUrl: string): Promise<void> {
    await this.client.registerWebhooks(baseUrl);
    this.logger.info('Tiendanube webhooks registered', {
      workspaceId: this.config.workspaceId,
      baseUrl,
    });
  }

  /**
   * Get store information
   */
  async getStoreInfo() {
    return this.client.getStore();
  }
}
