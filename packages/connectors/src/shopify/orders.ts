import { createLogger, generateId } from '@aibos/core';
import {
  db,
  ecommerceOrders,
  ecommerceOrderItems,
  ecommerceCustomers,
  type NewEcommerceOrder,
  type NewEcommerceOrderItem,
} from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { ShopifyClient, ShopifyOrder, ListOrdersParams } from './client';

const logger = createLogger('shopify:orders');

/**
 * Sync Shopify orders to normalized schema
 */
export async function syncOrders(
  client: ShopifyClient,
  workspaceId: string,
  params: ListOrdersParams = {}
): Promise<number> {
  logger.info('Syncing Shopify orders', { workspaceId, params });

  let totalProcessed = 0;
  let hasMore = true;
  let sinceId: string | undefined;

  while (hasMore) {
    const response = await client.listOrders({
      ...params,
      limit: 250,
      sinceId,
      status: 'any',
    });

    const orders = response.orders;

    if (orders.length === 0) {
      hasMore = false;
      break;
    }

    // Process orders in batch
    for (const order of orders) {
      await processOrder(order, workspaceId);
      totalProcessed++;
    }

    // Get the last order ID for pagination
    sinceId = orders[orders.length - 1]?.id.toString();

    // If we got less than the limit, we're done
    if (orders.length < 250) {
      hasMore = false;
    }
  }

  logger.info('Shopify orders sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Shopify order into normalized schema
 */
async function processOrder(order: ShopifyOrder, workspaceId: string): Promise<void> {
  const externalId = order.id.toString();

  // Check if order already exists
  const existing = await db
    .select({ id: ecommerceOrders.id })
    .from(ecommerceOrders)
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        eq(ecommerceOrders.source, 'shopify'),
        eq(ecommerceOrders.externalId, externalId)
      )
    )
    .limit(1);

  // Find customer ID if exists
  let customerId: string | null = null;
  if (order.customer?.id) {
    const customer = await db
      .select({ id: ecommerceCustomers.id })
      .from(ecommerceCustomers)
      .where(
        and(
          eq(ecommerceCustomers.workspaceId, workspaceId),
          eq(ecommerceCustomers.source, 'shopify'),
          eq(ecommerceCustomers.externalId, order.customer.id.toString())
        )
      )
      .limit(1);
    customerId = customer[0]?.id ?? null;
  }

  const orderId = existing[0]?.id ?? generateId();

  // Transform Shopify order to normalized format
  const normalizedOrder: NewEcommerceOrder = {
    id: orderId,
    workspaceId,
    customerId,
    externalId,
    source: 'shopify',
    orderNumber: order.order_number.toString(),
    status: mapOrderStatus(order),
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status,
    subtotalPrice: order.subtotal_price,
    totalDiscount: order.total_discounts,
    totalTax: order.total_tax,
    totalShipping: '0', // Shopify shipping is in shipping_lines
    totalPrice: order.total_price,
    currency: order.currency,
    itemCount: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
    discountCodes: order.discount_codes.map((d) => d.code),
    tags: order.tags ? order.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    note: order.note,
    cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    sourceCreatedAt: new Date(order.created_at),
    updatedAt: new Date(),
  };

  // Upsert order
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(ecommerceOrders)
      .set(normalizedOrder)
      .where(eq(ecommerceOrders.id, existingRecord.id));

    // Delete existing line items and re-insert
    await db
      .delete(ecommerceOrderItems)
      .where(eq(ecommerceOrderItems.orderId, existingRecord.id));
  } else {
    await db.insert(ecommerceOrders).values(normalizedOrder);
  }

  // Insert line items
  const normalizedItems: NewEcommerceOrderItem[] = order.line_items.map((item) => ({
    id: generateId(),
    workspaceId,
    orderId,
    externalId: item.id.toString(),
    externalProductId: item.product_id?.toString() ?? null,
    productId: null, // Would need to look up product
    title: item.title,
    variantTitle: item.variant_title,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    totalDiscount: item.total_discount,
    totalPrice: (parseFloat(item.price) * item.quantity - parseFloat(item.total_discount)).toFixed(2),
    currency: order.currency,
  }));

  if (normalizedItems.length > 0) {
    await db.insert(ecommerceOrderItems).values(normalizedItems);
  }

  logger.debug('Processed order', {
    orderId: externalId,
    itemCount: normalizedItems.length,
    isUpdate: existing.length > 0,
  });
}

/**
 * Map Shopify order status to normalized status
 */
function mapOrderStatus(order: ShopifyOrder): string {
  if (order.cancelled_at) return 'cancelled';
  if (order.financial_status === 'refunded') return 'refunded';
  if (order.financial_status === 'paid') {
    if (order.fulfillment_status === 'fulfilled') return 'fulfilled';
    return 'paid';
  }
  return 'pending';
}


