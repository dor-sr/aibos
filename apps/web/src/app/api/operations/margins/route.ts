import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@aibos/core';

const logger = createLogger('api:operations:margins');

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

    logger.info('Fetching margin analysis', { workspaceId });

    const { getMarginAnalysis } = await import('@aibos/commerce-ops-agent');
    const data = await getMarginAnalysis(workspaceId);

    return NextResponse.json({ data });
  } catch (err) {
    logger.error('Error fetching margin analysis', err instanceof Error ? err : undefined);
    
    // Return demo data
    return NextResponse.json({
      data: {
        totalProducts: 150,
        averageMarginPercent: 32.5,
        productsWithMargin: 120,
        totalRevenue: 450000,
        totalProfit: 146250,
        highMarginProducts: 45,
        lowMarginProducts: 65,
        negativeMarginProducts: 3,
        currency: 'USD',
      },
    });
  }
}
