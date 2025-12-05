// API Key Authentication middleware for public API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { ApiScope, hasScope, hasAllScopes } from './scopes';
import { createApiError } from './response';
import { checkRateLimit, RateLimitResult } from './rate-limit';

// API Key prefix for identification
export const API_KEY_PREFIX = 'aibos_';

// Context passed to API handlers after authentication
export interface ApiAuthContext {
  apiKeyId: string;
  workspaceId: string;
  scopes: string[];
  rateLimitTier: 'free' | 'starter' | 'pro' | 'enterprise';
  rateLimit: RateLimitResult;
}

// Authentication result
export type AuthResult = 
  | { success: true; context: ApiAuthContext }
  | { success: false; error: NextResponse };

// Hash API key for storage comparison
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate a new API key
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `${API_KEY_PREFIX}${randomBytes}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12);
  
  return { key, hash, prefix };
}

// Extract API key from request headers
function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header first (preferred)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Support both "Bearer <key>" and "<key>" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return authHeader;
  }
  
  // Check X-API-Key header as fallback
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }
  
  // Check query parameter as last resort (not recommended for production)
  const url = new URL(request.url);
  const apiKeyParam = url.searchParams.get('api_key');
  if (apiKeyParam) {
    return apiKeyParam;
  }
  
  return null;
}

// Validate API key format
function isValidApiKeyFormat(key: string): boolean {
  // API key should start with prefix and be 70 chars (6 prefix + 64 hex)
  return key.startsWith(API_KEY_PREFIX) && key.length === 70;
}

// Authenticate API request
export async function authenticateApiKey(
  request: NextRequest,
  requiredScopes?: ApiScope[]
): Promise<AuthResult> {
  const startTime = Date.now();
  
  // Extract API key
  const apiKey = extractApiKey(request);
  
  if (!apiKey) {
    return {
      success: false,
      error: createApiError(
        'API key required. Provide via Authorization header or X-API-Key header.',
        'UNAUTHORIZED',
        401
      ),
    };
  }
  
  // Validate format
  if (!isValidApiKeyFormat(apiKey)) {
    return {
      success: false,
      error: createApiError(
        'Invalid API key format.',
        'INVALID_API_KEY',
        401
      ),
    };
  }
  
  // Create Supabase client with service role for key validation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return {
      success: false,
      error: createApiError(
        'Server configuration error.',
        'INTERNAL_ERROR',
        500
      ),
    };
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Hash the key for lookup
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.substring(0, 12);
  
  // Lookup API key in database
  const { data: keyRecord, error: lookupError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .single();
  
  if (lookupError || !keyRecord) {
    return {
      success: false,
      error: createApiError(
        'Invalid API key.',
        'INVALID_API_KEY',
        401
      ),
    };
  }
  
  // Check if key is active
  if (keyRecord.status !== 'active') {
    return {
      success: false,
      error: createApiError(
        `API key is ${keyRecord.status}.`,
        'API_KEY_INACTIVE',
        401
      ),
    };
  }
  
  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    // Update key status to expired
    await supabase
      .from('api_keys')
      .update({ status: 'expired' })
      .eq('id', keyRecord.id);
    
    return {
      success: false,
      error: createApiError(
        'API key has expired.',
        'API_KEY_EXPIRED',
        401
      ),
    };
  }
  
  // Check required scopes
  const keyScopes = keyRecord.scopes as string[] || [];
  
  if (requiredScopes && requiredScopes.length > 0) {
    if (!hasAllScopes(keyScopes, requiredScopes)) {
      return {
        success: false,
        error: createApiError(
          `Missing required scope(s): ${requiredScopes.filter(s => !hasScope(keyScopes, s)).join(', ')}`,
          'INSUFFICIENT_SCOPE',
          403
        ),
      };
    }
  }
  
  // Check rate limit
  const rateLimit = await checkRateLimit(
    keyRecord.id,
    keyRecord.rate_limit_tier,
    keyRecord.rate_limit_override
  );
  
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: createApiError(
        'Rate limit exceeded. Please slow down your requests.',
        'RATE_LIMIT_EXCEEDED',
        429,
        {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
        }
      ),
    };
  }
  
  // Update last used timestamp (non-blocking)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {});
  
  // Log API usage (non-blocking)
  const responseTimeMs = Date.now() - startTime;
  const url = new URL(request.url);
  
  supabase
    .from('api_usage')
    .insert({
      api_key_id: keyRecord.id,
      workspace_id: keyRecord.workspace_id,
      endpoint: url.pathname,
      method: request.method,
      status_code: 200, // Will be updated by response handler if different
      response_time_ms: responseTimeMs,
      user_agent: request.headers.get('user-agent') || undefined,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                  request.headers.get('x-real-ip') || 
                  undefined,
    })
    .then(() => {});
  
  return {
    success: true,
    context: {
      apiKeyId: keyRecord.id,
      workspaceId: keyRecord.workspace_id,
      scopes: keyScopes,
      rateLimitTier: keyRecord.rate_limit_tier,
      rateLimit,
    },
  };
}

// Higher-order function to protect API routes
export function withApiAuth(
  handler: (request: NextRequest, context: ApiAuthContext) => Promise<NextResponse>,
  options?: { requiredScopes?: ApiScope[] }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateApiKey(request, options?.requiredScopes);
    
    if (!authResult.success) {
      return authResult.error;
    }
    
    // Add rate limit headers to successful response
    const response = await handler(request, authResult.context);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', authResult.context.rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', authResult.context.rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', authResult.context.rateLimit.resetAt.toISOString());
    
    return response;
  };
}

