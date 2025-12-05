import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  db,
  ecommerceOrders,
  ecommerceCustomers,
  workspaces,
  workspaceMemberships,
} from '@aibos/data-model';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { getDateRangeForPeriod, getPreviousPeriod } from '@aibos/core';
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
        metrics: getDemoMetrics(),
        demo: true,
      });
    }

    const workspace = membershipData.workspace;
    const workspaceId = workspace.id;
    const verticalType = workspace.verticalType;

    // Get period from query params (default to last_30_days)
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'last_30_days') as TimePeriod;

    // Calculate date ranges
    const currentRange = getDateRangeForPeriod(period);
    const previousRange = getPreviousPeriod(currentRange);

    if (verticalType === 'ecommerce') {
      const metrics = await calculateEcommerceMetrics(
        workspaceId,
        currentRange,
        previousRange
      );
      return NextResponse.json({ metrics, demo: false });
    }

    // For SaaS or other verticals, return demo data for now
    return NextResponse.json({
      metrics: getDemoMetrics(),
      demo: true,
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

async function calculateEcommerceMetrics(
  workspaceId: string,
  currentRange: { start: Date; end: Date },
  previousRange: { start: Date; end: Date }
) {
  // Current period revenue and orders
  const currentStats = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrders.totalPrice}::numeric), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(ecommerceOrders)
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        gte(ecommerceOrders.sourceCreatedAt, currentRange.start),
        lte(ecommerceOrders.sourceCreatedAt, currentRange.end)
      )
    );

  // Previous period revenue and orders
  const previousStats = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrders.totalPrice}::numeric), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(ecommerceOrders)
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        gte(ecommerceOrders.sourceCreatedAt, previousRange.start),
        lte(ecommerceOrders.sourceCreatedAt, previousRange.end)
      )
    );

  // Customer counts
  const currentCustomers = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${ecommerceCustomers.id})`,
    })
    .from(ecommerceCustomers)
    .where(eq(ecommerceCustomers.workspaceId, workspaceId));

  const current = currentStats[0] || { totalRevenue: 0, orderCount: 0 };
  const previous = previousStats[0] || { totalRevenue: 0, orderCount: 0 };

  const currentRevenue = Number(current.totalRevenue) || 0;
  const previousRevenue = Number(previous.totalRevenue) || 0;
  const currentOrders = Number(current.orderCount) || 0;
  const previousOrders = Number(previous.orderCount) || 0;

  const currentAov = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const previousAov = previousOrders > 0 ? previousRevenue / previousOrders : 0;

  const customerCount = Number(currentCustomers[0]?.count) || 0;

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return [
    {
      title: 'Revenue',
      value: formatCurrency(currentRevenue),
      change: Number(calculateChange(currentRevenue, previousRevenue).toFixed(1)),
      changeLabel: 'vs last period',
      icon: 'DollarSign',
    },
    {
      title: 'Orders',
      value: formatNumber(currentOrders),
      change: Number(calculateChange(currentOrders, previousOrders).toFixed(1)),
      changeLabel: 'vs last period',
      icon: 'ShoppingCart',
    },
    {
      title: 'Customers',
      value: formatNumber(customerCount),
      change: 0, // Would need historical data to calculate
      changeLabel: 'total',
      icon: 'Users',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(currentAov),
      change: Number(calculateChange(currentAov, previousAov).toFixed(1)),
      changeLabel: 'vs last period',
      icon: 'CreditCard',
    },
  ];
}

function getDemoMetrics() {
  return [
    {
      title: 'Revenue',
      value: '$24,500',
      change: 12.5,
      changeLabel: 'vs last period',
      icon: 'DollarSign',
    },
    {
      title: 'Orders',
      value: '356',
      change: 8.2,
      changeLabel: 'vs last period',
      icon: 'ShoppingCart',
    },
    {
      title: 'Customers',
      value: '2,340',
      change: -2.4,
      changeLabel: 'vs last period',
      icon: 'Users',
    },
    {
      title: 'Avg Order Value',
      value: '$68.82',
      change: 4.1,
      changeLabel: 'vs last period',
      icon: 'CreditCard',
    },
  ];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
