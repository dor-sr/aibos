// Public API v1 - Anomalies endpoint
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

// GET - List anomalies for workspace
async function handler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse parameters
  const { page, pageSize, offset } = parsePagination(searchParams);
  const { startDate, endDate } = parseDateRange(searchParams, 30);
  const metricName = searchParams.get('metric'); // revenue, orders, mrr, etc.
  const severity = searchParams.get('severity'); // high, medium, low
  const resolved = searchParams.get('resolved'); // true, false
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Build query
  let query = supabase
    .from('anomalies')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .gte('detected_at', startDate.toISOString())
    .lte('detected_at', endDate.toISOString())
    .order('detected_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (metricName) {
    query = query.eq('metric_name', metricName);
  }
  
  if (severity) {
    query = query.eq('severity', severity);
  }
  
  if (resolved !== null && resolved !== undefined) {
    query = query.eq('is_resolved', resolved === 'true');
  }
  
  const { data: anomalies, error, count } = await query;
  
  if (error) {
    console.error('Error fetching anomalies:', error);
    return createApiError('Failed to fetch anomalies', 'INTERNAL_ERROR', 500);
  }
  
  return createApiSuccess(
    anomalies?.map(anomaly => ({
      id: anomaly.id,
      metricName: anomaly.metric_name,
      expectedValue: anomaly.expected_value,
      actualValue: anomaly.actual_value,
      deviation: anomaly.deviation,
      deviationPercent: anomaly.deviation_percent,
      severity: anomaly.severity,
      explanation: anomaly.explanation,
      isResolved: anomaly.is_resolved,
      resolvedAt: anomaly.resolved_at,
      detectedAt: anomaly.detected_at,
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
  requiredScopes: ['read:anomalies'],
});

