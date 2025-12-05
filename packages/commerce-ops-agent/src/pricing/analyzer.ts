import { createLogger } from '@aibos/core';
import { db, eq, and, gte, desc, sql } from '@aibos/data-model';
import {
  ecommerceProducts,
  ecommerceOrders,
  ecommerceOrderItems,
  priceHistory,
} from '@aibos/data-model';
import type { PriceAnalysis, MarginAnalysis, ProductMargin, PricingSuggestion } from '../types';

const logger = createLogger('commerce-ops:pricing-analyzer');

/**
 * Get price analysis for products
 */
export async function getPriceAnalysis(
  workspaceId: string,
  productIds?: string[]
): Promise<PriceAnalysis[]> {
  logger.info('Getting price analysis', { workspaceId });

  try {
    // Get products
    let productsQuery = db
      .select({
        id: ecommerceProducts.id,
        sku: ecommerceProducts.sku,
        title: ecommerceProducts.title,
        price: ecommerceProducts.price,
        currency: ecommerceProducts.currency,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const products = await productsQuery;
    const analyses: PriceAnalysis[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const product of products) {
      if (productIds && !productIds.includes(product.id)) continue;

      // Get price history
      const history = await db
        .select({
          price: priceHistory.price,
          cost: priceHistory.cost,
          margin: priceHistory.margin,
          marginPercent: priceHistory.marginPercent,
          effectiveDate: priceHistory.effectiveDate,
        })
        .from(priceHistory)
        .where(eq(priceHistory.productId, product.id))
        .orderBy(desc(priceHistory.effectiveDate))
        .limit(30);

      // Get sales data
      const salesData = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${ecommerceOrderItems.quantity}), 0)`,
          totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrderItems.totalPrice}), 0)`,
        })
        .from(ecommerceOrderItems)
        .innerJoin(ecommerceOrders, eq(ecommerceOrderItems.orderId, ecommerceOrders.id))
        .where(
          and(
            eq(ecommerceOrderItems.productId, product.id),
            gte(ecommerceOrders.sourceCreatedAt, thirtyDaysAgo)
          )
        );

      const currentPrice = parseFloat(String(product.price || 0));
      const latestHistory = history[0];

      analyses.push({
        productId: product.id,
        sku: product.sku,
        productName: product.title,
        currentPrice,
        cost: latestHistory?.cost ? parseFloat(String(latestHistory.cost)) : null,
        margin: latestHistory?.margin ? parseFloat(String(latestHistory.margin)) : null,
        marginPercent: latestHistory?.marginPercent ? parseFloat(String(latestHistory.marginPercent)) : null,
        priceHistory: history.map((h) => ({
          date: h.effectiveDate,
          price: parseFloat(String(h.price)),
        })),
        salesAtCurrentPrice: salesData[0]?.totalQuantity || 0,
        revenueAtCurrentPrice: salesData[0]?.totalRevenue || 0,
        currency: product.currency || 'USD',
      });
    }

    return analyses;
  } catch (err) {
    logger.error('Error getting price analysis', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get margin analysis for workspace
 */
export async function getMarginAnalysis(
  workspaceId: string,
  currency: string = 'USD'
): Promise<MarginAnalysis> {
  logger.info('Getting margin analysis', { workspaceId });

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all products with their latest price history
    const products = await db
      .select({
        id: ecommerceProducts.id,
        price: ecommerceProducts.price,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    let totalProducts = products.length;
    let productsWithMargin = 0;
    let productsWithoutCost = 0;
    let highMarginProducts = 0;
    let lowMarginProducts = 0;
    let negativeMarginProducts = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let marginSum = 0;
    let marginPercentSum = 0;

    for (const product of products) {
      // Get latest price history with cost
      const history = await db
        .select({
          cost: priceHistory.cost,
          margin: priceHistory.margin,
          marginPercent: priceHistory.marginPercent,
        })
        .from(priceHistory)
        .where(eq(priceHistory.productId, product.id))
        .orderBy(desc(priceHistory.effectiveDate))
        .limit(1);

      const latestHistory = history[0];
      const price = parseFloat(String(product.price || 0));
      const cost = latestHistory?.cost ? parseFloat(String(latestHistory.cost)) : null;

      // Get sales data
      const salesData = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${ecommerceOrderItems.quantity}), 0)`,
          totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrderItems.totalPrice}), 0)`,
        })
        .from(ecommerceOrderItems)
        .innerJoin(ecommerceOrders, eq(ecommerceOrderItems.orderId, ecommerceOrders.id))
        .where(
          and(
            eq(ecommerceOrderItems.productId, product.id),
            gte(ecommerceOrders.sourceCreatedAt, thirtyDaysAgo)
          )
        );

      const revenue = salesData[0]?.totalRevenue || 0;
      const quantity = salesData[0]?.totalQuantity || 0;
      totalRevenue += revenue;

      if (cost !== null) {
        productsWithMargin++;
        const productCost = cost * quantity;
        totalCost += productCost;

        const margin = price - cost;
        const marginPercent = cost > 0 ? ((price - cost) / price) * 100 : 0;

        marginSum += margin;
        marginPercentSum += marginPercent;
        totalProfit += margin * quantity;

        if (marginPercent >= 40) highMarginProducts++;
        else if (marginPercent >= 15) lowMarginProducts++;
        else if (marginPercent < 0) negativeMarginProducts++;
        else lowMarginProducts++;
      } else {
        productsWithoutCost++;
      }
    }

    const averageMargin = productsWithMargin > 0 ? marginSum / productsWithMargin : 0;
    const averageMarginPercent = productsWithMargin > 0 ? marginPercentSum / productsWithMargin : 0;

    return {
      totalProducts,
      averageMargin,
      averageMarginPercent,
      productsWithMargin,
      productsWithoutCost,
      highMarginProducts,
      lowMarginProducts,
      negativeMarginProducts,
      totalRevenue,
      totalCost,
      totalProfit,
      currency,
    };
  } catch (err) {
    logger.error('Error getting margin analysis', err instanceof Error ? err : undefined, { workspaceId });
    return {
      totalProducts: 0,
      averageMargin: 0,
      averageMarginPercent: 0,
      productsWithMargin: 0,
      productsWithoutCost: 0,
      highMarginProducts: 0,
      lowMarginProducts: 0,
      negativeMarginProducts: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      currency,
    };
  }
}

