import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  userViewPreferences,
} from '@aibos/data-model/schema';
import { eq, and } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// GET /api/views/preferences - Get user view preferences
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
    const viewType = searchParams.get('viewType');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify user has access to this workspace
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    const conditions = [
      eq(userViewPreferences.userId, user.id),
      eq(userViewPreferences.workspaceId, workspaceId),
    ];

    if (viewType) {
      conditions.push(eq(userViewPreferences.viewType, viewType));
    }

    const preferences = viewType
      ? await db.query.userViewPreferences.findFirst({
          where: and(...conditions),
        })
      : await db.query.userViewPreferences.findMany({
          where: and(
            eq(userViewPreferences.userId, user.id),
            eq(userViewPreferences.workspaceId, workspaceId)
          ),
        });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching view preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

// POST /api/views/preferences - Create or update view preferences
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
    const {
      workspaceId,
      viewType,
      defaultDashboardId,
      defaultFilterPresetId,
      defaultDateRange,
      preferences,
    } = body;

    if (!workspaceId || !viewType) {
      return NextResponse.json(
        { error: 'Workspace ID and view type are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this workspace
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if preferences already exist
    const existing = await db.query.userViewPreferences.findFirst({
      where: and(
        eq(userViewPreferences.userId, user.id),
        eq(userViewPreferences.workspaceId, workspaceId),
        eq(userViewPreferences.viewType, viewType)
      ),
    });

    if (existing) {
      // Update existing
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (defaultDashboardId !== undefined) updateData.defaultDashboardId = defaultDashboardId;
      if (defaultFilterPresetId !== undefined) updateData.defaultFilterPresetId = defaultFilterPresetId;
      if (defaultDateRange !== undefined) updateData.defaultDateRange = defaultDateRange;
      if (preferences !== undefined) {
        updateData.preferences = {
          ...(existing.preferences || {}),
          ...preferences,
        };
      }

      const updatedPreferences = await db
        .update(userViewPreferences)
        .set(updateData)
        .where(eq(userViewPreferences.id, existing.id))
        .returning();

      return NextResponse.json({ preferences: updatedPreferences[0] });
    }

    // Create new
    const prefId = generateId();
    const insertedPreferences = await db
      .insert(userViewPreferences)
      .values({
        id: prefId,
        userId: user.id,
        workspaceId,
        viewType,
        defaultDashboardId,
        defaultFilterPresetId,
        defaultDateRange,
        preferences: preferences || {},
      })
      .returning();

    return NextResponse.json({ preferences: insertedPreferences[0] }, { status: 201 });
  } catch (error) {
    console.error('Error saving view preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

// DELETE /api/views/preferences - Reset view preferences
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
    const workspaceId = searchParams.get('workspaceId');
    const viewType = searchParams.get('viewType');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const conditions = [
      eq(userViewPreferences.userId, user.id),
      eq(userViewPreferences.workspaceId, workspaceId),
    ];

    if (viewType) {
      conditions.push(eq(userViewPreferences.viewType, viewType));
    }

    await db.delete(userViewPreferences).where(and(...conditions));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting view preferences:', error);
    return NextResponse.json({ error: 'Failed to reset preferences' }, { status: 500 });
  }
}


