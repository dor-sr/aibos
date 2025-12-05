// Base Connector Class
// Extend this class to create custom connectors

import {
  ConnectorDefinition,
  ConnectorContext,
  SyncResult,
  WebhookResult,
  EntityDefinition,
  SyncError,
} from './types';

/**
 * Base class for all connectors.
 * Extend this class and implement the required methods.
 */
export abstract class BaseConnector {
  protected definition: ConnectorDefinition;
  protected context: ConnectorContext | null = null;

  constructor(definition: ConnectorDefinition) {
    this.definition = definition;
  }

  /**
   * Get connector metadata
   */
  getMetadata() {
    return this.definition.metadata;
  }

  /**
   * Get connector definition
   */
  getDefinition() {
    return this.definition;
  }

  /**
   * Initialize the connector with context
   */
  initialize(context: ConnectorContext): void {
    this.context = context;
  }

  /**
   * Validate credentials
   * @returns true if credentials are valid
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Test connection to the data source
   * @returns Connection test result
   */
  abstract testConnection(): Promise<{
    success: boolean;
    message?: string;
    details?: Record<string, unknown>;
  }>;

  /**
   * Sync a specific entity
   * @param entity Entity definition to sync
   * @param options Sync options (incremental, cursor, etc.)
   */
  abstract syncEntity(
    entity: EntityDefinition,
    options?: {
      incremental?: boolean;
      cursor?: string;
      since?: Date;
      pageSize?: number;
    }
  ): Promise<SyncResult>;

  /**
   * Sync all entities
   * @param options Sync options
   */
  async syncAll(options?: {
    incremental?: boolean;
    since?: Date;
  }): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const entity of this.definition.entities) {
      try {
        const result = await this.syncEntity(entity, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          entity: entity.name,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsDeleted: 0,
          errors: [
            {
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'SYNC_ERROR',
            },
          ],
          hasMore: false,
        });
      }
    }

    return results;
  }

  /**
   * Process incoming webhook
   * @param event Event type from provider
   * @param payload Webhook payload
   * @param headers Request headers
   */
  async processWebhook(
    event: string,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    // Find matching webhook definition
    const webhookDef = this.definition.webhooks?.find(
      (w) => w.providerEvent === event
    );

    if (!webhookDef) {
      return {
        processed: false,
        event,
        error: `Unknown webhook event: ${event}`,
      };
    }

    // Verify signature if configured
    if (webhookDef.signature) {
      const isValid = await this.verifyWebhookSignature(
        payload,
        headers,
        webhookDef.signature
      );

      if (!isValid) {
        return {
          processed: false,
          event,
          error: 'Invalid webhook signature',
        };
      }
    }

    // Process the webhook
    return this.handleWebhookEvent(webhookDef.internalEvent, payload);
  }

  /**
   * Handle a specific webhook event
   * Override this method to implement custom webhook handling
   */
  protected async handleWebhookEvent(
    internalEvent: string,
    payload: unknown
  ): Promise<WebhookResult> {
    // Default implementation - override in subclass
    return {
      processed: true,
      event: internalEvent,
    };
  }

  /**
   * Verify webhook signature
   */
  protected async verifyWebhookSignature(
    payload: unknown,
    headers: Record<string, string>,
    config: NonNullable<
      ConnectorDefinition['webhooks']
    >[number]['signature']
  ): Promise<boolean> {
    if (!config) return true;

    // Get signature from header
    const signature = headers[config.header.toLowerCase()];
    if (!signature) return false;

    // Get secret from config
    const secret = this.context?.config[config.secret] as string;
    if (!secret) return false;

    // Compute expected signature
    const crypto = await import('crypto');
    const payloadString =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac(config.algorithm, secret)
      .update(payloadString)
      .digest('hex');

    // Compare (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  /**
   * Make an API request to the data source
   */
  protected async makeRequest<T>(
    endpointName: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const endpoint = this.definition.endpoints.find(
      (e) => e.name === endpointName
    );

    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${endpointName}`);
    }

    // Build URL
    let url = this.buildUrl(endpoint.path, params);

    // Add query params
    if (endpoint.queryParams || params) {
      const searchParams = new URLSearchParams();
      if (endpoint.queryParams) {
        Object.entries(endpoint.queryParams).forEach(([key, value]) => {
          searchParams.append(key, value);
        });
      }
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && typeof value !== 'object') {
            searchParams.append(key, String(value));
          }
        });
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const headers = await this.buildHeaders();

    // Make request
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body:
        endpoint.method !== 'GET' && params
          ? JSON.stringify(params)
          : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Build URL with path parameters
   */
  protected buildUrl(
    path: string,
    params?: Record<string, unknown>
  ): string {
    let url = path;

    if (params) {
      // Replace path parameters
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, String(value));
      });
    }

    return url;
  }

  /**
   * Build request headers with authentication
   */
  protected async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const auth = this.definition.auth;
    const credentials = this.context?.credentials || {};

    switch (auth.type) {
      case 'api_key':
        if (auth.apiKey?.headerName) {
          const prefix = auth.apiKey.prefix || '';
          headers[auth.apiKey.headerName] =
            prefix + (credentials.api_key || '');
        }
        break;

      case 'bearer':
        headers['Authorization'] =
          `Bearer ${credentials.access_token || credentials.api_key || ''}`;
        break;

      case 'basic':
        const username = credentials.username || '';
        const password = credentials.password || '';
        const encoded = Buffer.from(`${username}:${password}`).toString(
          'base64'
        );
        headers['Authorization'] = `Basic ${encoded}`;
        break;

      case 'oauth2':
        headers['Authorization'] =
          `Bearer ${credentials.access_token || ''}`;
        break;
    }

    return headers;
  }

  /**
   * Log a message using the connector logger
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, unknown>
  ): void {
    if (this.context?.logger) {
      this.context.logger[level](message, meta);
    } else {
      console[level](
        `[${this.definition.metadata.name}] ${message}`,
        meta || ''
      );
    }
  }

  /**
   * Create a sync error object
   */
  protected createError(
    message: string,
    code: string,
    recordId?: string,
    field?: string
  ): SyncError {
    return { message, code, recordId, field };
  }
}
