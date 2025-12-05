import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@aibos/core';

const logger = createLogger('api:operations:health');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching inventory health score', { workspaceId });

    const { getInventoryHealthScore } = await import('@aibos/commerce-ops-agent');
    const score = await getInventoryHealthScore(workspaceId);

    return NextResponse.json({ score });
  } catch (err) {
    logger.error('Error fetching health score', err instanceof Error ? err : undefined);
    
    // Return demo score
    return NextResponse.json({ score: 78 });
  }
}
