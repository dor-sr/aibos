import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  savedViews,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, or, desc } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// GET /api/team/saved-views - Get saved views
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
    const includeShared = searchParams.get('includeShared') !== 'false';

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

    // Build query conditions
    const conditions = [eq(savedViews.workspaceId, workspaceId)];

    // User can see their own views and shared views
    if (includeShared) {
      conditions.push(
        or(eq(savedViews.userId, user.id), eq(savedViews.isShared, true))!
      );
    } else {
      conditions.push(eq(savedViews.userId, user.id));
    }

    if (viewType) {
      conditions.push(eq(savedViews.viewType, viewType));
    }

    const views = await db.query.savedViews.findMany({
      where: and(...conditions),
      orderBy: [desc(savedViews.isDefault), desc(savedViews.updatedAt)],
    });

    // Format response
    const formattedViews = views.map((v) => ({
      ...v,
      isOwn: v.userId === user.id,
    }));

    return NextResponse.json({ views: formattedViews });
  } catch (error) {
    console.error('Error fetching saved views:', error);
    return NextResponse.json({ error: 'Failed to fetch saved views' }, { status: 500 });
  }
}

// POST /api/team/saved-views - Save a new view
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
      name,
      description,
      viewType,
      config,
      isShared = false,
      isDefault = false,
    } = body;

    if (!workspaceId || !name || !viewType || !config) {
      return NextResponse.json(
        { error: 'Workspace ID, name, viewType, and config are required' },
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

    // If setting as default, unset other defaults for this user and view type
    if (isDefault) {
      await db
        .update(savedViews)
        .set({ isDefault: false })
        .where(
          and(
            eq(savedViews.workspaceId, workspaceId),
            eq(savedViews.userId, user.id),
            eq(savedViews.viewType, viewType)
          )
        );
    }

    // Create the saved view
    const viewId = generateId();
    const insertedViews = await db
      .insert(savedViews)
      .values({
        id: viewId,
        workspaceId,
        userId: user.id,
        name,
        description,
        viewType,
        config,
        isShared,
        isDefault,
      })
      .returning();

    const savedView = insertedViews[0];

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.view_saved',
      resourceType: 'view',
      resourceId: viewId,
      resourceName: name,
      metadata: {
        viewType,
        isShared,
      },
    });

    return NextResponse.json({ view: savedView }, { status: 201 });
  } catch (error) {
    console.error('Error saving view:', error);
    return NextResponse.json({ error: 'Failed to save view' }, { status: 500 });
  }
}

// PATCH /api/team/saved-views - Update a saved view
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
    const { workspaceId, viewId, name, description, config, isShared, isDefault } = body;

    if (!workspaceId || !viewId) {
      return NextResponse.json(
        { error: 'Workspace ID and view ID are required' },
        { status: 400 }
      );
    }

    // Get the view
    const view = await db.query.savedViews.findFirst({
      where: and(eq(savedViews.id, viewId), eq(savedViews.workspaceId, workspaceId)),
    });

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    // Only owner can edit
    if (view.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If setting as default, unset other defaults
    if (isDefault && !view.isDefault) {
      await db
        .update(savedViews)
        .set({ isDefault: false })
        .where(
          and(
            eq(savedViews.workspaceId, workspaceId),
            eq(savedViews.userId, user.id),
            eq(savedViews.viewType, view.viewType)
          )
        );
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (config !== undefined) updates.config = config;
    if (isShared !== undefined) updates.isShared = isShared;
    if (isDefault !== undefined) updates.isDefault = isDefault;

    // Update
    const updatedViews = await db
      .update(savedViews)
      .set(updates)
      .where(eq(savedViews.id, viewId))
      .returning();

    // Log sharing activity
    if (isShared !== undefined && isShared !== view.isShared) {
      await db.insert(activityLogs).values({
        id: generateId(),
        workspaceId,
        userId: user.id,
        action: isShared ? 'resource.shared' : 'resource.unshared',
        resourceType: 'view',
        resourceId: viewId,
        resourceName: view.name,
      });
    }

    return NextResponse.json({ view: updatedViews[0] });
  } catch (error) {
    console.error('Error updating saved view:', error);
    return NextResponse.json({ error: 'Failed to update view' }, { status: 500 });
  }
}

// DELETE /api/team/saved-views - Delete a saved view
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, viewId } = body;

    if (!workspaceId || !viewId) {
      return NextResponse.json(
        { error: 'Workspace ID and view ID are required' },
        { status: 400 }
      );
    }

    // Get the view
    const view = await db.query.savedViews.findFirst({
      where: and(eq(savedViews.id, viewId), eq(savedViews.workspaceId, workspaceId)),
    });

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    // Only owner can delete
    if (view.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete
    await db.delete(savedViews).where(eq(savedViews.id, viewId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved view:', error);
    return NextResponse.json({ error: 'Failed to delete view' }, { status: 500 });
  }
}
