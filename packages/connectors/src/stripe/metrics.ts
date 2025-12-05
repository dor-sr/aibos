import { createLogger } from '@aibos/core';
import { db, saasSubscriptions, saasCustomers, saasInvoices } from '@aibos/data-model';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

const logger = createLogger('stripe:metrics');

/**
 * MRR (Monthly Recurring Revenue) calculation result
 */
export interface MRRResult {
  totalMRR: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  netNewMRR: number;
  currency: string;
}

/**
 * ARR (Annual Recurring Revenue) calculation result
 */
export interface ARRResult {
  totalARR: number;
  currency: string;
}

/**
 * Subscription metrics result
 */
export interface SubscriptionMetrics {
  totalActive: number;
  newThisPeriod: number;
  canceledThisPeriod: number;
  trialingCount: number;
  pastDueCount: number;
  churnRate: number;
}

/**
 * Customer metrics result
 */
export interface CustomerMetrics {
  totalCustomers: number;
  activeSubscribers: number;
  averageRevenuePerUser: number;
  currency: string;
}

/**
 * Calculate total MRR from active subscriptions
 */
export async function calculateMRR(
  workspaceId: string,
  currency: string = 'USD'
): Promise<number> {
  logger.debug('Calculating MRR', { workspaceId, currency });

  const result = await db
    .select({
      totalMRR: sql<string>`COALESCE(SUM(CAST(${saasSubscriptions.mrr} AS DECIMAL)), 0)`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.currency, currency),
        inArray(saasSubscriptions.status, ['active', 'trialing', 'past_due'])
      )
    );

  return parseFloat(result[0]?.totalMRR ?? '0');
}

/**
 * Calculate ARR (Annual Recurring Revenue) - MRR * 12
 */
export async function calculateARR(
  workspaceId: string,
  currency: string = 'USD'
): Promise<ARRResult> {
  const mrr = await calculateMRR(workspaceId, currency);

  return {
    totalARR: mrr * 12,
    currency,
  };
}

/**
 * Calculate detailed MRR breakdown
 */
export async function calculateMRRBreakdown(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  currency: string = 'USD'
): Promise<MRRResult> {
  logger.debug('Calculating MRR breakdown', {
    workspaceId,
    startDate,
    endDate,
    currency,
  });

  // Total current MRR
  const totalMRR = await calculateMRR(workspaceId, currency);

  // New MRR: From subscriptions created this period
  const newMRRResult = await db
    .select({
      mrr: sql<string>`COALESCE(SUM(CAST(${saasSubscriptions.mrr} AS DECIMAL)), 0)`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.currency, currency),
        gte(saasSubscriptions.sourceCreatedAt, startDate),
        lte(saasSubscriptions.sourceCreatedAt, endDate),
        inArray(saasSubscriptions.status, ['active', 'trialing'])
      )
    );

  const newMRR = parseFloat(newMRRResult[0]?.mrr ?? '0');

  // Churned MRR: From subscriptions canceled this period
  const churnedMRRResult = await db
    .select({
      mrr: sql<string>`COALESCE(SUM(CAST(${saasSubscriptions.mrr} AS DECIMAL)), 0)`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.currency, currency),
        eq(saasSubscriptions.status, 'canceled'),
        gte(saasSubscriptions.canceledAt, startDate),
        lte(saasSubscriptions.canceledAt, endDate)
      )
    );

  const churnedMRR = parseFloat(churnedMRRResult[0]?.mrr ?? '0');

  // For expansion and contraction, we would need historical MRR tracking
  // which requires comparing subscription changes over time
  // For now, we'll return 0 for these values
  const expansionMRR = 0;
  const contractionMRR = 0;

  const netNewMRR = newMRR + expansionMRR - contractionMRR - churnedMRR;

  return {
    totalMRR,
    newMRR,
    expansionMRR,
    contractionMRR,
    churnedMRR,
    netNewMRR,
    currency,
  };
}

/**
 * Get subscription metrics
 */
