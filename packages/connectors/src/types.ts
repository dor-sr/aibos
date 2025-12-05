/**
 * Connector types and interfaces
 */

export type ConnectorType = 
  | 'shopify'
  | 'tiendanube'
  | 'woocommerce'
  | 'stripe'
  | 'ga4'
  | 'meta_ads'
  | 'google_ads'
  | 'tiktok_ads'
  | 'linkedin_ads';

export interface ConnectorConfig {
  id: string;
  type: ConnectorType;
  workspaceId: string;
  credentials: ConnectorCredentials;
  settings: ConnectorSettings;
}

export interface ConnectorCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  shopDomain?: string;
  apiKey?: string;
  apiSecret?: string;
  [key: string]: unknown;
}

export interface ConnectorSettings {
  syncInterval?: number; // minutes
  syncHistory?: boolean;
  [key: string]: unknown;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: {
    orders?: number;
    customers?: number;
    products?: number;
    subscriptions?: number;
    invoices?: number;
    [key: string]: number | undefined;
  };
  errors?: SyncError[];
  startedAt: Date;
  completedAt: Date;
}

export interface SyncError {
  type: string;
  message: string;
  recordId?: string;
  details?: Record<string, unknown>;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  shopDomain?: string;
}



