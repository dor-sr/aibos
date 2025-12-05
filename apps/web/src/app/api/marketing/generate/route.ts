/**
 * Marketing Creative Generation API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCreatives, generateAdVariations } from '@aibos/marketing-agent';
import type { CreativeRequest } from '@aibos/marketing-agent';

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
    const { workspaceId, generateVariations = false, ...creativeRequest } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    if (!creativeRequest.type) {
      return NextResponse.json({ error: 'Creative type required' }, { status: 400 });
    }

    let data;

    if (generateVariations) {
      data = await generateAdVariations(
        workspaceId,
        creativeRequest as CreativeRequest,
        creativeRequest.count || 3
      );
    } else {
      data = await generateCreatives(workspaceId, creativeRequest as CreativeRequest);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Creative generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate creatives' },
      { status: 500 }
    );
  }
}