export async function getSubscriptionMetrics(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SubscriptionMetrics> {
  logger.debug('Getting subscription metrics', {
    workspaceId,
    startDate,
    endDate,
  });

  // Total active subscriptions
  const activeResult = await db
    .select({
      count: sql<string>`COUNT(*)`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        inArray(saasSubscriptions.status, ['active', 'trialing', 'past_due'])
      )
    );

  const totalActive = parseInt(activeResult[0]?.count ?? '0', 10);

  // Trialing count
  const trialingResult = await db
    .select({
      count: sql<string>`COUNT(*)`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.status, 'trialing')
      )
    );

  const trialingCount = parseInt(trialingResult[0]?.count ?? '0', 10);

  // Past due count
  const pastDueResult = await db
    .select({
      count: sql<string>`COUNT(*)`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.status, 'past_due')
      )
    );

  const pastDueCount = parseInt(pastDueResult[0]?.count ?? '0', 10);

  // New and canceled this period (if dates provided)
  let newThisPeriod = 0;
  let canceledThisPeriod = 0;

  if (startDate && endDate) {
    const newResult = await db
      .select({
        count: sql<string>`COUNT(*)`,
      })
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.workspaceId, workspaceId),
          eq(saasSubscriptions.source, 'stripe'),
          gte(saasSubscriptions.sourceCreatedAt, startDate),
          lte(saasSubscriptions.sourceCreatedAt, endDate)
        )
      );

    newThisPeriod = parseInt(newResult[0]?.count ?? '0', 10);

    const canceledResult = await db
      .select({
        count: sql<string>`COUNT(*)`,
      })
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.workspaceId, workspaceId),
          eq(saasSubscriptions.source, 'stripe'),
          eq(saasSubscriptions.status, 'canceled'),
          gte(saasSubscriptions.canceledAt, startDate),
          lte(saasSubscriptions.canceledAt, endDate)
        )
      );

    canceledThisPeriod = parseInt(canceledResult[0]?.count ?? '0', 10);
  }

  // Calculate churn rate
  const churnRate = totalActive > 0 ? (canceledThisPeriod / totalActive) * 100 : 0;

  return {
    totalActive,
    newThisPeriod,
    canceledThisPeriod,
    trialingCount,
    pastDueCount,
    churnRate,
  };
}

/**
 * Get customer metrics
 */
export async function getCustomerMetrics(
  workspaceId: string,
  currency: string = 'USD'
): Promise<CustomerMetrics> {
  logger.debug('Getting customer metrics', { workspaceId, currency });

  // Total customers
  const totalResult = await db
    .select({
      count: sql<string>`COUNT(*)`,
    })
    .from(saasCustomers)
    .where(
      and(
        eq(saasCustomers.workspaceId, workspaceId),
        eq(saasCustomers.source, 'stripe')
      )
    );

  const totalCustomers = parseInt(totalResult[0]?.count ?? '0', 10);

  // Active subscribers (customers with active subscriptions)
  const activeSubscribersResult = await db
    .select({
      count: sql<string>`COUNT(DISTINCT ${saasSubscriptions.customerId})`,
    })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        inArray(saasSubscriptions.status, ['active', 'trialing', 'past_due'])
      )
    );

  const activeSubscribers = parseInt(activeSubscribersResult[0]?.count ?? '0', 10);

  // Calculate ARPU (Average Revenue Per User)
  const mrr = await calculateMRR(workspaceId, currency);
  const averageRevenuePerUser = activeSubscribers > 0 ? mrr / activeSubscribers : 0;

  return {
    totalCustomers,
    activeSubscribers,
    averageRevenuePerUser,
    currency,
  };
}

/**
 * Get revenue from paid invoices in a period
 */
export async function getRevenueForPeriod(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  currency: string = 'USD'
): Promise<number> {
  logger.debug('Getting revenue for period', {
    workspaceId,
    startDate,
    endDate,
    currency,
  });

  const result = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(CAST(${saasInvoices.total} AS DECIMAL)), 0)`,
    })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.workspaceId, workspaceId),
        eq(saasInvoices.source, 'stripe'),
        eq(saasInvoices.status, 'paid'),
        eq(saasInvoices.currency, currency),
        gte(saasInvoices.paidAt, startDate),
        lte(saasInvoices.paidAt, endDate)
      )
    );

  return parseFloat(result[0]?.revenue ?? '0');
}
