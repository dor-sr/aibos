// Public API v1 - Reports endpoint
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

// GET - List or fetch reports for workspace
async function handler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  
  // Get specific report by ID
  const reportId = searchParams.get('id');
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  if (reportId) {
    // Fetch single report
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error || !report) {
      return createApiError('Report not found', 'RESOURCE_NOT_FOUND', 404);
    }
    
    return createApiSuccess({
      id: report.id,
      type: report.report_type,
      period: {
        start: report.period_start,
        end: report.period_end,
      },
      data: report.data,
      summary: report.summary,
      highlights: report.highlights,
      createdAt: report.created_at,
    });
  }
  
  // List reports with pagination
  const { page, pageSize, offset } = parsePagination(searchParams);
  const { startDate, endDate } = parseDateRange(searchParams, 90); // Default 90 days
  const reportType = searchParams.get('type'); // weekly, monthly, etc.
  
  // Build query
  let query = supabase
    .from('reports')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (reportType) {
    query = query.eq('report_type', reportType);
  }
  
  const { data: reports, error, count } = await query;
  
  if (error) {
    console.error('Error fetching reports:', error);
    return createApiError('Failed to fetch reports', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    reports?.map(report => ({
      id: report.id,
      type: report.report_type,
      period: {
        start: report.period_start,
        end: report.period_end,
      },
      summary: report.summary,
      createdAt: report.created_at,
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
  requiredScopes: ['read:reports'],
});

