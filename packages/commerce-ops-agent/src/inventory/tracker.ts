import { createLogger } from '@aibos/core';
import { db, eq, and, desc, sql, isNull } from '@aibos/data-model';
import {
  inventoryLevels,
  inventoryLocations,
  stockMovements,
  stockAlerts,
  ecommerceProducts,
  ecommerceOrders,
  ecommerceOrderItems,
} from '@aibos/data-model';
import { v4 as uuidv4 } from 'uuid';
import type { InventoryStatus, InventorySummary, StockAlert, StockStatus } from '../types';

const logger = createLogger('commerce-ops:inventory-tracker');

/**
 * Get inventory status for all products in a workspace
 */
export async function getInventoryStatus(workspaceId: string): Promise<InventoryStatus[]> {
  logger.info('Getting inventory status', { workspaceId });

  try {
    // Get products with their inventory levels
    const products = await db
      .select({
        productId: ecommerceProducts.id,
        sku: ecommerceProducts.sku,
        name: ecommerceProducts.title,
        inventoryQuantity: ecommerceProducts.inventoryQuantity,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const inventoryStatusList: InventoryStatus[] = [];

    for (const product of products) {
      // Get inventory levels across locations
      const levels = await db
        .select({
          levelId: inventoryLevels.id,
          locationId: inventoryLevels.locationId,
          quantity: inventoryLevels.quantity,
          reservedQuantity: inventoryLevels.reservedQuantity,
          availableQuantity: inventoryLevels.availableQuantity,
          reorderPoint: inventoryLevels.reorderPoint,
          safetyStock: inventoryLevels.safetyStock,
          status: inventoryLevels.status,
          daysOfStock: inventoryLevels.daysOfStock,
          averageDailySales: inventoryLevels.averageDailySales,
          locationName: inventoryLocations.name,
        })
        .from(inventoryLevels)
        .leftJoin(inventoryLocations, eq(inventoryLevels.locationId, inventoryLocations.id))
        .where(
          and(
            eq(inventoryLevels.workspaceId, workspaceId),
            eq(inventoryLevels.productId, product.productId)
          )
        );

      // Calculate totals
      const totalStock = levels.reduce((sum, l) => sum + (l.quantity || 0), 0);
      const totalAvailable = levels.reduce((sum, l) => sum + (l.availableQuantity || 0), 0);
      const totalReserved = levels.reduce((sum, l) => sum + (l.reservedQuantity || 0), 0);

      // If no inventory levels, use product's inventory quantity
      const currentStock = totalStock > 0 ? totalStock : (product.inventoryQuantity || 0);

      // Determine overall status
      const status = determineStockStatus(
        currentStock,
        levels[0]?.reorderPoint || null,
        levels[0]?.safetyStock || 0
      );

      // Calculate average daily sales
      const avgDailySales = levels.length > 0
        ? levels.reduce((sum, l) => sum + parseFloat(String(l.averageDailySales || 0)), 0) / levels.length
        : null;

      // Calculate days of stock
      const daysOfStock = avgDailySales && avgDailySales > 0
        ? currentStock / avgDailySales
        : null;

      inventoryStatusList.push({
        productId: product.productId,
        sku: product.sku,
        name: product.name,
        currentStock,
        availableStock: totalAvailable || currentStock,
        reservedStock: totalReserved,
        daysOfStock,
        reorderPoint: levels[0]?.reorderPoint || null,
        safetyStock: levels[0]?.safetyStock || 0,
        status,
        averageDailySales: avgDailySales,
        locations: levels.map((l) => ({
          locationId: l.locationId,
          locationName: l.locationName || 'Default',
          quantity: l.quantity || 0,
          status: (l.status as StockStatus) || 'healthy',
        })),
      });
    }

    return inventoryStatusList;
  } catch (err) {
    logger.error('Error getting inventory status', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Get inventory summary for a workspace
 */
export async function getInventorySummary(
  workspaceId: string,
  currency: string = 'USD'
): Promise<InventorySummary> {
  logger.info('Getting inventory summary', { workspaceId });

  try {
    const statuses = await getInventoryStatus(workspaceId);

    // Get total locations
    const locations = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.workspaceId, workspaceId));

    // Get active alerts
    const alerts = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockAlerts)
      .where(
        and(
          eq(stockAlerts.workspaceId, workspaceId),
          eq(stockAlerts.isResolved, false)
        )
      );

    // Calculate stock value (approximation using price * quantity)
    const productsWithPrices = await db
      .select({
        price: ecommerceProducts.price,
        quantity: ecommerceProducts.inventoryQuantity,
      })
      .from(ecommerceProducts)
      .where(eq(ecommerceProducts.workspaceId, workspaceId));

    const totalStockValue = productsWithPrices.reduce((sum, p) => {
      const price = parseFloat(String(p.price || 0));
      const qty = p.quantity || 0;
      return sum + price * qty;
    }, 0);

    return {
      totalProducts: statuses.length,
      totalStockValue,
      healthyProducts: statuses.filter((s) => s.status === 'healthy').length,
      lowStockProducts: statuses.filter((s) => s.status === 'low').length,
      criticalProducts: statuses.filter((s) => s.status === 'critical').length,
      outOfStockProducts: statuses.filter((s) => s.status === 'out_of_stock').length,
      overstockProducts: statuses.filter((s) => s.status === 'overstock').length,
      totalLocations: locations[0]?.count || 1,
      activeAlerts: alerts[0]?.count || 0,
      currency,
    };
  } catch (err) {
    logger.error('Error getting inventory summary', err instanceof Error ? err : undefined, { workspaceId });
    return {
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
    };
  }
}

/**
 * Get stock alerts for a workspace
 */
export async function getStockAlerts(
  workspaceId: string,
  includeResolved: boolean = false
): Promise<StockAlert[]> {
  logger.info('Getting stock alerts', { workspaceId, includeResolved });

  try {
    const whereConditions = includeResolved
      ? eq(stockAlerts.workspaceId, workspaceId)
      : and(
          eq(stockAlerts.workspaceId, workspaceId),
          eq(stockAlerts.isResolved, false)
        );

    const alerts = await db
      .select({
        id: stockAlerts.id,
        productId: stockAlerts.productId,
        locationId: stockAlerts.locationId,
        type: stockAlerts.type,
        severity: stockAlerts.severity,
        title: stockAlerts.title,
        message: stockAlerts.message,
        suggestedAction: stockAlerts.suggestedAction,
        currentStock: stockAlerts.currentStock,
        threshold: stockAlerts.threshold,
        isResolved: stockAlerts.isResolved,
        createdAt: stockAlerts.createdAt,
        productName: ecommerceProducts.title,
        sku: ecommerceProducts.sku,
        locationName: inventoryLocations.name,
      })
      .from(stockAlerts)
      .leftJoin(ecommerceProducts, eq(stockAlerts.productId, ecommerceProducts.id))
      .leftJoin(inventoryLocations, eq(stockAlerts.locationId, inventoryLocations.id))
      .where(whereConditions)
      .orderBy(desc(stockAlerts.createdAt));

    return alerts.map((a) => ({
      id: a.id,
      productId: a.productId,
      sku: a.sku,
      productName: a.productName || 'Unknown Product',
      locationId: a.locationId,
      locationName: a.locationName,
      type: a.type as StockAlert['type'],
      severity: a.severity as StockAlert['severity'],
      title: a.title,
      message: a.message || '',
      suggestedAction: a.suggestedAction || '',
      currentStock: a.currentStock || 0,
      threshold: a.threshold,
      isResolved: a.isResolved || false,
      createdAt: a.createdAt,
    }));
  } catch (err) {
    logger.error('Error getting stock alerts', err instanceof Error ? err : undefined, { workspaceId });
    return [];
  }
}

/**
 * Create a stock alert
 */
export async function createStockAlert(
  workspaceId: string,
  productId: string,
  alert: Omit<StockAlert, 'id' | 'productId' | 'productName' | 'sku' | 'isResolved' | 'createdAt'>
): Promise<StockAlert | null> {
  logger.info('Creating stock alert', { workspaceId, productId, type: alert.type });

  try {
    const id = uuidv4();

    await db.insert(stockAlerts).values({
      id,
      workspaceId,
      productId,
      locationId: alert.locationId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      suggestedAction: alert.suggestedAction,
      currentStock: alert.currentStock,
      threshold: alert.threshold,
      isResolved: false,
    });

    // Fetch the created alert with product info
    const alerts = await getStockAlerts(workspaceId);
    return alerts.find((a) => a.id === id) || null;
  } catch (err) {
    logger.error('Error creating stock alert', err instanceof Error ? err : undefined, { workspaceId, productId });
    return null;
  }
}

/**
 * Resolve a stock alert
 */
export async function resolveStockAlert(
  alertId: string,
  resolvedBy?: string
): Promise<boolean> {
  logger.info('Resolving stock alert', { alertId, resolvedBy });

  try {
    await db
      .update(stockAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      })
      .where(eq(stockAlerts.id, alertId));

    return true;
  } catch (err) {
    logger.error('Error resolving stock alert', err instanceof Error ? err : undefined, { alertId });
    return false;
  }
}

/**
 * Record a stock movement
 */
export async function recordStockMovement(
  workspaceId: string,
  productId: string,
  locationId: string,
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return',
  quantity: number,
  options?: {
    reason?: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }
): Promise<boolean> {
  logger.info('Recording stock movement', { workspaceId, productId, type, quantity });

  try {
    // Get current inventory level
    const levels = await db
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.workspaceId, workspaceId),
          eq(inventoryLevels.productId, productId),
          eq(inventoryLevels.locationId, locationId)
        )
      );

    const currentLevel = levels[0];
    const previousQuantity = currentLevel?.quantity || 0;
    const newQuantity = type === 'out' ? previousQuantity - quantity : previousQuantity + quantity;

    // Record the movement
    await db.insert(stockMovements).values({
      id: uuidv4(),
      workspaceId,
      productId,
      locationId,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      reason: options?.reason,
      referenceType: options?.referenceType,
      referenceId: options?.referenceId,
      notes: options?.notes,
      createdBy: options?.createdBy,
    });

    // Update inventory level
    if (currentLevel) {
      const status = determineStockStatus(
        newQuantity,
        currentLevel.reorderPoint,
        currentLevel.safetyStock || 0
      );

      await db
        .update(inventoryLevels)
        .set({
          quantity: newQuantity,
          availableQuantity: newQuantity - (currentLevel.reservedQuantity || 0),
          status,
          lastStockUpdate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryLevels.id, currentLevel.id));
    }

    return true;
  } catch (err) {
    logger.error('Error recording stock movement', err instanceof Error ? err : undefined, { workspaceId, productId });
    return false;
  }
}

