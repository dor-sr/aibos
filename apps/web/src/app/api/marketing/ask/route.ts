/**
 * Marketing NLQ API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleMarketingNLQ } from '@aibos/marketing-agent';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { question, workspaceId, currency = 'USD' } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const result = await handleMarketingNLQ({
      question,
      workspaceId,
      currency,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Marketing NLQ error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process marketing question',
        answer: 'Sorry, I encountered an error. Please try again.',
      },
      { status: 500 }
    );
  }
}
