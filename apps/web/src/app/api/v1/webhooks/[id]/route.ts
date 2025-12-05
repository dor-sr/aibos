// Public API v1 - Webhook endpoint management
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

// GET - Get webhook details and recent deliveries
async function getHandler(
  request: NextRequest, 
  context: ApiAuthContext
) {
  const { workspaceId } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const webhookId = pathParts[pathParts.length - 1];
  
  const searchParams = request.nextUrl.searchParams;
  const includeDeliveries = searchParams.get('deliveries') !== 'false';
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get webhook
  const { data: webhook, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', webhookId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error || !webhook) {
    return createApiError('Webhook not found', 'RESOURCE_NOT_FOUND', 404);
  }
  
  const result: Record<string, unknown> = {
    id: webhook.id,
    name: webhook.name,
    description: webhook.description,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.is_active,
    maxRetries: webhook.max_retries,
    customHeaders: webhook.custom_headers,
    lastTriggeredAt: webhook.last_triggered_at,
    successCount: webhook.success_count,
    failureCount: webhook.failure_count,
    createdAt: webhook.created_at,
    updatedAt: webhook.updated_at,
  };
  
  // Get recent deliveries if requested
  if (includeDeliveries) {
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('endpoint_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    result.recentDeliveries = deliveries?.map(d => ({
      id: d.id,
      eventType: d.event_type,
      status: d.status,
      attempts: d.attempts,
      responseStatusCode: d.response_status_code,
      responseTimeMs: d.response_time_ms,
      errorMessage: d.error_message,
      createdAt: d.created_at,
      deliveredAt: d.delivered_at,
    })) || [];
  }
  
  return createApiSuccess(result);
}

export const GET = withApiAuth(getHandler, {
  requiredScopes: ['write:webhooks'],
});

// PATCH - Update webhook endpoint
async function patchHandler(
  request: NextRequest, 
  context: ApiAuthContext
) {
  const { workspaceId } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const webhookId = pathParts[pathParts.length - 1];
  
  let body: {
    name?: string;
    url?: string;
    events?: string[];
    description?: string;
    is_active?: boolean;
    custom_headers?: Record<string, string>;
    max_retries?: number;
    rotate_secret?: boolean;
  };
  
  try {
    body = await request.json();
  } catch {
    return createApiError('Invalid JSON body', 'VALIDATION_ERROR', 400);
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
  
  // Build update object
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.url !== undefined) {
    try {
      const url = new URL(body.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return createApiError('URL must use http or https protocol', 'VALIDATION_ERROR', 400);
      }
      updates.url = body.url.trim();
    } catch {
      return createApiError('Invalid URL format', 'VALIDATION_ERROR', 400);
    }
  }
  if (body.events !== undefined) updates.events = body.events;
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.custom_headers !== undefined) updates.custom_headers = body.custom_headers;
  if (body.max_retries !== undefined) updates.max_retries = body.max_retries;
  
  // Rotate secret if requested
  let newSecret: string | undefined;
  if (body.rotate_secret) {
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    updates.secret_hash = hash;
    newSecret = secret;
  }
  
  // Update
  const { data: webhook, error } = await supabase
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', webhookId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating webhook:', error);
    return createApiError('Failed to update webhook', 'INTERNAL_ERROR', 500);
  }
  
  const result: Record<string, unknown> = {
    id: webhook.id,
    name: webhook.name,
    description: webhook.description,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.is_active,
    maxRetries: webhook.max_retries,
    updatedAt: webhook.updated_at,
  };
  
  if (newSecret) {
    result.newSecret = newSecret;
    result.warning = 'New webhook secret generated. Store it securely.';
  }
  
  return createApiSuccess(result);
}

export const PATCH = withApiAuth(patchHandler, {
  requiredScopes: ['write:webhooks'],
});

