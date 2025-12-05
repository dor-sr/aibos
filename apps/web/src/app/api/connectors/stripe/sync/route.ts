import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, connectors, syncLogs } from '@aibos/data-model';
import { StripeConnector } from '@aibos/connectors';
import { generateId } from '@aibos/core';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/connectors/stripe/sync - Trigger manual Stripe sync
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
    const { workspaceId, fullSync = false } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Get connector
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'stripe')
      ),
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Stripe connector not found' },
        { status: 404 }
      );
    }

    if (!connector.credentials || !connector.credentials.apiKey) {
      return NextResponse.json(
        { error: 'Stripe connector not configured' },
        { status: 400 }
      );
    }

    // Create sync log entry
    const syncLogId = generateId();
    await db.insert(syncLogs).values({
      id: syncLogId,
      connectorId: connector.id,
      status: 'running',
      syncType: fullSync ? 'full' : 'incremental',
      startedAt: new Date(),
    });

    // Update connector status
    await db
      .update(connectors)
      .set({ status: 'syncing' })
      .where(eq(connectors.id, connector.id));

    try {
      // Create Stripe connector instance
      const stripeConnector = new StripeConnector({
        id: connector.id,
        type: 'stripe',
        workspaceId,
        credentials: connector.credentials as { apiKey: string },
        settings: connector.settings ?? {},
      });

      // Perform sync
      let result;
      if (fullSync || !connector.lastSyncAt) {
        result = await stripeConnector.fullSync();
      } else {
        result = await stripeConnector.incrementalSync(connector.lastSyncAt);
      }

      // Convert recordsProcessed to clean object with defined values
      const processedRecords: Record<string, number> = {};
      for (const [key, value] of Object.entries(result.recordsProcessed)) {
        if (value !== undefined) {
          processedRecords[key] = value;
        }
      }

      // Update sync log with results
      await db
        .update(syncLogs)
        .set({
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date(),
          recordsProcessed: processedRecords,
          errors: result.errors,
        })
        .where(eq(syncLogs.id, syncLogId));

      // Update connector status and last sync time
      await db
        .update(connectors)
        .set({
          status: result.success ? 'active' : 'error',
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(connectors.id, connector.id));

      return NextResponse.json({
        success: result.success,
        syncLogId,
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
        duration: result.completedAt.getTime() - result.startedAt.getTime(),
      });
    } catch (syncError) {
      // Update sync log with error
      await db
        .update(syncLogs)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errors: [{ type: 'sync_error', message: (syncError as Error).message }],
        })
        .where(eq(syncLogs.id, syncLogId));

      // Update connector status
      await db
        .update(connectors)
        .set({ status: 'error' })
        .where(eq(connectors.id, connector.id));

      throw syncError;
    }
  } catch (error) {
    console.error('Error syncing Stripe:', error);
    return NextResponse.json(
      { error: 'Failed to sync Stripe data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/connectors/stripe/sync - Get sync status and history
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

    // Get connector
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'stripe')
      ),
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Stripe connector not found' },
        { status: 404 }
      );
    }

    // Get recent sync logs
    const recentSyncs = await db.query.syncLogs.findMany({
      where: eq(syncLogs.connectorId, connector.id),
      orderBy: (syncLogs, { desc }) => [desc(syncLogs.startedAt)],
      limit: 10,
    });

    return NextResponse.json({
      connector: {
        id: connector.id,
        status: connector.status,
        lastSyncAt: connector.lastSyncAt,
      },
      syncHistory: recentSyncs,
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
