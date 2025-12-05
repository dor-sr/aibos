import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, webhookEvents } from '@aibos/data-model';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/webhooks/events - Get recent webhook events for a workspace
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
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Get recent webhook events
    const events = await db.query.webhookEvents.findMany({
      where: eq(webhookEvents.workspaceId, workspaceId),
      orderBy: [desc(webhookEvents.receivedAt)],
      limit,
    });

    // Calculate stats
    const stats = {
      total: events.length,
      completed: events.filter(e => e.status === 'completed').length,
      failed: events.filter(e => e.status === 'failed').length,
      pending: events.filter(e => e.status === 'pending' || e.status === 'processing').length,
    };

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        provider: e.provider,
        eventType: e.eventType,
        status: e.status,
        receivedAt: e.receivedAt,
        processedAt: e.processedAt,
        attempts: e.attempts,
        lastError: e.lastError,
      })),
      stats,
    });
  } catch (error) {
    console.error('Error fetching webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook events' },
      { status: 500 }
    );
  }
}