/**
 * Determine stock status based on quantity and thresholds
 */
function determineStockStatus(
  quantity: number,
  reorderPoint: number | null,
  safetyStock: number
): StockStatus {
  if (quantity <= 0) {
    return 'out_of_stock';
  }

  if (quantity <= safetyStock) {
    return 'critical';
  }

  if (reorderPoint && quantity <= reorderPoint) {
    return 'low';
  }

  // Check for overstock (more than 3x the reorder point, if set)
  if (reorderPoint && quantity > reorderPoint * 3) {
    return 'overstock';
  }

  return 'healthy';
}

/**
 * Check inventory and generate alerts
 */
export async function checkInventoryAlerts(workspaceId: string): Promise<StockAlert[]> {
  logger.info('Checking inventory alerts', { workspaceId });

  const statuses = await getInventoryStatus(workspaceId);
  const newAlerts: StockAlert[] = [];

  for (const status of statuses) {
    if (status.status === 'out_of_stock') {
      const alert = await createStockAlert(workspaceId, status.productId, {
        locationId: status.locations[0]?.locationId || null,
        locationName: status.locations[0]?.locationName || null,
        type: 'out_of_stock',
        severity: 'critical',
        title: `Out of Stock: ${status.name}`,
        message: `Product "${status.name}" is out of stock.`,
        suggestedAction: 'Create a purchase order immediately to replenish stock.',
        currentStock: status.currentStock,
        threshold: 0,
      });
      if (alert) newAlerts.push(alert);
    } else if (status.status === 'critical') {
      const alert = await createStockAlert(workspaceId, status.productId, {
        locationId: status.locations[0]?.locationId || null,
        locationName: status.locations[0]?.locationName || null,
        type: 'low_stock',
        severity: 'high',
        title: `Critical Stock: ${status.name}`,
        message: `Product "${status.name}" is at critical stock level (${status.currentStock} units).`,
        suggestedAction: 'Order immediately to avoid stockout.',
        currentStock: status.currentStock,
        threshold: status.safetyStock,
      });
      if (alert) newAlerts.push(alert);
    } else if (status.status === 'low') {
      const alert = await createStockAlert(workspaceId, status.productId, {
        locationId: status.locations[0]?.locationId || null,
        locationName: status.locations[0]?.locationName || null,
        type: 'reorder_needed',
        severity: 'medium',
        title: `Low Stock: ${status.name}`,
        message: `Product "${status.name}" is below reorder point (${status.currentStock} units).`,
        suggestedAction: 'Consider placing a reorder.',
        currentStock: status.currentStock,
        threshold: status.reorderPoint,
      });
      if (alert) newAlerts.push(alert);
    } else if (status.status === 'overstock') {
      const alert = await createStockAlert(workspaceId, status.productId, {
        locationId: status.locations[0]?.locationId || null,
        locationName: status.locations[0]?.locationName || null,
        type: 'overstock',
        severity: 'low',
        title: `Overstock: ${status.name}`,
        message: `Product "${status.name}" has excess inventory (${status.currentStock} units).`,
        suggestedAction: 'Consider running a promotion or adjusting future orders.',
        currentStock: status.currentStock,
        threshold: status.reorderPoint ? status.reorderPoint * 3 : null,
      });
      if (alert) newAlerts.push(alert);
    }
  }

  return newAlerts;
}
