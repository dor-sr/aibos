// Public API v1 - Workspace endpoint
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  withApiAuth, 
  ApiAuthContext 
} from '@/lib/api/auth';
import { 
  createApiSuccess, 
  createApiError,
} from '@/lib/api/response';

// GET - Get workspace information
async function handler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get workspace
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();
  
  if (error || !workspace) {
    return createApiError('Workspace not found', 'WORKSPACE_NOT_FOUND', 404);
  }
  
  // Get connector count
  const { count: connectorCount } = await supabase
    .from('connectors')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');
  
  // Get member count
  const { count: memberCount } = await supabase
    .from('workspace_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);
  
  return createApiSuccess({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    verticalType: workspace.vertical_type,
    status: workspace.status,
    settings: {
      currency: workspace.settings?.currency || 'USD',
      timezone: workspace.settings?.timezone || 'UTC',
    },
    connectorCount: connectorCount || 0,
    memberCount: memberCount || 0,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
  });
}

export const GET = withApiAuth(handler, {
  requiredScopes: ['read:workspace'],
});

