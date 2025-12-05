import { createLogger } from '@aibos/core';
import { db, eq, and, sql, desc, gte } from '@aibos/data-model';
import {
  ecommerceProducts,
  ecommerceOrders,
  ecommerceOrderItems,
  inventoryLevels,
  inventoryLocations,
} from '@aibos/data-model';
import type {
  CommercePlatform,
  MultiChannelInventory,
  AllocationRecommendation,
  StockStatus,
} from '../types';

const logger = createLogger('commerce-ops:channel-coordinator');

/**
 * Get multi-channel inventory view
 */
export async function getMultiChannelInventory(
  workspaceId: string,
  productIds?: string[]
): Promise<MultiChannelInventory[]> {
  logger.info('Getting multi-channel inventory', { workspaceId });

  try {
    // Get products
    let productsQuery = db
      .select({
        id: ecommerceProducts.id,
        sku: ecommerceProducts.sku,
        title: ecommerceProducts.title,
        source: ecommerceProducts.source,
        inventoryQuantity: ecommerceProducts.inventoryQuantity,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const products = await productsQuery;
    const inventoryViews: MultiChannelInventory[] = [];

    for (const product of products) {
      if (productIds && !productIds.includes(product.id)) continue;

      // Get inventory levels by location
      const levels = await db
        .select({
          locationId: inventoryLevels.locationId,
          quantity: inventoryLevels.quantity,
          status: inventoryLevels.status,
          locationName: inventoryLocations.name,
          platform: inventoryLocations.platform,
        })
        .from(inventoryLevels)
        .leftJoin(inventoryLocations, eq(inventoryLevels.locationId, inventoryLocations.id))
        .where(
          and(
            eq(inventoryLevels.workspaceId, workspaceId),
            eq(inventoryLevels.productId, product.id)
          )
        );

      // Calculate total stock
      const totalStock = levels.reduce((sum, l) => sum + (l.quantity || 0), 0) || 
        (product.inventoryQuantity || 0);

      // Build channel view
      const channels = levels.map((l) => ({
        platform: (l.platform || product.source || 'shopify') as CommercePlatform,
        locationId: l.locationId,
        locationName: l.locationName || 'Default',
        stock: l.quantity || 0,
        status: (l.status || 'healthy') as StockStatus,
        allocatedPercent: totalStock > 0 ? ((l.quantity || 0) / totalStock) * 100 : 0,
      }));

      // If no inventory levels, use product source
      if (channels.length === 0) {
        channels.push({
          platform: (product.source || 'shopify') as CommercePlatform,
          locationId: 'default',
          locationName: 'Default',
          stock: product.inventoryQuantity || 0,
          status: 'healthy',
          allocatedPercent: 100,
        });
      }

      inventoryViews.push({
        productId: product.id,
        sku: product.sku,
        productName: product.title,
        totalStock,
        channels,
        recommendedAllocation: null, // Will be calculated separately
      });
    }

    return inventoryViews;
  } catch (err) {
    logger.error('Error getting multi-channel inventory', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get channel performance data
 */
export async function getChannelPerformance(
  workspaceId: string,
  days: number = 30
): Promise<{
  channel: CommercePlatform;
  totalOrders: number;
  totalRevenue: number;
  totalUnits: number;
  avgOrderValue: number;
}[]> {
  logger.info('Getting channel performance', { workspaceId, days });

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders grouped by source
    const performance = await db
      .select({
        source: ecommerceOrders.source,
        totalOrders: sql<number>`COUNT(DISTINCT ${ecommerceOrders.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(${ecommerceOrders.totalPrice}), 0)`,
        totalUnits: sql<number>`COALESCE(SUM(${ecommerceOrders.itemCount}), 0)`,
      })
      .from(ecommerceOrders)
      .where(
        and(
          eq(ecommerceOrders.workspaceId, workspaceId),
          gte(ecommerceOrders.sourceCreatedAt, startDate)
        )
      )
      .groupBy(ecommerceOrders.source);

    return performance.map((p) => ({
      channel: (p.source || 'shopify') as CommercePlatform,
      totalOrders: p.totalOrders || 0,
      totalRevenue: p.totalRevenue || 0,
      totalUnits: p.totalUnits || 0,
      avgOrderValue: p.totalOrders > 0 ? (p.totalRevenue || 0) / p.totalOrders : 0,
    }));
  } catch (err) {
    logger.error('Error getting channel performance', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get allocation recommendations
 */
export async function getAllocationRecommendations(
  workspaceId: string
): Promise<AllocationRecommendation[]> {
  logger.info('Getting allocation recommendations', { workspaceId });

  try {
    const inventory = await getMultiChannelInventory(workspaceId);
    const channelPerf = await getChannelPerformance(workspaceId, 30);
    const recommendations: AllocationRecommendation[] = [];

    // Calculate channel share of sales
    const totalRevenue = channelPerf.reduce((sum, c) => sum + c.totalRevenue, 0);
    const channelShares = new Map<CommercePlatform, number>();
    
    for (const perf of channelPerf) {
      const share = totalRevenue > 0 ? perf.totalRevenue / totalRevenue : 0;
      channelShares.set(perf.channel, share);
    }

    for (const product of inventory) {
      // Skip products with single channel
      if (product.channels.length <= 1) continue;

      // Check for imbalanced allocation
      for (const channel of product.channels) {
        const salesShare = channelShares.get(channel.platform) || 0;
        const stockShare = channel.allocatedPercent / 100;

        // If channel has high sales share but low stock share
        if (salesShare > stockShare + 0.2 && product.totalStock > 10) {
          // Find channel with excess stock
          for (const otherChannel of product.channels) {
            if (otherChannel.platform === channel.platform) continue;

            const otherSalesShare = channelShares.get(otherChannel.platform) || 0;
            const otherStockShare = otherChannel.allocatedPercent / 100;

            if (otherStockShare > otherSalesShare + 0.1) {
              const transferAmount = Math.floor(
                Math.min(
                  otherChannel.stock * 0.2, // Max 20% transfer
                  product.totalStock * (salesShare - stockShare)
                )
              );

              if (transferAmount > 0) {
                recommendations.push({
                  productId: product.productId,
                  sku: product.sku,
                  productName: product.productName,
                  sourcePlatform: otherChannel.platform,
                  targetPlatform: channel.platform,
                  currentSourceStock: otherChannel.stock,
                  currentTargetStock: channel.stock,
                  recommendedTransfer: transferAmount,
                  reason: `${channel.platform} accounts for ${(salesShare * 100).toFixed(0)}% of sales but only ${(stockShare * 100).toFixed(0)}% of stock. Consider transferring inventory from ${otherChannel.platform}.`,
                  priority: salesShare > stockShare + 0.3 ? 'high' : 'medium',
                });
              }
            }
          }
        }
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  } catch (err) {
    logger.error('Error getting allocation recommendations', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get unified product catalog across channels
 */
export async function getUnifiedCatalog(workspaceId: string): Promise<{
  productId: string;
  sku: string | null;
  productName: string;
  channels: {
    platform: CommercePlatform;
    externalId: string;
    price: number;
    status: string;
  }[];
  priceVariance: number;
  hasInconsistencies: boolean;
}[]> {
  logger.info('Getting unified catalog', { workspaceId });

  try {
    // Get products grouped by SKU to find cross-platform matches
    const products = await db
      .select({
        id: ecommerceProducts.id,
        sku: ecommerceProducts.sku,
        title: ecommerceProducts.title,
        source: ecommerceProducts.source,
        externalId: ecommerceProducts.externalId,
        price: ecommerceProducts.price,
        status: ecommerceProducts.status,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    // Group by SKU
    const skuGroups = new Map<string, typeof products>();
    
    for (const product of products) {
      const key = product.sku || product.id;
      if (!skuGroups.has(key)) {
        skuGroups.set(key, []);
      }
      skuGroups.get(key)!.push(product);
    }

    const catalog: {
      productId: string;
      sku: string | null;
      productName: string;
      channels: {
        platform: CommercePlatform;
        externalId: string;
        price: number;
        status: string;
      }[];
      priceVariance: number;
      hasInconsistencies: boolean;
    }[] = [];

    for (const [sku, groupProducts] of skuGroups) {
      const firstProduct = groupProducts[0];
      if (!firstProduct) continue;
      
      const channels = groupProducts.map((p) => ({
        platform: (p.source || 'shopify') as CommercePlatform,
        externalId: p.externalId,
        price: parseFloat(String(p.price || 0)),
        status: p.status || 'active',
      }));

      // Calculate price variance
      const prices = channels.map((c) => c.price).filter((p) => p > 0);
      let priceVariance = 0;
      if (prices.length > 1) {
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        priceVariance = maxPrice > 0 ? ((maxPrice - minPrice) / maxPrice) * 100 : 0;
      }

      catalog.push({
        productId: firstProduct.id,
        sku: firstProduct.sku,
        productName: firstProduct.title,
        channels,
        priceVariance,
        hasInconsistencies: priceVariance > 10, // More than 10% price difference
      });
    }

    // Sort by inconsistencies first
    catalog.sort((a, b) => {
      if (a.hasInconsistencies && !b.hasInconsistencies) return -1;
      if (!a.hasInconsistencies && b.hasInconsistencies) return 1;
      return b.priceVariance - a.priceVariance;
    });

    return catalog;
  } catch (err) {
    logger.error('Error getting unified catalog', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}