/**
 * Get product margins
 */
export async function getProductMargins(
  workspaceId: string,
  sortBy: 'margin' | 'marginPercent' | 'profit' = 'marginPercent'
): Promise<ProductMargin[]> {
  logger.info('Getting product margins', { workspaceId, sortBy });

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await db
      .select({
        id: ecommerceProducts.id,
        sku: ecommerceProducts.sku,
        title: ecommerceProducts.title,
        price: ecommerceProducts.price,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const margins: ProductMargin[] = [];

    for (const product of products) {
      const history = await db
        .select({
          cost: priceHistory.cost,
        })
        .from(priceHistory)
        .where(eq(priceHistory.productId, product.id))
        .orderBy(desc(priceHistory.effectiveDate))
        .limit(1);

      const salesData = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${ecommerceOrderItems.quantity}), 0)`,
          totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrderItems.totalPrice}), 0)`,
        })
        .from(ecommerceOrderItems)
        .innerJoin(ecommerceOrders, eq(ecommerceOrderItems.orderId, ecommerceOrders.id))
        .where(
          and(
            eq(ecommerceOrderItems.productId, product.id),
            gte(ecommerceOrders.sourceCreatedAt, thirtyDaysAgo)
          )
        );

      const price = parseFloat(String(product.price || 0));
      const cost = history[0]?.cost ? parseFloat(String(history[0].cost)) : null;
      const unitsSold = salesData[0]?.totalQuantity || 0;
      const revenue = salesData[0]?.totalRevenue || 0;

      let margin: number | null = null;
      let marginPercent: number | null = null;
      let profit: number | null = null;
      let category: ProductMargin['category'] = 'unknown';

      if (cost !== null) {
        margin = price - cost;
        marginPercent = price > 0 ? ((price - cost) / price) * 100 : 0;
        profit = margin * unitsSold;

        if (marginPercent >= 40) category = 'high';
        else if (marginPercent >= 15) category = 'medium';
        else if (marginPercent >= 0) category = 'low';
        else category = 'negative';
      }

      margins.push({
        productId: product.id,
        sku: product.sku,
        productName: product.title,
        price,
        cost,
        margin,
        marginPercent,
        unitsSold,
        revenue,
        profit,
        category,
      });
    }

    // Sort
    margins.sort((a, b) => {
      const aValue = a[sortBy] ?? -Infinity;
      const bValue = b[sortBy] ?? -Infinity;
      return (bValue as number) - (aValue as number);
    });

    return margins;
  } catch (err) {
    logger.error('Error getting product margins', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Record price change
 */
export async function recordPriceChange(
  workspaceId: string,
  productId: string,
  newPrice: number,
  options?: {
    cost?: number;
    compareAtPrice?: number;
    platform?: string;
    changeReason?: string;
    currency?: string;
  }
): Promise<boolean> {
  logger.info('Recording price change', { workspaceId, productId, newPrice });

  try {
    const cost = options?.cost || null;
    let margin: number | null = null;
    let marginPercent: number | null = null;

    if (cost !== null) {
      margin = newPrice - cost;
      marginPercent = newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : 0;
    }

    await db.insert(priceHistory).values({
      id: `ph_${Date.now()}_${productId}`,
      workspaceId,
      productId,
      price: String(newPrice),
      compareAtPrice: options?.compareAtPrice ? String(options.compareAtPrice) : null,
      cost: cost !== null ? String(cost) : null,
      margin: margin !== null ? String(margin) : null,
      marginPercent: marginPercent !== null ? String(marginPercent) : null,
      platform: options?.platform,
      currency: options?.currency || 'USD',
      changeReason: options?.changeReason,
      effectiveDate: new Date(),
    });

    return true;
  } catch (err) {
    logger.error('Error recording price change', err instanceof Error ? err : undefined, { workspaceId, productId });
    return false;
  }
}

/**
 * Generate pricing suggestions
 */
export async function getPricingSuggestions(
  workspaceId: string
): Promise<PricingSuggestion[]> {
  logger.info('Generating pricing suggestions', { workspaceId });

  try {
    const margins = await getProductMargins(workspaceId);
    const suggestions: PricingSuggestion[] = [];

    for (const product of margins) {
      // Skip products without cost data
      if (product.cost === null) continue;

      // Low margin products - suggest price increase
      if (product.marginPercent !== null && product.marginPercent < 15 && product.marginPercent >= 0) {
        const targetMargin = 0.25; // Target 25% margin
        const suggestedPrice = product.cost / (1 - targetMargin);
        const priceChangePercent = ((suggestedPrice - product.price) / product.price) * 100;

        suggestions.push({
          id: `sug_${product.productId}_margin`,
          productId: product.productId,
          sku: product.sku,
          productName: product.productName,
          currentPrice: product.price,
          suggestedPrice: Math.ceil(suggestedPrice * 100) / 100,
          priceChangePercent,
          reason: `Current margin of ${product.marginPercent?.toFixed(1)}% is below target. Increasing price would improve profitability.`,
          expectedImpact: `Potential margin improvement of ${(25 - (product.marginPercent || 0)).toFixed(1)} percentage points.`,
          estimatedRevenueChange: null,
          confidence: product.unitsSold > 10 ? 'medium' : 'low',
        });
      }

      // Negative margin products - critical
      if (product.marginPercent !== null && product.marginPercent < 0) {
        const targetMargin = 0.20;
        const suggestedPrice = product.cost / (1 - targetMargin);
        const priceChangePercent = ((suggestedPrice - product.price) / product.price) * 100;

        suggestions.push({
          id: `sug_${product.productId}_negative`,
          productId: product.productId,
          sku: product.sku,
          productName: product.productName,
          currentPrice: product.price,
          suggestedPrice: Math.ceil(suggestedPrice * 100) / 100,
          priceChangePercent,
          reason: `Product is selling at a loss (${product.marginPercent?.toFixed(1)}% margin). Price increase required to achieve profitability.`,
          expectedImpact: 'Eliminate losses and achieve positive margin.',
          estimatedRevenueChange: null,
          confidence: 'high',
        });
      }

      // High margin, low sales - suggest price decrease
      if (
        product.marginPercent !== null &&
        product.marginPercent > 50 &&
        product.unitsSold < 5
      ) {
        const targetMargin = 0.35;
        const suggestedPrice = product.cost / (1 - targetMargin);
        const priceChangePercent = ((suggestedPrice - product.price) / product.price) * 100;

        suggestions.push({
          id: `sug_${product.productId}_sales`,
          productId: product.productId,
          sku: product.sku,
          productName: product.productName,
          currentPrice: product.price,
          suggestedPrice: Math.ceil(suggestedPrice * 100) / 100,
          priceChangePercent,
          reason: `High margin (${product.marginPercent?.toFixed(1)}%) but low sales volume. Price reduction may increase sales.`,
          expectedImpact: 'Potential increase in sales volume while maintaining healthy margin.',
          estimatedRevenueChange: null,
          confidence: 'low',
        });
      }
    }

    // Sort by confidence
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

    return suggestions;
  } catch (err) {
    logger.error('Error generating pricing suggestions', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}
