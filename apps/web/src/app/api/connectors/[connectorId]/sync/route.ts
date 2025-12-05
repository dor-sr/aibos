import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, connectors, syncLogs } from '@aibos/data-model';
import { ShopifyClient, syncOrders, syncProducts, syncCustomers } from '@aibos/connectors';
import { generateId } from '@aibos/core';
import { eq, and } from 'drizzle-orm';

interface ConnectorCredentials {
  accessToken?: string;
  shopDomain?: string;
  [key: string]: unknown;
}

/**
 * POST /api/connectors/[connectorId]/sync
 * Trigger a manual sync for a specific connector
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params;

  // Verify authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get connector and verify ownership
  const connector = await db
    .select()
    .from(connectors)
    .where(eq(connectors.id, connectorId))
    .limit(1);

  const conn = connector[0];
  if (!conn) {
    return NextResponse.json(
      { error: 'Connector not found' },
      { status: 404 }
    );
  }

  // Verify connector status
  if (conn.status !== 'connected') {
    return NextResponse.json(
      { error: 'Connector is not connected' },
      { status: 400 }
    );
  }

  if (!conn.isEnabled) {
    return NextResponse.json(
      { error: 'Connector is disabled' },
      { status: 400 }
    );
  }

  // Check if sync is already running
  if (conn.lastSyncStatus === 'running') {
    return NextResponse.json(
      { error: 'Sync already in progress' },
      { status: 409 }
    );
  }

  // Create sync log
  const syncLogId = generateId();
  const startedAt = new Date();

  await db.insert(syncLogs).values({
    id: syncLogId,
    connectorId: conn.id,
    workspaceId: conn.workspaceId,
    status: 'running',
    startedAt,
  });

  // Update connector status
  await db
    .update(connectors)
    .set({ lastSyncStatus: 'running' })
    .where(eq(connectors.id, conn.id));

  // Run sync based on connector type
  try {
    let recordsProcessed: Record<string, number> = {};

    switch (conn.type) {
      case 'shopify':
        recordsProcessed = await syncShopifyConnector(conn);
        break;
      default:
        throw new Error(`Unsupported connector type: ${conn.type}`);
    }

    // Update sync log with success
    await db
      .update(syncLogs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: JSON.stringify(recordsProcessed),
      })
      .where(eq(syncLogs.id, syncLogId));

    // Update connector with success
    await db
      .update(connectors)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: 'completed',
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, conn.id));

    return NextResponse.json({
      success: true,
      syncId: syncLogId,
      recordsProcessed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update sync log with failure
    await db
      .update(syncLogs)
      .set({
        status: 'failed',
        completedAt: new Date(),
        error: errorMessage,
      })
      .where(eq(syncLogs.id, syncLogId));

    // Update connector with failure
    await db
      .update(connectors)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: 'failed',
        lastSyncError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, conn.id));

    return NextResponse.json(
      { error: 'Sync failed', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/connectors/[connectorId]/sync
 * Get sync status for a connector
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params;

  // Verify authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get connector
  const connector = await db
    .select()
    .from(connectors)
    .where(eq(connectors.id, connectorId))
    .limit(1);

  const conn = connector[0];
  if (!conn) {
    return NextResponse.json(
      { error: 'Connector not found' },
      { status: 404 }
    );
  }

  // Get recent sync logs
  const recentLogs = await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.connectorId, connectorId))
    .orderBy(syncLogs.startedAt)
    .limit(10);

  return NextResponse.json({
    connectorId: conn.id,
    lastSyncAt: conn.lastSyncAt,
    lastSyncStatus: conn.lastSyncStatus,
    lastSyncError: conn.lastSyncError,
    recentSyncs: recentLogs.map((log) => ({
      id: log.id,
      status: log.status,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      recordsProcessed: log.recordsProcessed ? JSON.parse(log.recordsProcessed) : null,
      error: log.error,
    })),
  });
}

async function syncShopifyConnector(
  conn: typeof connectors.$inferSelect
): Promise<Record<string, number>> {
  const credentials = conn.credentials as ConnectorCredentials | null;

  if (!credentials?.accessToken || !credentials?.shopDomain) {
    throw new Error('Missing Shopify credentials');
  }

  const client = new ShopifyClient({
    shopDomain: credentials.shopDomain,
    accessToken: credentials.accessToken,
  });

  // Test connection
  const isConnected = await client.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to Shopify');
  }

  // Sync in order: customers first (for FK references), then products, then orders
  const customersCount = await syncCustomers(client, conn.workspaceId);
  const productsCount = await syncProducts(client, conn.workspaceId);
  const ordersCount = await syncOrders(client, conn.workspaceId);

  return {
    customers: customersCount,
    products: productsCount,
    orders: ordersCount,
  };
}

