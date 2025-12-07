/**
 * Real-time Metrics Service
 * Handles metric recalculation triggers and caching
 */

import { createLogger } from '@aibos/core';
import {
  db,
  ecommerceOrders,
  ecommerceCustomers,
  saasSubscriptions,
  saasInvoices,
  workspaces,
} from '@aibos/data-model';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import type { MetricRecalculationRequest, MetricUpdateData, RealtimeEventType } from './types';
import { emitRealtimeEvent } from './event-emitter';

const logger = createLogger('realtime:metrics');

// Cached metrics per workspace
interface CachedMetrics {
  workspaceId: string;
  metrics: Record<string, number>;
  lastUpdated: Date;
  ttlMs: number;
}

// Default TTL for cached metrics (30 seconds)
const DEFAULT_CACHE_TTL_MS = 30000;

/**
 * Real-time Metrics Service
 * Calculates metrics on-demand and emits updates
 */
class MetricService {
  private cache: Map<string, CachedMetrics> = new Map();
  private pendingRecalculations: Map<string, MetricRecalculationRequest> = new Map();
  private recalculationDebounceMs = 1000; // 1 second debounce

  constructor() {
    logger.info('MetricService initialized');
  }

  /**
   * Request metric recalculation for a workspace
   * Debounces multiple requests within a short time window
   */
  async requestRecalculation(request: MetricRecalculationRequest): Promise<void> {
    const key = `${request.workspaceId}:${request.metricNames?.join(',') || 'all'}`;

    // Check for pending request
    const pending = this.pendingRecalculations.get(key);
    if (pending) {
      // Update priority if higher
      if (request.priority === 'high' && pending.priority !== 'high') {
        pending.priority = 'high';
      }
      return;
    }

    // Add to pending
    this.pendingRecalculations.set(key, request);

    // Schedule recalculation
    setTimeout(async () => {
      this.pendingRecalculations.delete(key);
      await this.executeRecalculation(request);
    }, this.recalculationDebounceMs);

    logger.debug('Metric recalculation scheduled', {
      workspaceId: request.workspaceId,
      metrics: request.metricNames,
      priority: request.priority,
    });
  }

