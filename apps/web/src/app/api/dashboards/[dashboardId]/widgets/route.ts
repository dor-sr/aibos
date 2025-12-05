import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  customDashboards,
  dashboardWidgets,
} from '@aibos/data-model/schema';
import { eq, and } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

// POST /api/dashboards/[dashboardId]/widgets - Add widget to dashboard
export async function POST(request: Request, context: RouteParams) {
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
      widgetType,
      title,
      gridX = 0,
      gridY = 0,
      gridW = 4,
      gridH = 2,
      config = {},
      style,
    } = body;

    if (!workspaceId || !widgetType) {
      return NextResponse.json(
        { error: 'Workspace ID and widget type are required' },
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

    // Get the dashboard and verify ownership
    const dashboard = await db.query.customDashboards.findFirst({
      where: and(
        eq(customDashboards.id, dashboardId),
        eq(customDashboards.workspaceId, workspaceId)
      ),
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (dashboard.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current max sort order
    const existingWidgets = await db.query.dashboardWidgets.findMany({
      where: eq(dashboardWidgets.dashboardId, dashboardId),
    });
    const maxSortOrder = existingWidgets.reduce((max, w) => Math.max(max, w.sortOrder), -1);

    // Create the widget
    const widgetId = generateId();
    const insertedWidgets = await db
      .insert(dashboardWidgets)
      .values({
        id: widgetId,
        dashboardId,
        widgetType,
        title,
        gridX,
        gridY,
        gridW,
        gridH,
        config,
        style,
        sortOrder: maxSortOrder + 1,
      })
      .returning();

    // Update dashboard updatedAt
    await db
      .update(customDashboards)
      .set({ updatedAt: new Date() })
      .where(eq(customDashboards.id, dashboardId));

    return NextResponse.json({ widget: insertedWidgets[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating widget:', error);
    return NextResponse.json({ error: 'Failed to create widget' }, { status: 500 });
  }
}

// PATCH /api/dashboards/[dashboardId]/widgets - Update widget(s)
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
    const { workspaceId, widgetId, widgets, ...updates } = body;

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

    // Get the dashboard and verify ownership
    const dashboard = await db.query.customDashboards.findFirst({
      where: and(
        eq(customDashboards.id, dashboardId),
        eq(customDashboards.workspaceId, workspaceId)
      ),
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (dashboard.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Batch update for layout changes (multiple widgets)
    if (widgets && Array.isArray(widgets)) {
      for (const widget of widgets) {
        if (!widget.id) continue;
        
        const widgetUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (widget.gridX !== undefined) widgetUpdates.gridX = widget.gridX;
        if (widget.gridY !== undefined) widgetUpdates.gridY = widget.gridY;
        if (widget.gridW !== undefined) widgetUpdates.gridW = widget.gridW;
        if (widget.gridH !== undefined) widgetUpdates.gridH = widget.gridH;
        if (widget.sortOrder !== undefined) widgetUpdates.sortOrder = widget.sortOrder;

        await db
          .update(dashboardWidgets)
          .set(widgetUpdates)
          .where(
            and(
              eq(dashboardWidgets.id, widget.id),
              eq(dashboardWidgets.dashboardId, dashboardId)
            )
          );
      }

      // Update dashboard updatedAt
      await db
        .update(customDashboards)
        .set({ updatedAt: new Date() })
        .where(eq(customDashboards.id, dashboardId));

      return NextResponse.json({ success: true });
    }

    // Single widget update
    if (!widgetId) {
      return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
    }

    const widgetUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title !== undefined) widgetUpdates.title = updates.title;
    if (updates.gridX !== undefined) widgetUpdates.gridX = updates.gridX;
    if (updates.gridY !== undefined) widgetUpdates.gridY = updates.gridY;
    if (updates.gridW !== undefined) widgetUpdates.gridW = updates.gridW;
    if (updates.gridH !== undefined) widgetUpdates.gridH = updates.gridH;
    if (updates.config !== undefined) widgetUpdates.config = updates.config;
    if (updates.style !== undefined) widgetUpdates.style = updates.style;
    if (updates.isVisible !== undefined) widgetUpdates.isVisible = updates.isVisible;

    const updatedWidgets = await db
      .update(dashboardWidgets)
      .set(widgetUpdates)
      .where(
        and(
          eq(dashboardWidgets.id, widgetId),
          eq(dashboardWidgets.dashboardId, dashboardId)
        )
      )
      .returning();

    if (updatedWidgets.length === 0) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Update dashboard updatedAt
    await db
      .update(customDashboards)
      .set({ updatedAt: new Date() })
      .where(eq(customDashboards.id, dashboardId));

    return NextResponse.json({ widget: updatedWidgets[0] });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[dashboardId]/widgets - Delete widget
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
    const widgetId = searchParams.get('widgetId');

    if (!workspaceId || !widgetId) {
      return NextResponse.json(
        { error: 'Workspace ID and widget ID are required' },
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

    // Get the dashboard and verify ownership
    const dashboard = await db.query.customDashboards.findFirst({
      where: and(
        eq(customDashboards.id, dashboardId),
        eq(customDashboards.workspaceId, workspaceId)
      ),
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (dashboard.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the widget
    await db
      .delete(dashboardWidgets)
      .where(
        and(
          eq(dashboardWidgets.id, widgetId),
          eq(dashboardWidgets.dashboardId, dashboardId)
        )
      );

    // Update dashboard updatedAt
    await db
      .update(customDashboards)
      .set({ updatedAt: new Date() })
      .where(eq(customDashboards.id, dashboardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
