// Public API v1 - Webhook test endpoint
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
} from '@/lib/api/response';

// POST - Send test webhook
async function handler(
  request: NextRequest, 
  context: ApiAuthContext
) {
  const { workspaceId } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const webhookId = pathParts[pathParts.length - 2]; // /webhooks/[id]/test
  
  let body: { event_type?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  
  const eventType = body.event_type || 'test.ping';
  
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
  
  // Create test payload
  const testPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    workspace_id: workspaceId,
    test: true,
    data: {
      message: 'This is a test webhook delivery',
      webhook_id: webhookId,
    },
  };
  
  // Sign the payload
  const payloadString = JSON.stringify(testPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', webhook.secret_hash)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');
  
  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
    'X-Webhook-ID': webhookId,
    'User-Agent': 'AIBOS-Webhook/1.0',
    ...(webhook.custom_headers || {}),
  };
  
  // Send test webhook
  const startTime = Date.now();
  let responseStatus: number;
  let responseBody: string;
  let responseTimeMs: number;
  let success = false;
  let errorMessage: string | undefined;
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
    });
    
    responseTimeMs = Date.now() - startTime;
    responseStatus = response.status;
    responseBody = await response.text();
    success = response.ok;
    
    if (!response.ok) {
      errorMessage = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
    }
  } catch (err) {
    responseTimeMs = Date.now() - startTime;
    responseStatus = 0;
    responseBody = '';
    success = false;
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }
  
  // Log the test delivery
  await supabase.from('webhook_deliveries').insert({
    endpoint_id: webhookId,
    workspace_id: workspaceId,
    event_type: eventType as 'anomaly.detected', // Cast to satisfy type
    event_id: crypto.randomUUID(),
    payload: testPayload,
    status: success ? 'success' : 'failed',
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
    response_status_code: responseStatus,
    response_body: responseBody.substring(0, 1000),
    response_time_ms: responseTimeMs,
    error_message: errorMessage,
    delivered_at: success ? new Date().toISOString() : null,
  });
  
  return createApiSuccess({
    success,
    webhookId,
    eventType,
    url: webhook.url,
    responseStatus,
    responseTimeMs,
    errorMessage,
    headers: {
      'X-Webhook-Signature': `t=${timestamp},v1=${signature.substring(0, 10)}...`,
    },
  });
}

export const POST = withApiAuth(handler, {
  requiredScopes: ['write:webhooks'],
});

