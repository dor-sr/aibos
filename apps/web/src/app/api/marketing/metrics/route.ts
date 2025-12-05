/**
 * Marketing Metrics API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getMarketingMetricsSummary,
  getChannelPerformance,
  getCampaignPerformance,
  getTopCampaigns,
  getUnderperformingCampaigns,
  getSpendTrend,
} from '@aibos/marketing-agent';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace ID from session or query params
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const period = searchParams.get('period') || '30d';
    const type = searchParams.get('type') || 'summary';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    let data;

    switch (type) {
      case 'summary':
        data = await getMarketingMetricsSummary(workspaceId, period);
        break;
      case 'channels':
        data = await getChannelPerformance(workspaceId, period);
        break;
      case 'campaigns':
        data = await getCampaignPerformance(workspaceId, period);
        break;
      case 'top':
        const metric = (searchParams.get('metric') || 'roas') as 'roas' | 'conversions' | 'revenue' | 'ctr';
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        data = await getTopCampaigns(workspaceId, period, metric, limit);
        break;
      case 'underperforming':
        const threshold = parseFloat(searchParams.get('threshold') || '1.0');
        data = await getUnderperformingCampaigns(workspaceId, period, threshold);
        break;
      case 'trend':
        data = await getSpendTrend(workspaceId, period);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Marketing metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing metrics' },
      { status: 500 }
    );
  }
}
