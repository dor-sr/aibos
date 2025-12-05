// Public API v1 - Outbound Webhooks endpoint
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { 
  withApiAuth, 
  ApiAuthContext 
} from '@/lib/api/auth';
import { 
  createApiSuccess, 
  createApiError,
  parsePagination,
} from '@/lib/api/response';

// Available webhook event types
const WEBHOOK_EVENT_TYPES = [
  'anomaly.detected',
  'report.generated',
  'sync.completed',
  'sync.failed',
  'insight.created',
  'metric.threshold_exceeded',
  'connector.connected',
  'connector.disconnected',
] as const;

// Generate webhook secret
function generateWebhookSecret(): { secret: string; hash: string } {
  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(secret).digest('hex');
  return { secret, hash };
}

// GET - List webhook endpoints
async function getHandler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  
  const { page, pageSize, offset } = parsePagination(searchParams);
  const active = searchParams.get('active');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let query = supabase
    .from('webhook_endpoints')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (active !== null) {
    query = query.eq('is_active', active === 'true');
  }
  
  const { data: endpoints, error, count } = await query;
  
  if (error) {
    console.error('Error fetching webhooks:', error);
    return createApiError('Failed to fetch webhooks', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    endpoints?.map(ep => ({
      id: ep.id,
      name: ep.name,
      description: ep.description,
      url: ep.url,
      events: ep.events,
      isActive: ep.is_active,
      maxRetries: ep.max_retries,
      lastTriggeredAt: ep.last_triggered_at,
      successCount: ep.success_count,
      failureCount: ep.failure_count,
      createdAt: ep.created_at,
    })) || [],
    {
      page,
      pageSize,
      total: count || 0,
      hasMore: count ? offset + pageSize < count : false,
    }
  );
}

export const GET = withApiAuth(getHandler, {
  requiredScopes: ['write:webhooks'],
});

// POST - Create webhook endpoint
async function postHandler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  
  let body: {
    name: string;
    url: string;
    events: string[];
    description?: string;
    custom_headers?: Record<string, string>;
    max_retries?: number;
  };
  
  try {
    body = await request.json();
  } catch {
    return createApiError('Invalid JSON body', 'VALIDATION_ERROR', 400);
  }
  
  // Validation
  if (!body.name || body.name.trim().length === 0) {
    return createApiError('name is required', 'MISSING_PARAMETER', 400);
  }
  
  if (!body.url || body.url.trim().length === 0) {
    return createApiError('url is required', 'MISSING_PARAMETER', 400);
  }
  
  // Validate URL format
  try {
    const url = new URL(body.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return createApiError('URL must use http or https protocol', 'VALIDATION_ERROR', 400);
    }
  } catch {
    return createApiError('Invalid URL format', 'VALIDATION_ERROR', 400);
  }
  
  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return createApiError('events array is required and must not be empty', 'MISSING_PARAMETER', 400);
  }
  
  // Validate event types
  const invalidEvents = body.events.filter(e => !WEBHOOK_EVENT_TYPES.includes(e as typeof WEBHOOK_EVENT_TYPES[number]));
  if (invalidEvents.length > 0) {
    return createApiError(
      `Invalid event type(s): ${invalidEvents.join(', ')}. Valid types: ${WEBHOOK_EVENT_TYPES.join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Generate signing secret
  const { secret, hash } = generateWebhookSecret();
  
  // Create endpoint
  const { data: endpoint, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      workspace_id: workspaceId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      url: body.url.trim(),
      secret_hash: hash,
      events: body.events,
      custom_headers: body.custom_headers || null,
      max_retries: body.max_retries || 3,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating webhook:', error);
    return createApiError('Failed to create webhook', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess({
    id: endpoint.id,
    name: endpoint.name,
    description: endpoint.description,
    url: endpoint.url,
    events: endpoint.events,
    secret: secret, // Only shown once!
    isActive: endpoint.is_active,
    maxRetries: endpoint.max_retries,
    createdAt: endpoint.created_at,
    warning: 'Store the webhook secret securely. It will not be shown again.',
    availableEvents: WEBHOOK_EVENT_TYPES,
  });
}

export const POST = withApiAuth(postHandler, {
  requiredScopes: ['write:webhooks'],
});

// DELETE - Delete webhook endpoint
async function deleteHandler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  const webhookId = searchParams.get('id');
  
  if (!webhookId) {
    return createApiError('Webhook id is required', 'MISSING_PARAMETER', 400);
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify ownership
  const { data: existing } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', webhookId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (!existing) {
    return createApiError('Webhook not found', 'RESOURCE_NOT_FOUND', 404);
  }
  
  // Delete endpoint
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', webhookId);
  
  if (error) {
    console.error('Error deleting webhook:', error);
    return createApiError('Failed to delete webhook', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess({ deleted: true, id: webhookId });
}

export const DELETE = withApiAuth(deleteHandler, {
  requiredScopes: ['write:webhooks'],
});

