/**
 * Authentication utilities for connectors
 */

import type { OAuth2Config } from './types';

/**
 * OAuth2 authorization URL builder
 */
export function buildOAuth2AuthorizationUrl(
  config: OAuth2Config,
  state: string,
  additionalParams?: Record<string, string>
): string {
  const url = new URL(config.authorizationUrl);
  
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri || '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeOAuth2Code(
  config: OAuth2Config,
  code: string,
  redirectUri?: string
): Promise<OAuth2TokenResponse> {
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri || config.redirectUri || '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth2 token exchange failed: ${error}`);
  }

  return response.json() as Promise<OAuth2TokenResponse>;
}

/**
 * Refresh OAuth2 access token
 */
export async function refreshOAuth2Token(
  config: OAuth2Config,
  refreshToken: string
): Promise<OAuth2TokenResponse> {
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth2 token refresh failed: ${error}`);
  }

  return response.json() as Promise<OAuth2TokenResponse>;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Generate a secure random state parameter
 */
export function generateOAuth2State(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate OAuth2 state parameter
 */
export function validateOAuth2State(received: string, expected: string): boolean {
  if (received.length !== expected.length) {
    return false;
  }
  
  // Timing-safe comparison
  let result = 0;
  for (let i = 0; i < received.length; i++) {
    result |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Check if an OAuth2 token is expired
 */
export function isTokenExpired(
  issuedAt: Date,
  expiresIn: number,
  bufferSeconds: number = 60
): boolean {
  const expirationTime = issuedAt.getTime() + (expiresIn - bufferSeconds) * 1000;
  return Date.now() >= expirationTime;
}

/**
 * Create API key header
 */
export function createApiKeyHeader(
  apiKey: string,
  headerName: string = 'Authorization',
  prefix: string = 'Bearer'
): Record<string, string> {
  return {
    [headerName]: prefix ? `${prefix} ${apiKey}` : apiKey,
  };
}

/**
 * Create Basic Auth header
 */
export function createBasicAuthHeader(
  username: string,
  password: string
): Record<string, string> {
  const encoded = typeof Buffer !== 'undefined'
    ? Buffer.from(`${username}:${password}`).toString('base64')
    : btoa(`${username}:${password}`);
  
  return {
    'Authorization': `Basic ${encoded}`,
  };
}
