// Public API v1 - Embed Token Management
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  createApiSuccess, 
  createApiError,
  parsePagination,
} from '@/lib/api/response';

// Generate embed token
function generateEmbedToken(): { token: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const token = `embed_${randomBytes}`;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const prefix = token.substring(0, 12);
  
  return { token, hash, prefix };
}

// GET - List embed tokens (requires session auth)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return createApiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get('workspace_id');
  
  if (!workspaceId) {
    return createApiError('workspace_id is required', 'MISSING_PARAMETER', 400);
  }
  
  // Verify workspace access
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();
  
  if (!membership) {
    return createApiError('Workspace not found or access denied', 'NOT_FOUND', 404);
  }
  
  const { page, pageSize, offset } = parsePagination(searchParams);
  
  // List embed tokens
  const { data: tokens, error, count } = await supabase
    .from('embed_tokens')
    .select('id, name, description, token_prefix, allowed_domains, permissions, customization, status, expires_at, last_used_at, view_count, created_at', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (error) {
    console.error('Error fetching embed tokens:', error);
    return createApiError('Failed to fetch embed tokens', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    tokens?.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      tokenPrefix: t.token_prefix,
      allowedDomains: t.allowed_domains,
      permissions: t.permissions,
      customization: t.customization,
      status: t.status,
      expiresAt: t.expires_at,
      lastUsedAt: t.last_used_at,
      viewCount: t.view_count,
      createdAt: t.created_at,
    })) || [],
    {
      page,
      pageSize,
      total: count || 0,
      hasMore: count ? offset + pageSize < count : false,
    }
  );
}

// POST - Create embed token (requires session auth)
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return createApiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  let body: {
    workspace_id: string;
    name: string;
    description?: string;
    allowed_domains?: string[];
    permissions: {
      dashboards?: string[];
      metrics?: string[];
      charts?: string[];
    };
    customization?: {
      hideHeader?: boolean;
      hideBranding?: boolean;
      theme?: 'light' | 'dark' | 'auto';
      primaryColor?: string;
      fontFamily?: string;
    };
    expires_in_days?: number;
  };
  
  try {
    body = await request.json();
  } catch {
    return createApiError('Invalid JSON body', 'VALIDATION_ERROR', 400);
  }
  
  if (!body.workspace_id) {
    return createApiError('workspace_id is required', 'MISSING_PARAMETER', 400);
  }
  
  if (!body.name || body.name.trim().length === 0) {
    return createApiError('name is required', 'MISSING_PARAMETER', 400);
  }
  
  if (!body.permissions) {
    return createApiError('permissions is required', 'MISSING_PARAMETER', 400);
  }
  
  // Verify admin access
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', body.workspace_id)
    .eq('user_id', user.id)
    .single();
  
  if (!membership) {
    return createApiError('Workspace not found or access denied', 'NOT_FOUND', 404);
  }
  
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return createApiError('Admin access required', 'INSUFFICIENT_SCOPE', 403);
  }
  
  // Generate token
  const { token, hash, prefix } = generateEmbedToken();
  
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
  
  const { data: newToken, error: insertError } = await serviceClient
    .from('embed_tokens')
    .insert({
      workspace_id: body.workspace_id,
      created_by_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      token_hash: hash,
      token_prefix: prefix,
      allowed_domains: body.allowed_domains || [],
      permissions: body.permissions,
      customization: body.customization || null,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select('id, name, description, token_prefix, allowed_domains, permissions, customization, status, expires_at, created_at')
    .single();
  
  if (insertError) {
    console.error('Error creating embed token:', insertError);
    return createApiError('Failed to create embed token', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess({
    id: newToken.id,
    name: newToken.name,
    description: newToken.description,
    token: token, // Only shown once!
    tokenPrefix: newToken.token_prefix,
    allowedDomains: newToken.allowed_domains,
    permissions: newToken.permissions,
    customization: newToken.customization,
    status: newToken.status,
    expiresAt: newToken.expires_at,
    createdAt: newToken.created_at,
    embedUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/embed`,
    warning: 'Store this embed token securely. It will not be shown again.',
  });
}

// DELETE - Revoke embed token
export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return createApiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get('id');
  
  if (!tokenId) {
    return createApiError('Token id is required', 'MISSING_PARAMETER', 400);
  }
  
  // Get token to verify workspace
  const { data: token, error: tokenError } = await supabase
    .from('embed_tokens')
    .select('id, workspace_id')
    .eq('id', tokenId)
    .single();
  
  if (tokenError || !token) {
    return createApiError('Token not found', 'NOT_FOUND', 404);
  }
  
  // Verify admin access
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', token.workspace_id)
    .eq('user_id', user.id)
    .single();
  
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return createApiError('Admin access required', 'INSUFFICIENT_SCOPE', 403);
  }
  
  // Revoke token
  const { error: updateError } = await supabase
    .from('embed_tokens')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', tokenId);
  
  if (updateError) {
    console.error('Error revoking embed token:', updateError);
    return createApiError('Failed to revoke token', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess({ revoked: true, id: tokenId });
}
