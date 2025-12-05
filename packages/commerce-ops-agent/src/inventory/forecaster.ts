import { createLogger } from '@aibos/core';
import { db, eq, and, gte, sql, desc } from '@aibos/data-model';
import {
  ecommerceProducts,
  ecommerceOrders,
  ecommerceOrderItems,
  inventoryLevels,
  suppliers,
  purchaseOrders,
} from '@aibos/data-model';
import type { DemandForecast, ReorderRecommendation } from '../types';

const logger = createLogger('commerce-ops:inventory-forecaster');

/**
 * Get demand forecast for products
 */
export async function getDemandForecast(
  workspaceId: string,
  forecastDays: number = 30,
  productIds?: string[]
): Promise<DemandForecast[]> {
  logger.info('Generating demand forecast', { workspaceId, forecastDays });

  try {
    // Get products
    let productsQuery = db
      .select({
        id: ecommerceProducts.id,
        sku: ecommerceProducts.sku,
        title: ecommerceProducts.title,
        inventoryQuantity: ecommerceProducts.inventoryQuantity,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const products = await productsQuery;
    const forecasts: DemandForecast[] = [];

    // Calculate historical sales for each product
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    for (const product of products) {
      if (productIds && !productIds.includes(product.id)) continue;

      // Get sales in last 30 days
      const recentSales = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${ecommerceOrderItems.quantity}), 0)`,
        })
        .from(ecommerceOrderItems)
        .innerJoin(ecommerceOrders, eq(ecommerceOrderItems.orderId, ecommerceOrders.id))
        .where(
          and(
            eq(ecommerceOrderItems.productId, product.id),
            gte(ecommerceOrders.sourceCreatedAt, thirtyDaysAgo)
          )
        );

      // Get sales in previous 30 days (for trend)
      const previousSales = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${ecommerceOrderItems.quantity}), 0)`,
        })
        .from(ecommerceOrderItems)
        .innerJoin(ecommerceOrders, eq(ecommerceOrderItems.orderId, ecommerceOrders.id))
        .where(
          and(
            eq(ecommerceOrderItems.productId, product.id),
            gte(ecommerceOrders.sourceCreatedAt, sixtyDaysAgo),
            sql`${ecommerceOrders.sourceCreatedAt} < ${thirtyDaysAgo}`
          )
        );

      const recentQty = recentSales[0]?.totalQuantity || 0;
      const previousQty = previousSales[0]?.totalQuantity || 0;

      // Calculate average daily sales
      const avgDailySales = recentQty / 30;
      const currentStock = product.inventoryQuantity || 0;

      // Determine trend
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (previousQty > 0) {
        const growthRate = (recentQty - previousQty) / previousQty;
        if (growthRate > 0.1) trend = 'increasing';
        else if (growthRate < -0.1) trend = 'decreasing';
      }

      // Adjust forecast based on trend
      let adjustedDailySales = avgDailySales;
      if (trend === 'increasing') adjustedDailySales *= 1.1;
      else if (trend === 'decreasing') adjustedDailySales *= 0.9;

      // Calculate expected demand
      const expectedDemand = Math.ceil(adjustedDailySales * forecastDays);

      // Calculate stockout date
      let daysUntilStockout: number | null = null;
      let forecastedStockoutDate: Date | null = null;

      if (avgDailySales > 0) {
        daysUntilStockout = Math.floor(currentStock / avgDailySales);
        if (daysUntilStockout < forecastDays * 2) {
          forecastedStockoutDate = new Date();
          forecastedStockoutDate.setDate(forecastedStockoutDate.getDate() + daysUntilStockout);
        }
      }

      // Get inventory level info for reorder point
      const levels = await db
        .select({
          reorderPoint: inventoryLevels.reorderPoint,
          reorderQuantity: inventoryLevels.reorderQuantity,
          safetyStock: inventoryLevels.safetyStock,
        })
        .from(inventoryLevels)
        .where(
          and(
            eq(inventoryLevels.workspaceId, workspaceId),
            eq(inventoryLevels.productId, product.id)
          )
        )
        .limit(1);

      const level = levels[0];
      const reorderPoint = level?.reorderPoint || Math.ceil(avgDailySales * 7); // Default to 7 days
      const reorderQuantity = level?.reorderQuantity || expectedDemand;

      // Calculate recommended reorder date
      let recommendedReorderDate: Date | null = null;
      let recommendedReorderQuantity: number | null = null;

      if (avgDailySales > 0 && currentStock < reorderPoint + (avgDailySales * forecastDays)) {
        const daysUntilReorderPoint = Math.max(0, Math.floor((currentStock - reorderPoint) / avgDailySales));
        recommendedReorderDate = new Date();
        recommendedReorderDate.setDate(recommendedReorderDate.getDate() + daysUntilReorderPoint);
        recommendedReorderQuantity = reorderQuantity || expectedDemand;
      }

      // Determine confidence
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      if (recentQty >= 20) confidence = 'high';
      else if (recentQty < 5) confidence = 'low';

      forecasts.push({
        productId: product.id,
        sku: product.sku,
        productName: product.title,
        currentStock,
        forecastPeriodDays: forecastDays,
        expectedDemand,
        forecastedStockoutDate,
        daysUntilStockout,
        recommendedReorderDate,
        recommendedReorderQuantity,
        confidence,
        historicalAvgDailySales: avgDailySales,
        trend,
      });
    }

    // Sort by urgency (days until stockout)
    forecasts.sort((a, b) => {
      if (a.daysUntilStockout === null) return 1;
      if (b.daysUntilStockout === null) return -1;
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    return forecasts;
  } catch (err) {
    logger.error('Error generating demand forecast', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get reorder recommendations
 */
export async function getReorderRecommendations(
  workspaceId: string
): Promise<ReorderRecommendation[]> {
  logger.info('Generating reorder recommendations', { workspaceId });

  try {
    const forecasts = await getDemandForecast(workspaceId, 30);
    const recommendations: ReorderRecommendation[] = [];

    // Get suppliers for cost estimation
    const supplierList = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.workspaceId, workspaceId));

    const defaultSupplier = supplierList[0];

    for (const forecast of forecasts) {
      // Only recommend reorder if needed
      if (!forecast.recommendedReorderDate) continue;

      // Determine priority
      let priority: 'urgent' | 'high' | 'medium' | 'low';
      if (forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 3) {
        priority = 'urgent';
      } else if (forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 7) {
        priority = 'high';
      } else if (forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 14) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Generate reason
      let reason: string;
      if (forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 0) {
        reason = 'Product is out of stock.';
      } else if (forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 7) {
        reason = `Only ${forecast.daysUntilStockout} days of stock remaining based on current sales velocity.`;
      } else if (forecast.trend === 'increasing') {
        reason = 'Demand is increasing. Reorder recommended to meet expected demand.';
      } else {
        reason = 'Stock level below reorder point.';
      }

      recommendations.push({
        id: `rec_${forecast.productId}`,
        productId: forecast.productId,
        sku: forecast.sku,
        productName: forecast.productName,
        supplierId: defaultSupplier?.id || null,
        supplierName: defaultSupplier?.name || null,
        currentStock: forecast.currentStock,
        reorderPoint: Math.ceil(forecast.historicalAvgDailySales * 7), // 7 days safety
        recommendedQuantity: forecast.recommendedReorderQuantity || forecast.expectedDemand,
        estimatedCost: null, // Would need cost data
        priority,
        reason,
        expectedDeliveryDays: defaultSupplier?.leadTimeDays || 7,
      });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  } catch (err) {
    logger.error('Error generating reorder recommendations', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Calculate optimal reorder quantity using EOQ formula
 */
export function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  holdingCostPerUnit: number
): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCostPerUnit <= 0) {
    return 0;
  }
  return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit));
}

/**
 * Calculate safety stock
 */
export function calculateSafetyStock(
  avgDailySales: number,
  leadTimeDays: number,
  serviceLevelMultiplier: number = 1.65 // 95% service level
): number {
  // Simplified calculation: Z * sqrt(LT) * daily demand std dev
  // Using approximation: std dev ~ 0.5 * avg for skewed demand
  const dailyStdDev = avgDailySales * 0.5;
  return Math.ceil(serviceLevelMultiplier * Math.sqrt(leadTimeDays) * dailyStdDev);
}

/**
 * Get products at risk of stockout
 */
export async function getStockoutRiskProducts(
  workspaceId: string,
  daysThreshold: number = 14
): Promise<DemandForecast[]> {
  const forecasts = await getDemandForecast(workspaceId, daysThreshold);
  return forecasts.filter(
    (f) => f.daysUntilStockout !== null && f.daysUntilStockout <= daysThreshold
  );
}