  /**
   * Execute metric recalculation
   */
  private async executeRecalculation(request: MetricRecalculationRequest): Promise<void> {
    const { workspaceId, metricNames, triggeredBy, sourceEventId } = request;

    logger.info('Executing metric recalculation', {
      workspaceId,
      metricNames,
      triggeredBy,
      sourceEventId,
    });

    try {
      // Get workspace to determine vertical type
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        logger.warn('Workspace not found for metric recalculation', { workspaceId });
        return;
      }

      const previousMetrics = this.cache.get(workspaceId)?.metrics || {};
      let newMetrics: Record<string, number>;

      if (workspace.verticalType === 'ecommerce') {
        newMetrics = await this.calculateEcommerceMetrics(workspaceId);
      } else {
        newMetrics = await this.calculateSaasMetrics(workspaceId);
      }

      // Update cache
      this.cache.set(workspaceId, {
        workspaceId,
        metrics: newMetrics,
        lastUpdated: new Date(),
        ttlMs: DEFAULT_CACHE_TTL_MS,
      });

      // Emit metric update events for changed metrics
      for (const [metricName, currentValue] of Object.entries(newMetrics)) {
        const previousValue = previousMetrics[metricName] || 0;
        
        if (previousValue !== currentValue) {
          const changePercent = previousValue === 0 
            ? (currentValue > 0 ? 100 : 0)
            : ((currentValue - previousValue) / previousValue) * 100;

          const updateData: MetricUpdateData = {
            metricName,
            previousValue,
            currentValue,
            changePercent,
            period: 'current',
            currency: workspace.currency || 'USD',
          };

          emitRealtimeEvent({
            type: 'metrics.updated',
            workspaceId,
            data: { ...updateData },
          });

          logger.debug('Metric update emitted', {
            workspaceId,
            metricName,
            previousValue,
            currentValue,
            changePercent: changePercent.toFixed(2),
          });
        }
      }

      logger.info('Metric recalculation complete', {
        workspaceId,
        metricCount: Object.keys(newMetrics).length,
      });
    } catch (err) {
      logger.error('Metric recalculation failed', err as Error, { workspaceId });
    }
  }

  /**
   * Calculate ecommerce metrics
   */
  private async calculateEcommerceMetrics(workspaceId: string): Promise<Record<string, number>> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Revenue and orders
      const orderStats = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrders.totalPrice}::numeric), 0)`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(ecommerceOrders)
        .where(
          and(
            eq(ecommerceOrders.workspaceId, workspaceId),
            gte(ecommerceOrders.sourceCreatedAt, thirtyDaysAgo)
          )
        );

      // Customer count
      const customerStats = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${ecommerceCustomers.id})`,
        })
        .from(ecommerceCustomers)
        .where(eq(ecommerceCustomers.workspaceId, workspaceId));

      const stats = orderStats[0] || { totalRevenue: 0, orderCount: 0 };
      const revenue = Number(stats.totalRevenue) || 0;
      const orders = Number(stats.orderCount) || 0;
      const customers = Number(customerStats[0]?.count) || 0;
      const aov = orders > 0 ? revenue / orders : 0;

      return {
        revenue,
        orders,
        customers,
        aov,
      };
    } catch (err) {
      logger.error('Error calculating ecommerce metrics', err as Error, { workspaceId });
      return { revenue: 0, orders: 0, customers: 0, aov: 0 };
    }
  }

  /**
   * Calculate SaaS metrics
   */
  private async calculateSaasMetrics(workspaceId: string): Promise<Record<string, number>> {
    try {
      // Active subscriptions and MRR
      const subscriptionStats = await db
        .select({
          activeCount: sql<number>`COUNT(*) FILTER (WHERE ${saasSubscriptions.status} = 'active')`,
          mrr: sql<number>`COALESCE(SUM(${saasSubscriptions.mrr}::numeric) FILTER (WHERE ${saasSubscriptions.status} = 'active'), 0)`,
          trialingCount: sql<number>`COUNT(*) FILTER (WHERE ${saasSubscriptions.status} = 'trialing')`,
          canceledCount: sql<number>`COUNT(*) FILTER (WHERE ${saasSubscriptions.status} = 'canceled')`,
        })
        .from(saasSubscriptions)
        .where(eq(saasSubscriptions.workspaceId, workspaceId));

      // Paid invoices in last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const invoiceStats = await db
        .select({
          paidAmount: sql<number>`COALESCE(SUM(${saasInvoices.amountPaid}::numeric), 0)`,
        })
        .from(saasInvoices)
        .where(
          and(
            eq(saasInvoices.workspaceId, workspaceId),
            eq(saasInvoices.status, 'paid'),
            gte(saasInvoices.paidAt, thirtyDaysAgo)
          )
        );

      const stats = subscriptionStats[0] || { activeCount: 0, mrr: 0, trialingCount: 0, canceledCount: 0 };

      return {
        mrr: Number(stats.mrr) || 0,
        activeSubscriptions: Number(stats.activeCount) || 0,
        trialingSubscriptions: Number(stats.trialingCount) || 0,
        canceledSubscriptions: Number(stats.canceledCount) || 0,
        revenueLastMonth: Number(invoiceStats[0]?.paidAmount) || 0,
      };
    } catch (err) {
      logger.error('Error calculating SaaS metrics', err as Error, { workspaceId });
      return { mrr: 0, activeSubscriptions: 0, trialingSubscriptions: 0, canceledSubscriptions: 0, revenueLastMonth: 0 };
    }
  }

  /**
   * Get cached metrics for a workspace
   */
  getCachedMetrics(workspaceId: string): Record<string, number> | null {
    const cached = this.cache.get(workspaceId);
    if (!cached) return null;

    // Check if cache is still valid
    const age = Date.now() - cached.lastUpdated.getTime();
    if (age > cached.ttlMs) {
      this.cache.delete(workspaceId);
      return null;
    }

    return cached.metrics;
  }

  /**
   * Get metrics (from cache or calculate)
   */
  async getMetrics(workspaceId: string): Promise<Record<string, number>> {
    const cached = this.getCachedMetrics(workspaceId);
    if (cached) return cached;

    // Trigger recalculation
    await this.requestRecalculation({
      workspaceId,
      triggeredBy: 'manual',
      priority: 'high',
    });

    // Wait for calculation and return
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for debounce + processing
    return this.getCachedMetrics(workspaceId) || {};
  }

  /**
   * Invalidate cache for a workspace
   */
  invalidateCache(workspaceId: string): void {
    this.cache.delete(workspaceId);
    logger.debug('Cache invalidated', { workspaceId });
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cache.clear();
    logger.info('All metric caches cleared');
  }
}

// Export singleton instance
export const metricService = new MetricService();

// Helper function to trigger metric recalculation from webhook events
export function triggerMetricRecalculation(
  workspaceId: string,
  eventType: RealtimeEventType,
  sourceEventId?: string
): void {
  // Determine which metrics need updating based on event type
  let metricNames: string[] | undefined;

  switch (eventType) {
    case 'order.created':
    case 'order.updated':
      metricNames = ['revenue', 'orders', 'aov'];
      break;
    case 'customer.created':
    case 'customer.updated':
      metricNames = ['customers'];
      break;
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.canceled':
      metricNames = ['mrr', 'activeSubscriptions', 'trialingSubscriptions', 'canceledSubscriptions'];
      break;
    case 'invoice.paid':
    case 'invoice.failed':
      metricNames = ['mrr', 'revenueLastMonth'];
      break;
    default:
      // Recalculate all metrics
      metricNames = undefined;
  }

  metricService.requestRecalculation({
    workspaceId,
    metricNames,
    triggeredBy: 'webhook',
    sourceEventId,
    priority: 'high',
  });
}




