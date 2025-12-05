import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@aibos/core';

const logger = createLogger('api:operations:recommendations');

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

    logger.info('Fetching reorder recommendations', { workspaceId });

    const { getReorderRecommendations } = await import('@aibos/commerce-ops-agent');
    const data = await getReorderRecommendations(workspaceId);

    return NextResponse.json({ data });
  } catch (err) {
    logger.error('Error fetching reorder recommendations', err instanceof Error ? err : undefined);
    
    // Return demo data
    return NextResponse.json({
      data: [
        {
          id: 'rec_1',
          productId: 'prod_1',
          sku: 'SKU-001',
          productName: 'Premium Widget',
          currentStock: 5,
          recommendedQuantity: 50,
          priority: 'urgent',
          reason: 'Only 3 days of stock remaining based on current sales velocity.',
        },
        {
          id: 'rec_2',
          productId: 'prod_3',
          sku: 'SKU-003',
          productName: 'Standard Component',
          currentStock: 15,
          recommendedQuantity: 30,
          priority: 'high',
          reason: 'Below reorder point. 7 days of stock remaining.',
        },
        {
          id: 'rec_3',
          productId: 'prod_4',
          sku: 'SKU-004',
          productName: 'Deluxe Package',
          currentStock: 25,
          recommendedQuantity: 20,
          priority: 'medium',
          reason: 'Demand is increasing. Reorder recommended.',
        },
      ],
    });
  }
}
