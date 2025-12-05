// Public API v1 - Insights endpoint
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
  parseDateRange,
} from '@/lib/api/response';

// GET - List insights for workspace
async function handler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse parameters
  const { page, pageSize, offset } = parsePagination(searchParams);
  const { startDate, endDate } = parseDateRange(searchParams, 30);
  const insightType = searchParams.get('type'); // opportunity, risk, general
  const category = searchParams.get('category'); // revenue, churn, growth, etc.
  const status = searchParams.get('status') || 'active'; // active, dismissed, expired
  const priority = searchParams.get('priority'); // high, medium, low
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Build query
  let query = supabase
    .from('insights')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (insightType) {
    query = query.eq('type', insightType);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (priority) {
    query = query.eq('priority', priority);
  }
  
  const { data: insights, error, count } = await query;
  
  if (error) {
    console.error('Error fetching insights:', error);
    return createApiError('Failed to fetch insights', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    insights?.map(insight => ({
      id: insight.id,
      type: insight.type,
      category: insight.category,
      title: insight.title,
      description: insight.description,
      data: insight.data,
      priority: insight.priority,
      status: insight.status,
      actions: insight.actions,
      createdAt: insight.created_at,
      expiresAt: insight.expires_at,
    })) || [],
    {
      page,
      pageSize,
      total: count || 0,
      hasMore: count ? offset + pageSize < count : false,
    }
  );
}

export const GET = withApiAuth(handler, {
  requiredScopes: ['read:insights'],
});

