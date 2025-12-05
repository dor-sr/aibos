import { createLogger, generateId } from '@aibos/core';
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
  // Transform Shopify order to normalized format
  const normalizedOrder = {
    id: generateId(),
    workspaceId,
    externalId: order.id.toString(),
    source: 'shopify',
    orderNumber: order.order_number.toString(),
    customerId: order.customer?.id?.toString(),
    status: mapOrderStatus(order),
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status,
    subtotalPrice: parseFloat(order.subtotal_price),
    totalDiscount: parseFloat(order.total_discounts),
    totalTax: parseFloat(order.total_tax),
    totalPrice: parseFloat(order.total_price),
    currency: order.currency,
    itemCount: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
    discountCodes: order.discount_codes.map((d) => d.code),
    tags: order.tags ? order.tags.split(',').map((t) => t.trim()) : [],
    note: order.note,
    cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    sourceCreatedAt: new Date(order.created_at),
  };

  // Transform line items
  const normalizedItems = order.line_items.map((item) => ({
    id: generateId(),
    workspaceId,
    orderId: normalizedOrder.id,
    externalId: item.id.toString(),
    externalProductId: item.product_id?.toString(),
    title: item.title,
    variantTitle: item.variant_title,
    sku: item.sku,
    quantity: item.quantity,
    price: parseFloat(item.price),
    totalDiscount: parseFloat(item.total_discount),
    totalPrice: parseFloat(item.price) * item.quantity - parseFloat(item.total_discount),
    currency: order.currency,
  }));

  // TODO: Write to database using @aibos/data-model
  // For now, just log
  logger.debug('Processed order', {
    orderId: normalizedOrder.externalId,
    itemCount: normalizedItems.length,
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


