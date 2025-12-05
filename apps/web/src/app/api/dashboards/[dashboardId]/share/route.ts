import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  customDashboards,
  dashboardShares,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

function generateShareToken(): string {
  // Generate a URL-safe random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

// GET /api/dashboards/[dashboardId]/share - Get share settings
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

    // Get existing shares
    const shares = await db.query.dashboardShares.findMany({
      where: eq(dashboardShares.dashboardId, dashboardId),
    });

    return NextResponse.json({
      shares: shares.map((s) => ({
        ...s,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/shared/${s.shareToken}`,
      })),
    });
  } catch (error) {
    console.error('Error fetching share settings:', error);
    return NextResponse.json({ error: 'Failed to fetch share settings' }, { status: 500 });
  }
}

// POST /api/dashboards/[dashboardId]/share - Create share link
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
      shareType = 'link',
      password,
      canView = true,
      canInteract = false,
      canExport = false,
      expiresIn, // Days until expiration
      maxViews,
      allowedDomains,
    } = body;

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

    // Generate share token
    const shareToken = generateShareToken();

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn && typeof expiresIn === 'number') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    // Create share
    const shareId = generateId();
    const insertedShares = await db
      .insert(dashboardShares)
      .values({
        id: shareId,
        dashboardId,
        shareToken,
        shareType,
        password: password || null,
        canView,
        canInteract,
        canExport,
        expiresAt,
        maxViews: maxViews || null,
        allowedDomains: allowedDomains || null,
        createdBy: user.id,
      })
      .returning();

    const share = insertedShares[0];

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.shared',
      resourceType: 'dashboard',
      resourceId: dashboardId,
      resourceName: dashboard.name,
      metadata: {
        shareType,
        shareId,
        hasPassword: !!password,
        expiresAt: expiresAt?.toISOString(),
      },
    });

    return NextResponse.json({
      share: {
        ...share,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/shared/${shareToken}`,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[dashboardId]/share - Revoke share link
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
    const shareId = searchParams.get('shareId');

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

    // Delete specific share or all shares
    if (shareId) {
      await db
        .delete(dashboardShares)
        .where(
          and(
            eq(dashboardShares.id, shareId),
            eq(dashboardShares.dashboardId, dashboardId)
          )
        );
    } else {
      await db
        .delete(dashboardShares)
        .where(eq(dashboardShares.dashboardId, dashboardId));
    }

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.unshared',
      resourceType: 'dashboard',
      resourceId: dashboardId,
      resourceName: dashboard.name,
      metadata: { shareId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share:', error);
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
  }
}


