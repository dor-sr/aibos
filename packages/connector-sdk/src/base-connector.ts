/**
 * Base Connector Class
 * 
 * Abstract base class that all custom connectors should extend.
 * Provides common functionality for authentication, data fetching, and syncing.
 */

import type {
  ConnectorDefinition,
  ConnectorState,
  ConnectionStatus,
  SyncResult,
  EntityType,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedProduct,
  NormalizedSubscription,
  NormalizedInvoice,
  WebhookEvent,
} from './types';

export type NormalizedEntity = 
  | NormalizedCustomer
  | NormalizedOrder
  | NormalizedProduct
  | NormalizedSubscription
  | NormalizedInvoice;

export interface FetchOptions {
  cursor?: string;
  limit?: number;
  since?: Date;
}

export interface FetchResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export abstract class BaseConnector {
  protected definition: ConnectorDefinition;
  protected state: ConnectorState;
  
  constructor(definition: ConnectorDefinition, state: ConnectorState) {
    this.definition = definition;
    this.state = state;
  }

  /**
   * Get connector metadata
   */
  getMetadata() {
    return this.definition.metadata;
  }

  /**
   * Get supported entity types
   */
  getSupportedEntities(): EntityType[] {
    return this.definition.sync.entities
      .filter(e => e.enabled)
      .map(e => e.type);
  }

  /**
   * Test the connection to the external service
   */
  abstract testConnection(): Promise<ConnectionStatus>;

  /**
   * Authenticate with the external service
   * Returns updated credentials (e.g., refreshed tokens)
   */
  abstract authenticate(): Promise<Record<string, unknown>>;

  /**
   * Refresh authentication (for OAuth2 token refresh)
   */
  abstract refreshAuth(): Promise<Record<string, unknown>>;

  /**
   * Fetch customers from the external service
   */
  abstract fetchCustomers(options?: FetchOptions): Promise<FetchResult<NormalizedCustomer>>;

  /**
   * Fetch orders from the external service
   */
  abstract fetchOrders(options?: FetchOptions): Promise<FetchResult<NormalizedOrder>>;

  /**
   * Fetch products from the external service
   */
  abstract fetchProducts(options?: FetchOptions): Promise<FetchResult<NormalizedProduct>>;

  /**
   * Fetch subscriptions from the external service (SaaS connectors)
   */
  abstract fetchSubscriptions(options?: FetchOptions): Promise<FetchResult<NormalizedSubscription>>;

  /**
   * Fetch invoices from the external service (SaaS connectors)
   */
  abstract fetchInvoices(options?: FetchOptions): Promise<FetchResult<NormalizedInvoice>>;

  /**
   * Process a webhook event
   */
  abstract processWebhook(event: WebhookEvent): Promise<NormalizedEntity | null>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhook(payload: string, signature: string): boolean;

  /**
   * Perform a full sync for an entity type
   */
  async fullSync(entityType: EntityType): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncResult['errors'] = [];
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let cursor: string | undefined;

    try {
      const fetchMethod = this.getFetchMethod(entityType);
      let hasMore = true;

      while (hasMore) {
        const result = await fetchMethod({ cursor, limit: 100 });
        
        recordsProcessed += result.data.length;
        recordsCreated += result.data.length; // In a real impl, check for updates

        cursor = result.nextCursor;
        hasMore = result.hasMore;
      }

      return {
        success: true,
        entityType,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsDeleted: 0,
        errors,
        durationMs: Date.now() - startTime,
        cursor,
      };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });

      return {
        success: false,
        entityType,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsDeleted: 0,
        errors,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Perform an incremental sync for an entity type
   */
  async incrementalSync(entityType: EntityType, since?: Date): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncResult['errors'] = [];
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let cursor = this.state.lastSyncCursors[entityType];

    try {
      const fetchMethod = this.getFetchMethod(entityType);
      let hasMore = true;

      while (hasMore) {
        const result = await fetchMethod({ cursor, limit: 100, since });
        
        recordsProcessed += result.data.length;
        recordsUpdated += result.data.length;

        cursor = result.nextCursor;
        hasMore = result.hasMore;
      }

      return {
        success: true,
        entityType,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsDeleted: 0,
        errors,
        durationMs: Date.now() - startTime,
        cursor,
      };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });

      return {
        success: false,
        entityType,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsDeleted: 0,
        errors,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get the appropriate fetch method for an entity type
   */
  private getFetchMethod(entityType: EntityType) {
    switch (entityType) {
      case 'customer':
        return this.fetchCustomers.bind(this);
      case 'order':
        return this.fetchOrders.bind(this);
      case 'product':
        return this.fetchProducts.bind(this);
      case 'subscription':
        return this.fetchSubscriptions.bind(this);
      case 'invoice':
        return this.fetchInvoices.bind(this);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Make an authenticated API request
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    
    // Add authentication
    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh auth
        await this.refreshAuth();
        // Retry request
        return this.makeRequest(url, options);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get the authorization header based on auth config
   */
  protected getAuthHeader(): string | null {
    const { auth } = this.definition;
    const credentials = this.state.credentials;

    switch (auth.type) {
      case 'api_key': {
        const prefix = auth.apiKey?.prefix || 'Bearer';
        const key = credentials.apiKey as string;
        return `${prefix} ${key}`;
      }
      case 'oauth2': {
        const accessToken = credentials.accessToken as string;
        return `Bearer ${accessToken}`;
      }
      case 'basic': {
        const username = credentials.username as string;
        const password = credentials.password as string;
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${encoded}`;
      }
      default:
        return null;
    }
  }
}
