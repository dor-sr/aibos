import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import { workspaceMemberships, activityLogs, users } from '@aibos/data-model/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

// GET /api/team/activity - Get activity logs for a workspace
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify user has access to this workspace with appropriate permissions
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only admins and owners can view full activity logs
    // Members can only see their own activity
    const canViewAll = ['owner', 'admin'].includes(userMembership.role);

    // Build query conditions
    const conditions = [eq(activityLogs.workspaceId, workspaceId)];

    if (!canViewAll) {
      conditions.push(eq(activityLogs.userId, user.id));
    } else if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }

    if (action) {
      conditions.push(sql`${activityLogs.action}::text = ${action}`);
    }

    if (resourceType) {
      conditions.push(eq(activityLogs.resourceType, resourceType));
    }

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, new Date(endDate)));
    }

    // Get activity logs
    const logs = await db.query.activityLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(activityLogs.createdAt)],
      limit: Math.min(limit, 100),
      offset,
    });

    // Get user details for logs
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const logUsers =
      userIds.length > 0
        ? await db.query.users.findMany({
            where: sql`${users.id} IN (${sql.join(
              userIds.map((id) => sql`${id}`),
              sql`, `
            )})`,
          })
        : [];

    const userMap = new Map(logUsers.map((u) => [u.id, u]));

    // Format logs with user details
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      resourceName: log.resourceName,
      metadata: log.metadata,
      user: log.userId
        ? {
            id: log.userId,
            email: userMap.get(log.userId)?.email || 'Unknown',
            fullName: userMap.get(log.userId)?.fullName || null,
            avatarUrl: userMap.get(log.userId)?.avatarUrl || null,
          }
        : null,
      createdAt: log.createdAt,
    }));

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

// Export activity logs (for compliance/audit)
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
    const { workspaceId, startDate, endDate, format = 'json' } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify user has owner access (export is sensitive)
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership || userMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owners can export activity logs' },
        { status: 403 }
      );
    }

    // Build query conditions
    const conditions = [eq(activityLogs.workspaceId, workspaceId)];

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, new Date(endDate)));
    }

    // Get all logs for export (limited to last 90 days if no date range)
    if (!startDate && !endDate) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      conditions.push(gte(activityLogs.createdAt, ninetyDaysAgo));
    }

    const logs = await db.query.activityLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(activityLogs.createdAt)],
    });

    // Get user details
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const logUsers =
      userIds.length > 0
        ? await db.query.users.findMany({
            where: sql`${users.id} IN (${sql.join(
              userIds.map((id) => sql`${id}`),
              sql`, `
            )})`,
          })
        : [];

    const userMap = new Map(logUsers.map((u) => [u.id, u]));

    // Format for export
    const exportData = logs.map((log) => ({
      timestamp: log.createdAt.toISOString(),
      action: log.action,
      user_id: log.userId,
      user_email: log.userId ? userMap.get(log.userId)?.email : null,
      resource_type: log.resourceType,
      resource_id: log.resourceId,
      resource_name: log.resourceName,
      metadata: log.metadata,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
    }));

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map((row) =>
        Object.values(row)
          .map((v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'object') return JSON.stringify(v);
            return String(v).includes(',') ? `"${v}"` : v;
          })
          .join(',')
      );
      const csv = [headers, ...rows].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity-log-${workspaceId}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ logs: exportData });
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    return NextResponse.json({ error: 'Failed to export activity logs' }, { status: 500 });
  }
}
