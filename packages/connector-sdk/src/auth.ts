// Authentication utilities for connectors

import { AuthConfig, OAuth2Config } from './types';

/**
 * OAuth2 flow helper
 */
export class OAuth2Helper {
  private config: OAuth2Config;
  private baseUrl: string;

  constructor(config: OAuth2Config, baseUrl: string) {
    this.config = config;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
    extraParams?: Record<string, string>;
  }): string {
    const url = new URL(this.config.authorizationUrl);
    
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', params.state);
    
    if (this.config.scopes.length > 0) {
      url.searchParams.set('scope', this.config.scopes.join(' '));
    }
    
    if (params.extraParams) {
      Object.entries(params.extraParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  }> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: params.refreshToken,
        client_id: params.clientId,
        client_secret: params.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || params.refreshToken,
      expiresIn: data.expires_in,
    };
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(
  key: string,
  pattern?: string
): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  if (pattern) {
    const regex = new RegExp(pattern);
    if (!regex.test(key)) {
      return { valid: false, error: 'API key format is invalid' };
    }
  }

  return { valid: true };
}

/**
 * Mask sensitive credentials for logging
 */
export function maskCredentials(
  credentials: Record<string, string>
): Record<string, string> {
  const masked: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('password')
    ) {
      if (value.length > 8) {
        masked[key] = value.substring(0, 4) + '...' + value.slice(-4);
      } else {
        masked[key] = '***';
      }
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Build auth configuration from definition
 */
export function buildAuthConfig(auth: AuthConfig): {
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    helpText?: string;
  }>;
} {
  const fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    helpText?: string;
  }> = [];

  switch (auth.type) {
    case 'api_key':
      fields.push({
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        helpText: 'Your API key from the provider dashboard',
      });
      break;

    case 'basic':
      fields.push(
        {
          name: 'username',
          label: auth.basicAuth?.usernameField || 'Username',
          type: 'text',
          required: true,
        },
        {
          name: 'password',
          label: auth.basicAuth?.passwordField || 'Password',
          type: 'password',
          required: true,
        }
      );
      break;

    case 'bearer':
      fields.push({
        name: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your access token',
      });
      break;

    case 'oauth2':
      // OAuth2 is handled separately via OAuth flow
      break;

    case 'custom':
      if (auth.customFields) {
        fields.push(
          ...auth.customFields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            placeholder: f.placeholder,
            helpText: f.helpText,
          }))
        );
      }
      break;
  }

  return { fields };
}
