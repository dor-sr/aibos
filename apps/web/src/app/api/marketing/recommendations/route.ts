/**
 * Marketing Recommendations API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getBudgetRecommendations,
  detectCreativeFatigue,
  generateMarketingSuggestions,
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

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const period = searchParams.get('period') || '30d';
    const type = searchParams.get('type') || 'all';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    let data;

    switch (type) {
      case 'budget':
        data = await getBudgetRecommendations(workspaceId, period);
        break;
      case 'fatigue':
        data = await detectCreativeFatigue(workspaceId, period);
        break;
      case 'all':
      default:
        data = await generateMarketingSuggestions(workspaceId, period);
        break;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Marketing recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
