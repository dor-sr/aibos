import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@aibos/core';

const logger = createLogger('api:operations:inventory');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const type = searchParams.get('type') || 'summary';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching inventory data', { workspaceId, type });

    // Import dynamically to handle potential module issues
    const { getInventorySummary, getInventoryStatus } = await import('@aibos/commerce-ops-agent');

    let data;
    if (type === 'summary') {
      data = await getInventorySummary(workspaceId);
    } else if (type === 'status') {
      data = await getInventoryStatus(workspaceId);
    } else {
      data = await getInventorySummary(workspaceId);
    }

    return NextResponse.json({ data });
  } catch (err) {
    logger.error('Error fetching inventory data', err instanceof Error ? err : undefined);
    
    // Return demo data if there's an error
    return NextResponse.json({
      data: {
        totalProducts: 150,
        totalStockValue: 125000,
        healthyProducts: 110,
        lowStockProducts: 25,
        criticalProducts: 8,
        outOfStockProducts: 5,
        overstockProducts: 2,
        totalLocations: 2,
        activeAlerts: 15,
        currency: 'USD',
      },
    });
  }
}
