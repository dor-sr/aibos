import { createLogger, type Logger } from '@aibos/core';
import type { ConnectorConfig, SyncResult, OAuthConfig, OAuthResult } from './types';

/**
 * Base connector class that all connectors extend
 */
export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected logger: Logger;

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.logger = createLogger(`connector:${config.type}`);
  }

  /**
   * Get the connector type
   */
  abstract get type(): string;

  /**
   * Test the connection to the external service
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Perform a full sync of all data
   */
  abstract fullSync(): Promise<SyncResult>;

  /**
   * Perform an incremental sync since last sync
   */
  abstract incrementalSync(since: Date): Promise<SyncResult>;

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl?(config: OAuthConfig, state: string, ...args: unknown[]): string;

  /**
   * Exchange OAuth code for tokens
   */
  static handleOAuthCallback?(
    config: OAuthConfig,
    code: string,
    ...args: unknown[]
  ): Promise<OAuthResult>;

  /**
   * Refresh OAuth tokens
   */
  abstract refreshTokens?(): Promise<OAuthResult>;
}

