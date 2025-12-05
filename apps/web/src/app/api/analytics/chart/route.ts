import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, ecommerceOrders, workspaces, workspaceMemberships } from '@aibos/data-model';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { getDateRangeForPeriod } from '@aibos/core';
import type { TimePeriod } from '@aibos/core';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace for user through membership
    const membership = await db
      .select({ workspace: workspaces })
      .from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(eq(workspaceMemberships.userId, user.id))
      .limit(1);

    const membershipData = membership[0];
    if (!membershipData) {
      // Return demo data if no workspace
      return NextResponse.json({
        data: getDemoChartData(),
        demo: true,
      });
    }

    const workspaceId = membershipData.workspace.id;

    // Get period from query params (default to last_30_days)
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'last_30_days') as TimePeriod;

    const dateRange = getDateRangeForPeriod(period);

    // Get daily revenue data
    const dailyData = await db
      .select({
        date: sql<string>`DATE(${ecommerceOrders.sourceCreatedAt})`,
        revenue: sql<number>`COALESCE(SUM(${ecommerceOrders.totalPrice}::numeric), 0)`,
      })
      .from(ecommerceOrders)
      .where(
        and(
          eq(ecommerceOrders.workspaceId, workspaceId),
          gte(ecommerceOrders.sourceCreatedAt, dateRange.start),
          lte(ecommerceOrders.sourceCreatedAt, dateRange.end)
        )
      )
      .groupBy(sql`DATE(${ecommerceOrders.sourceCreatedAt})`)
      .orderBy(sql`DATE(${ecommerceOrders.sourceCreatedAt})`);

    if (dailyData.length === 0) {
      return NextResponse.json({
        data: getDemoChartData(),
        demo: true,
      });
    }

    const chartData = dailyData.map((row) => ({
      date: formatDateLabel(new Date(row.date)),
      revenue: Number(row.revenue) || 0,
    }));

    return NextResponse.json({
      data: chartData,
      demo: false,
    });
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

function getDemoChartData() {
  // Generate demo data for the last 30 days
  const data = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate semi-random but realistic-looking revenue
    const baseRevenue = 800;
    const variance = Math.sin(i * 0.5) * 200 + Math.random() * 300;
    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;

    data.push({
      date: formatDateLabel(date),
      revenue: Math.round((baseRevenue + variance) * weekendMultiplier),
    });
  }

  return data;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
