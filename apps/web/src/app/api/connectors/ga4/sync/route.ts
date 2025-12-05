import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, connectors, syncLogs } from '@aibos/data-model';
import { GA4Connector } from '@aibos/connectors';
import { generateId } from '@aibos/core';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/connectors/ga4/sync - Trigger GA4 data sync
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, syncType = 'full' } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Get GA4 connector
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'ga4')
      ),
    });

    if (!connector) {
      return NextResponse.json({ error: 'GA4 connector not found' }, { status: 404 });
    }

    const credentials = connector.credentials as Record<string, unknown> | null;
    if (!credentials?.accessToken || !credentials?.propertyId) {
      return NextResponse.json(
        { error: 'GA4 connector not properly configured' },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLogId = generateId();
    await db.insert(syncLogs).values({
      id: syncLogId,
      connectorId: connector.id,
      status: 'running',
      syncType,
      startedAt: new Date(),
    });

    // Update connector status
    await db
      .update(connectors)
      .set({
        status: 'syncing',
        lastSyncStatus: 'running',
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, connector.id));

    // Create GA4 connector instance
    const ga4Connector = new GA4Connector({
      id: connector.id,
      type: 'ga4',
      workspaceId,
      credentials: {
        accessToken: credentials.accessToken as string,
        refreshToken: credentials.refreshToken as string | undefined,
        propertyId: credentials.propertyId as string,
      },
      settings: (connector.settings as Record<string, unknown>) || {},
    });

    // Run sync
    let syncResult;
    if (syncType === 'incremental' && connector.lastSyncAt) {
      syncResult = await ga4Connector.incrementalSync(new Date(connector.lastSyncAt));
    } else {
      syncResult = await ga4Connector.fullSync();
    }

    // Update sync log
    await db
      .update(syncLogs)
      .set({
        status: syncResult.success ? 'completed' : 'failed',
        completedAt: syncResult.completedAt,
        recordsProcessed: syncResult.recordsProcessed as Record<string, number>,
        errors: syncResult.errors,
      })
      .where(eq(syncLogs.id, syncLogId));

    // Update connector
    await db
      .update(connectors)
      .set({
        status: syncResult.success ? 'active' : 'error',
        lastSyncAt: syncResult.completedAt,
        lastSyncStatus: syncResult.success ? 'completed' : 'failed',
        lastSyncError: syncResult.errors?.[0]?.message || null,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, connector.id));

    return NextResponse.json({
      success: syncResult.success,
      syncLogId,
      recordsProcessed: syncResult.recordsProcessed,
      errors: syncResult.errors,
      duration: syncResult.completedAt.getTime() - syncResult.startedAt.getTime(),
    });
  } catch (error) {
    console.error('Error syncing GA4 data:', error);
    return NextResponse.json(
      { error: 'Failed to sync GA4 data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/connectors/ga4/sync - Get sync status/history
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Get GA4 connector
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'ga4')
      ),
    });

    if (!connector) {
      return NextResponse.json({ error: 'GA4 connector not found' }, { status: 404 });
    }

    // Get recent sync logs
    const logs = await db.query.syncLogs.findMany({
      where: eq(syncLogs.connectorId, connector.id),
      orderBy: (syncLogs, { desc }) => [desc(syncLogs.startedAt)],
      limit: 10,
    });

    return NextResponse.json({
      connector: {
        id: connector.id,
        status: connector.status,
        lastSyncAt: connector.lastSyncAt,
        lastSyncStatus: connector.lastSyncStatus,
        lastSyncError: connector.lastSyncError,
      },
      syncHistory: logs,
    });
  } catch (error) {
    console.error('Error fetching GA4 sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}


