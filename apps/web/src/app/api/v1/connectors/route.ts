// Public API v1 - Connectors endpoint
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  withApiAuth, 
  ApiAuthContext 
} from '@/lib/api/auth';
import { 
  createApiSuccess, 
  createApiError,
  parsePagination,
} from '@/lib/api/response';

// GET - List connectors for workspace
async function getHandler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse parameters
  const { page, pageSize, offset } = parsePagination(searchParams);
  const provider = searchParams.get('provider'); // shopify, stripe, ga4, etc.
  const status = searchParams.get('status'); // active, inactive, error
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Build query
  let query = supabase
    .from('connectors')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (provider) {
    query = query.eq('provider', provider);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data: connectors, error, count } = await query;
  
  if (error) {
    console.error('Error fetching connectors:', error);
    return createApiError('Failed to fetch connectors', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    connectors?.map(connector => ({
      id: connector.id,
      provider: connector.provider,
      name: connector.name,
      status: connector.status,
      lastSyncAt: connector.last_sync_at,
      syncFrequency: connector.sync_frequency,
      createdAt: connector.created_at,
      updatedAt: connector.updated_at,
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
  requiredScopes: ['read:connectors'],
});

// POST - Trigger connector sync
async function postHandler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  
  // Parse body
  let body: { connector_id: string; sync_type?: 'full' | 'incremental' };
  try {
    body = await request.json();
  } catch {
    return createApiError('Invalid JSON body', 'VALIDATION_ERROR', 400);
  }
  
  if (!body.connector_id) {
    return createApiError('connector_id is required', 'MISSING_PARAMETER', 400);
  }
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify connector belongs to workspace
  const { data: connector, error: connectorError } = await supabase
    .from('connectors')
    .select('*')
    .eq('id', body.connector_id)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (connectorError || !connector) {
    return createApiError('Connector not found', 'CONNECTOR_NOT_FOUND', 404);
  }
  
  if (connector.status !== 'active') {
    return createApiError('Connector is not active', 'VALIDATION_ERROR', 400);
  }
  
  // Create sync log entry
  const { data: syncLog, error: syncError } = await supabase
    .from('sync_logs')
    .insert({
      connector_id: body.connector_id,
      workspace_id: workspaceId,
      sync_type: body.sync_type || 'incremental',
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (syncError) {
    console.error('Error creating sync log:', syncError);
    return createApiError('Failed to trigger sync', 'INTERNAL_ERROR', 500);
  }
  
  // In a real implementation, you would trigger the actual sync job here
  // For now, we return the sync job info
  
  return createApiSuccess({
    syncId: syncLog.id,
    connectorId: body.connector_id,
    syncType: body.sync_type || 'incremental',
    status: 'pending',
    startedAt: syncLog.started_at,
    message: 'Sync job has been queued',
  });
}

export const POST = withApiAuth(postHandler, {
  requiredScopes: ['write:connectors'],
});

