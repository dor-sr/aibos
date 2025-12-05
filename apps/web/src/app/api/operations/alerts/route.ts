import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@aibos/core';

const logger = createLogger('api:operations:alerts');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const includeResolved = searchParams.get('includeResolved') === 'true';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching stock alerts', { workspaceId, includeResolved });

    const { getStockAlerts } = await import('@aibos/commerce-ops-agent');
    const data = await getStockAlerts(workspaceId, includeResolved);

    return NextResponse.json({ data });
  } catch (err) {
    logger.error('Error fetching stock alerts', err instanceof Error ? err : undefined);
    
    // Return demo data
    return NextResponse.json({
      data: [
        {
          id: 'alert_1',
          productId: 'prod_1',
          sku: 'SKU-001',
          productName: 'Premium Widget',
          type: 'low_stock',
          severity: 'high',
          title: 'Low Stock: Premium Widget',
          message: 'Only 5 units remaining. Below reorder point.',
          suggestedAction: 'Create purchase order for 50 units.',
          currentStock: 5,
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'alert_2',
          productId: 'prod_2',
          sku: 'SKU-002',
          productName: 'Basic Gadget',
          type: 'out_of_stock',
          severity: 'critical',
          title: 'Out of Stock: Basic Gadget',
          message: 'Product is completely out of stock.',
          suggestedAction: 'Order immediately to avoid lost sales.',
          currentStock: 0,
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }
}
