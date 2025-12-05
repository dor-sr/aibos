import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import { connectors } from '@aibos/data-model/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/connectors - Get workspace connectors
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

    const workspaceConnectors = await db.query.connectors.findMany({
      where: eq(connectors.workspaceId, workspaceId),
    });

    // Remove sensitive credentials from response
    const safeConnectors = workspaceConnectors.map((connector) => ({
      ...connector,
      credentials: connector.credentials ? { connected: true } : null,
    }));

    return NextResponse.json({ connectors: safeConnectors });
  } catch (error) {
    console.error('Error fetching connectors:', error);
    return NextResponse.json({ error: 'Failed to fetch connectors' }, { status: 500 });
  }
}

// DELETE /api/connectors?id=xxx - Delete a connector
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectorId = searchParams.get('id');

    if (!connectorId) {
      return NextResponse.json({ error: 'Connector ID required' }, { status: 400 });
    }

    await db.delete(connectors).where(eq(connectors.id, connectorId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connector:', error);
    return NextResponse.json({ error: 'Failed to delete connector' }, { status: 500 });
  }
}

// PATCH /api/connectors - Update connector settings
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, isEnabled, settings } = body;

    if (!id) {
      return NextResponse.json({ error: 'Connector ID required' }, { status: 400 });
    }

    const updateData: Partial<typeof connectors.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof isEnabled === 'boolean') {
      updateData.isEnabled = isEnabled;
    }

    if (settings) {
      updateData.settings = settings;
    }

    const [updated] = await db
      .update(connectors)
      .set(updateData)
      .where(eq(connectors.id, id))
      .returning();

    return NextResponse.json({ connector: updated });
  } catch (error) {
    console.error('Error updating connector:', error);
    return NextResponse.json({ error: 'Failed to update connector' }, { status: 500 });
  }
}



