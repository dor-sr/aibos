import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  customDashboards,
  dashboardWidgets,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// GET /api/dashboards - List dashboards
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
    const status = searchParams.get('status');
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
    const conditions = [eq(customDashboards.workspaceId, workspaceId)];

    // User can see their own dashboards and shared dashboards
    if (includeShared) {
      conditions.push(
        or(eq(customDashboards.createdBy, user.id), eq(customDashboards.isShared, true))!
      );
    } else {
      conditions.push(eq(customDashboards.createdBy, user.id));
    }

    if (status) {
      conditions.push(eq(customDashboards.status, status as 'draft' | 'published' | 'archived'));
    }

    const dashboards = await db.query.customDashboards.findMany({
      where: and(...conditions),
      orderBy: [desc(customDashboards.isDefault), desc(customDashboards.updatedAt)],
    });

    // Format response
    const formattedDashboards = dashboards.map((d) => ({
      ...d,
      isOwn: d.createdBy === user.id,
    }));

    return NextResponse.json({ dashboards: formattedDashboards });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboards' }, { status: 500 });
  }
}

// POST /api/dashboards - Create a new dashboard
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
      layout,
      settings,
      widgets,
      isShared = false,
      isDefault = false,
      status = 'draft',
    } = body;

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'Workspace ID and name are required' },
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

    // Generate unique slug
    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Check for existing slug and make unique if needed
    while (true) {
      const existing = await db.query.customDashboards.findFirst({
        where: and(
          eq(customDashboards.workspaceId, workspaceId),
          eq(customDashboards.slug, slug)
        ),
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(customDashboards)
        .set({ isDefault: false })
        .where(eq(customDashboards.workspaceId, workspaceId));
    }

    // Default layout configuration
    const defaultLayout = {
      columns: 12,
      rowHeight: 60,
      margin: [16, 16] as [number, number],
      containerPadding: [16, 16] as [number, number],
    };

    // Create the dashboard
    const dashboardId = generateId();
    const insertedDashboards = await db
      .insert(customDashboards)
      .values({
        id: dashboardId,
        workspaceId,
        createdBy: user.id,
        name,
        description,
        slug,
        status: status as 'draft' | 'published' | 'archived',
        isDefault,
        isShared,
        layout: layout || defaultLayout,
        settings: settings || {},
        publishedAt: status === 'published' ? new Date() : null,
      })
      .returning();

    const dashboard = insertedDashboards[0];

    // Create widgets if provided
    if (widgets && Array.isArray(widgets) && widgets.length > 0) {
      const widgetInserts = widgets.map((widget: Record<string, unknown>, index: number) => ({
        id: generateId(),
        dashboardId,
        widgetType: widget.widgetType as 'metric' | 'line_chart' | 'bar_chart' | 'area_chart' | 'pie_chart' | 'table' | 'text' | 'question' | 'image' | 'divider',
        title: widget.title as string | undefined,
        gridX: (widget.gridX as number) || 0,
        gridY: (widget.gridY as number) || index * 2,
        gridW: (widget.gridW as number) || 4,
        gridH: (widget.gridH as number) || 2,
        config: widget.config || {},
        style: widget.style || null,
        sortOrder: index,
      }));

      await db.insert(dashboardWidgets).values(widgetInserts);
    }

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.dashboard_created',
      resourceType: 'dashboard',
      resourceId: dashboardId,
      resourceName: name,
      metadata: {
        status,
        widgetCount: widgets?.length || 0,
      },
    });

    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
  }
}
