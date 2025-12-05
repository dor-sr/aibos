import { createLogger } from '@aibos/core';
import { db, eq, and, sql, gte, desc } from '@aibos/data-model';
import {
  ecommerceProducts,
  ecommerceOrders,
  purchaseOrders,
  inventoryLevels,
  suppliers,
} from '@aibos/data-model';
import type { CommerceOpsMetrics, SupplierPerformance } from '../types';
import { getInventorySummary } from '../inventory';

const logger = createLogger('commerce-ops:metrics');

/**
 * Get comprehensive commerce operations metrics
 */
export async function getCommerceOpsMetrics(
  workspaceId: string,
  currency: string = 'USD'
): Promise<CommerceOpsMetrics> {
  logger.info('Getting commerce ops metrics', { workspaceId });

  try {
    // Get inventory summary
    const inventory = await getInventorySummary(workspaceId, currency);

    // Calculate stock value
    const productsWithPrices = await db
      .select({
        price: ecommerceProducts.price,
        quantity: ecommerceProducts.inventoryQuantity,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const stockValue = productsWithPrices.reduce((sum, p) => {
      const price = parseFloat(String(p.price || 0));
      const qty = p.quantity || 0;
      return sum + price * qty;
    }, 0);

    // Calculate turnover rate (COGS / Average Inventory)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrders.totalPrice}), 0)`,
      })
      .from(ecommerceOrders)
      .where(
        and(
          eq(ecommerceOrders.workspaceId, workspaceId),
          gte(ecommerceOrders.sourceCreatedAt, thirtyDaysAgo)
        )
      );

    const monthlyRevenue = salesData[0]?.totalRevenue || 0;
    const turnoverRate = stockValue > 0 ? (monthlyRevenue * 12) / stockValue : null;

    // Calculate average days of stock
    const levels = await db
      .select({
        daysOfStock: inventoryLevels.daysOfStock,
      })
      .from(inventoryLevels)
      .where(eq(inventoryLevels.workspaceId, workspaceId));

    const validDaysOfStock = levels
      .map((l) => parseFloat(String(l.daysOfStock || 0)))
      .filter((d) => d > 0);
    
    const avgDaysOfStock = validDaysOfStock.length > 0
      ? validDaysOfStock.reduce((sum, d) => sum + d, 0) / validDaysOfStock.length
      : null;

    // Calculate stockout and overstock rates
    const stockoutRate = inventory.totalProducts > 0
      ? (inventory.outOfStockProducts / inventory.totalProducts) * 100
      : 0;

    const overstockRate = inventory.totalProducts > 0
      ? (inventory.overstockProducts / inventory.totalProducts) * 100
      : 0;

    // Get pending purchase orders
    const pendingPOs = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.workspaceId, workspaceId),
          sql`${purchaseOrders.status} IN ('pending', 'approved', 'ordered')`
        )
      );

    return {
      inventory,
      stockValue,
      turnoverRate,
      avgDaysOfStock,
      stockoutRate,
      overstockRate,
      pendingPurchaseOrders: pendingPOs[0]?.count || 0,
      pendingPurchaseOrdersValue: pendingPOs[0]?.totalValue || 0,
      currency,
    };
  } catch (err) {
    logger.error('Error getting commerce ops metrics', err instanceof Error ? err : undefined, { workspaceId });
    return {
      inventory: {
        totalProducts: 0,
        totalStockValue: 0,
        healthyProducts: 0,
        lowStockProducts: 0,
        criticalProducts: 0,
        outOfStockProducts: 0,
        overstockProducts: 0,
        totalLocations: 0,
        activeAlerts: 0,
        currency,
      },
      stockValue: 0,
      turnoverRate: null,
      avgDaysOfStock: null,
      stockoutRate: 0,
      overstockRate: 0,
      pendingPurchaseOrders: 0,
      pendingPurchaseOrdersValue: 0,
      currency,
    };
  }
}

/**
 * Get supplier performance metrics
 */
export async function getSupplierPerformance(
  workspaceId: string,
  currency: string = 'USD'
): Promise<SupplierPerformance[]> {
  logger.info('Getting supplier performance', { workspaceId });

  try {
    const supplierList = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.workspaceId, workspaceId));

    const performances: SupplierPerformance[] = [];

    for (const supplier of supplierList) {
      // Get purchase order stats
      const poStats = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${purchaseOrders.status} = 'received' THEN ${purchaseOrders.totalAmount} ELSE 0 END), 0)`,
          receivedOrders: sql<number>`SUM(CASE WHEN ${purchaseOrders.status} = 'received' THEN 1 ELSE 0 END)`,
          onTimeOrders: sql<number>`SUM(CASE WHEN ${purchaseOrders.status} = 'received' AND ${purchaseOrders.actualDeliveryDate} <= ${purchaseOrders.expectedDeliveryDate} THEN 1 ELSE 0 END)`,
          outstandingOrders: sql<number>`SUM(CASE WHEN ${purchaseOrders.status} IN ('pending', 'approved', 'ordered') THEN 1 ELSE 0 END)`,
          outstandingValue: sql<number>`COALESCE(SUM(CASE WHEN ${purchaseOrders.status} IN ('pending', 'approved', 'ordered') THEN ${purchaseOrders.totalAmount} ELSE 0 END), 0)`,
          lastOrderDate: sql<Date>`MAX(${purchaseOrders.createdAt})`,
        })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.supplierId, supplier.id));

      const stats = poStats[0];
      const receivedCount = stats?.receivedOrders || 0;
      const onTimeCount = stats?.onTimeOrders || 0;

      performances.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalOrders: stats?.totalOrders || 0,
        onTimeDeliveryRate: receivedCount > 0 ? (onTimeCount / receivedCount) * 100 : 0,
        averageLeadTime: supplier.leadTimeDays || 0,
        totalSpent: stats?.totalSpent || 0,
        outstandingOrders: stats?.outstandingOrders || 0,
        outstandingValue: stats?.outstandingValue || 0,
        rating: supplier.rating ? parseFloat(String(supplier.rating)) : null,
        lastOrderDate: stats?.lastOrderDate || null,
        currency,
      });
    }

    // Sort by total spent
    performances.sort((a, b) => b.totalSpent - a.totalSpent);

    return performances;
  } catch (err) {
    logger.error('Error getting supplier performance', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get inventory health score (0-100)
 */
export async function getInventoryHealthScore(workspaceId: string): Promise<number> {
  const metrics = await getCommerceOpsMetrics(workspaceId);
  
  let score = 100;
  
  // Deduct for out of stock products
  score -= metrics.stockoutRate * 2;
  
  // Deduct for low/critical stock
  const criticalRate = metrics.inventory.totalProducts > 0
    ? (metrics.inventory.criticalProducts / metrics.inventory.totalProducts) * 100
    : 0;
  score -= criticalRate * 1.5;
  
  // Deduct for overstock
  score -= metrics.overstockRate * 0.5;
  
  // Bonus for good turnover
  if (metrics.turnoverRate !== null && metrics.turnoverRate > 6) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}
