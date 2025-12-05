// Public API v1 - API Key Management
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  createApiSuccess, 
  createApiError, 
  parsePagination 
} from '@/lib/api/response';
import { 
  generateApiKey, 
  hashApiKey 
} from '@/lib/api/auth';
import { 
  DEFAULT_SCOPES_BY_TIER, 
  isValidScope,
  type ApiScope 
} from '@/lib/api/scopes';
import { RATE_LIMITS } from '@/lib/api/rate-limit';

// GET - List API keys for workspace (requires auth session, not API key)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  
  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return createApiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  // Get workspace ID from query or user's default workspace
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get('workspace_id');
  
  if (!workspaceId) {
    return createApiError('workspace_id is required', 'MISSING_PARAMETER', 400);
  }
  
  // Verify user has access to workspace
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();
  
  if (membershipError || !membership) {
    return createApiError('Workspace not found or access denied', 'NOT_FOUND', 404);
  }
  
  // Get pagination params
  const { page, pageSize, offset } = parsePagination(searchParams);
  
  // List API keys (without revealing the actual keys)
  const { data: keys, error: keysError, count } = await supabase
    .from('api_keys')
    .select('id, name, description, key_prefix, scopes, rate_limit_tier, status, expires_at, last_used_at, created_at', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (keysError) {
    console.error('Error fetching API keys:', keysError);
    return createApiError('Failed to fetch API keys', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    keys?.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      keyPrefix: key.key_prefix,
      scopes: key.scopes,
      rateLimitTier: key.rate_limit_tier,
      status: key.status,
      expiresAt: key.expires_at,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
    })) || [],
    {
      page,
      pageSize,
      total: count || 0,
      hasMore: count ? offset + pageSize < count : false,
    }
  );
}

// POST - Create a new API key (requires auth session)
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  
  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return createApiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  // Parse request body
  let body: {
    workspace_id: string;
    name: string;
    description?: string;
    scopes?: string[];
    rate_limit_tier?: 'free' | 'starter' | 'pro' | 'enterprise';
    expires_in_days?: number;
  };
  
  try {
    body = await request.json();
  } catch {
    return createApiError('Invalid JSON body', 'VALIDATION_ERROR', 400);
  }
  
  // Validate required fields
  if (!body.workspace_id) {
    return createApiError('workspace_id is required', 'MISSING_PARAMETER', 400);
  }
  
  if (!body.name || body.name.trim().length === 0) {
    return createApiError('name is required', 'MISSING_PARAMETER', 400);
  }
  
  // Verify user has admin access to workspace
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', body.workspace_id)
    .eq('user_id', user.id)
    .single();
  
  if (membershipError || !membership) {
    return createApiError('Workspace not found or access denied', 'NOT_FOUND', 404);
  }
  
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return createApiError('Admin access required to create API keys', 'INSUFFICIENT_SCOPE', 403);
  }
  
  // Validate scopes if provided
  const tier = body.rate_limit_tier || 'free';
  let scopes = body.scopes;
  
  if (scopes && scopes.length > 0) {
    const invalidScopes = scopes.filter(s => !isValidScope(s));
    if (invalidScopes.length > 0) {
      return createApiError(
        `Invalid scope(s): ${invalidScopes.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }
  } else {
    // Use default scopes for tier
    scopes = DEFAULT_SCOPES_BY_TIER[tier] as string[];
  }
  
  // Generate API key
  const { key, hash, prefix } = generateApiKey();
  
  // Calculate expiration
  let expiresAt: Date | null = null;
  if (body.expires_in_days && body.expires_in_days > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.expires_in_days);
  }
  
  // Create service client for insert
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Insert API key
  const { data: newKey, error: insertError } = await serviceClient
    .from('api_keys')
    .insert({
      workspace_id: body.workspace_id,
      created_by_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      key_hash: hash,
      key_prefix: prefix,
      scopes,
      rate_limit_tier: tier,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select('id, name, description, key_prefix, scopes, rate_limit_tier, status, expires_at, created_at')
    .single();
  
  if (insertError) {
    console.error('Error creating API key:', insertError);
    return createApiError('Failed to create API key', 'INTERNAL_ERROR', 500);
  }
  
  // Return the key only on creation (never shown again)
  return createApiSuccess({
    id: newKey.id,
    name: newKey.name,
    description: newKey.description,
    key: key, // Only shown once!
    keyPrefix: newKey.key_prefix,
    scopes: newKey.scopes,
    rateLimitTier: newKey.rate_limit_tier,
    rateLimitInfo: {
      requestsPerMinute: RATE_LIMITS[tier],
    },
    status: newKey.status,
    expiresAt: newKey.expires_at,
    createdAt: newKey.created_at,
    warning: 'Store this API key securely. It will not be shown again.',
  });
}

// DELETE - Revoke an API key (requires auth session)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();
  
  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return createApiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  // Get key ID from query
  const searchParams = request.nextUrl.searchParams;
  const keyId = searchParams.get('id');
  
  if (!keyId) {
    return createApiError('API key id is required', 'MISSING_PARAMETER', 400);
  }
  
  // Get the key to verify workspace access
  const { data: apiKey, error: keyError } = await supabase
    .from('api_keys')
    .select('id, workspace_id')
    .eq('id', keyId)
    .single();
  
  if (keyError || !apiKey) {
    return createApiError('API key not found', 'NOT_FOUND', 404);
  }
  
  // Verify user has admin access to workspace
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', apiKey.workspace_id)
    .eq('user_id', user.id)
    .single();
  
  if (membershipError || !membership) {
    return createApiError('Workspace not found or access denied', 'NOT_FOUND', 404);
  }
  
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return createApiError('Admin access required to revoke API keys', 'INSUFFICIENT_SCOPE', 403);
  }
  
  // Revoke the key (soft delete)
  const { error: updateError } = await supabase
    .from('api_keys')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', keyId);
  
  if (updateError) {
    console.error('Error revoking API key:', updateError);
    return createApiError('Failed to revoke API key', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess({ revoked: true, id: keyId });
}

