import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  customDashboards,
  dashboardWidgets,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, asc } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

// GET /api/dashboards/[dashboardId] - Get single dashboard with widgets
export async function GET(request: Request, context: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

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

    // Get the dashboard
    const dashboard = await db.query.customDashboards.findFirst({
      where: and(
        eq(customDashboards.id, dashboardId),
        eq(customDashboards.workspaceId, workspaceId)
      ),
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Check if user can access (own or shared)
    if (dashboard.createdBy !== user.id && !dashboard.isShared) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get widgets for this dashboard
    const widgets = await db.query.dashboardWidgets.findMany({
      where: eq(dashboardWidgets.dashboardId, dashboardId),
      orderBy: [asc(dashboardWidgets.sortOrder)],
    });

    // Update view count
    await db
      .update(customDashboards)
      .set({
        viewCount: (dashboard.viewCount || 0) + 1,
        lastViewedAt: new Date(),
      })
      .where(eq(customDashboards.id, dashboardId));

    return NextResponse.json({
      dashboard: {
        ...dashboard,
        widgets,
        isOwn: dashboard.createdBy === user.id,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}

// PATCH /api/dashboards/[dashboardId] - Update dashboard
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const body = await request.json();
    const {
      workspaceId,
      name,
      description,
      layout,
      settings,
      isShared,
      isDefault,
      status,
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Get the dashboard
    const dashboard = await db.query.customDashboards.findFirst({
      where: and(
        eq(customDashboards.id, dashboardId),
        eq(customDashboards.workspaceId, workspaceId)
      ),
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Only owner can edit
    if (dashboard.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If setting as default, unset other defaults
    if (isDefault && !dashboard.isDefault) {
      await db
        .update(customDashboards)
        .set({ isDefault: false })
        .where(eq(customDashboards.workspaceId, workspaceId));
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (layout !== undefined) updates.layout = layout;
    if (settings !== undefined) updates.settings = settings;
    if (isShared !== undefined) updates.isShared = isShared;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'published' && dashboard.status !== 'published') {
        updates.publishedAt = new Date();
      }
    }

    // Update
    const updatedDashboards = await db
      .update(customDashboards)
      .set(updates)
      .where(eq(customDashboards.id, dashboardId))
      .returning();

    // Log sharing activity
    if (isShared !== undefined && isShared !== dashboard.isShared) {
      await db.insert(activityLogs).values({
        id: generateId(),
        workspaceId,
        userId: user.id,
        action: isShared ? 'resource.shared' : 'resource.unshared',
        resourceType: 'dashboard',
        resourceId: dashboardId,
        resourceName: dashboard.name,
      });
    }

    return NextResponse.json({ dashboard: updatedDashboards[0] });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[dashboardId] - Delete dashboard
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Get the dashboard
    const dashboard = await db.query.customDashboards.findFirst({
      where: and(
        eq(customDashboards.id, dashboardId),
        eq(customDashboards.workspaceId, workspaceId)
      ),
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Only owner can delete
    if (dashboard.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete (widgets will cascade)
    await db.delete(customDashboards).where(eq(customDashboards.id, dashboardId));

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.dashboard_created', // We reuse this action for delete
      resourceType: 'dashboard',
      resourceId: dashboardId,
      resourceName: dashboard.name,
      metadata: { action: 'deleted' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 });
  }
}

