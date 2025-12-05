/**
 * Tiendanube Order Sync
 */

import { db } from '@aibos/data-model';
import { ecommerceOrders, ecommerceOrderItems } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { TiendanubeClient } from './client';
import type { TiendanubeOrder, TiendanubeOrderProduct, TiendanubeSyncOptions } from './types';
import { getInternalCustomerId } from './customers';
import { getInternalProductId } from './products';

/**
 * Map Tiendanube payment status to internal status
 */
function mapPaymentStatus(status: string): 'pending' | 'paid' | 'refunded' | 'voided' {
  const statusMap: Record<string, 'pending' | 'paid' | 'refunded' | 'voided'> = {
    pending: 'pending',
    authorized: 'pending',
    paid: 'paid',
    abandoned: 'voided',
    refunded: 'refunded',
    voided: 'voided',
  };
  return statusMap[status] || 'pending';
}

/**
 * Map Tiendanube fulfillment status to internal status
 */
function mapFulfillmentStatus(status: string): 'unfulfilled' | 'partial' | 'fulfilled' {
  const statusMap: Record<string, 'unfulfilled' | 'partial' | 'fulfilled'> = {
    unpacked: 'unfulfilled',
    unfulfilled: 'unfulfilled',
    shipped: 'fulfilled',
    delivered: 'fulfilled',
  };
  return statusMap[status] || 'unfulfilled';
}

/**
 * Transform Tiendanube order to internal format
 */
function transformOrder(order: TiendanubeOrder, workspaceId: string, customerId: string | null) {
  return {
    workspaceId,
    externalId: String(order.id),
    source: 'tiendanube',
    orderNumber: String(order.number),
    customerId,
    status: order.status,
    financialStatus: mapPaymentStatus(order.payment_status),
    fulfillmentStatus: mapFulfillmentStatus(order.shipping_status),
    currency: order.currency,
    subtotalPrice: order.subtotal,
    totalDiscount: order.discount,
    totalShipping: order.shipping_cost_customer,
    totalTax: '0', // Tiendanube includes taxes in prices
    totalPrice: order.total,
    itemCount: order.products.reduce((sum, p) => sum + p.quantity, 0),
    discountCodes: order.coupon?.map(c => c.code) || [],
    tags: [],
    note: order.note,
    metadata: {
      totalUsd: order.total_usd,
      contactEmail: order.contact_email,
      storeId: order.store_id,
      token: order.token,
      gateway: order.gateway,
      gatewayName: order.gateway_name,
      shippingOption: order.shipping_option,
      shippingTrackingNumber: order.shipping_tracking_number,
      shippingTrackingUrl: order.shipping_tracking_url,
      shippingPickupType: order.shipping_pickup_type,
      storefront: order.storefront,
      paymentDetails: order.payment_details,
      clientDetails: order.client_details,
      coupon: order.coupon,
      cancelReason: order.cancel_reason,
      landingUrl: order.landing_url,
      shippingAddress: {
        name: order.contact_name,
        address: order.billing_address,
        city: order.billing_city,
        province: order.billing_province,
        zip: order.billing_zipcode,
        country: order.billing_country,
        phone: order.contact_phone,
      },
      billingAddress: {
        name: order.billing_name,
        address: order.billing_address,
        city: order.billing_city,
        province: order.billing_province,
        zip: order.billing_zipcode,
        country: order.billing_country,
        phone: order.billing_phone,
      },
    },
    cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    refundedAt: null,
    sourceCreatedAt: new Date(order.created_at),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Transform Tiendanube order item to internal format
 */
function transformOrderItem(
  item: TiendanubeOrderProduct,
  orderId: string,
  workspaceId: string,
  productId: string | null,
  currency: string
) {
  const price = parseFloat(item.price) || 0;
  const quantity = item.quantity || 1;
  const totalPrice = price * quantity;

  return {
    id: crypto.randomUUID(),
    orderId,
    workspaceId,
    productId,
    externalId: String(item.id),
    externalProductId: String(item.product_id),
    title: item.name,
    variantTitle: item.variant_values.join(' / ') || null,
    sku: item.sku,
    quantity,
    price: item.price,
    totalDiscount: '0',
    totalPrice: String(totalPrice),
    currency,
    metadata: {
      variantId: item.variant_id,
      barcode: item.barcode,
      weight: item.weight,
      imageUrl: item.image?.src,
      compareAtPrice: item.compare_at_price,
      freeShipping: item.free_shipping,
    },
    createdAt: new Date(),
  };
}

/**
 * Sync orders from Tiendanube
 */
export async function syncTiendanubeOrders(
  client: TiendanubeClient,
  workspaceId: string,
  options: TiendanubeSyncOptions = {}
): Promise<number> {
  const orders = await client.fetchAllOrders(options);
  let processedCount = 0;

  for (const order of orders) {
    // Get internal customer ID if available
    const customerId = order.customer?.id
      ? await getInternalCustomerId(workspaceId, String(order.customer.id))
      : null;

    const orderData = transformOrder(order, workspaceId, customerId);

    // Check if order exists
    const existing = await db
      .select()
      .from(ecommerceOrders)
      .where(
        and(
          eq(ecommerceOrders.workspaceId, workspaceId),
          eq(ecommerceOrders.externalId, String(order.id))
        )
      )
      .limit(1);

    let orderId: string;

    if (existing.length > 0) {
      // Update existing order
      orderId = existing[0]!.id;
      await db
        .update(ecommerceOrders)
        .set({
          ...orderData,
          updatedAt: new Date(),
        })
        .where(eq(ecommerceOrders.id, orderId));

      // Delete existing line items
      await db
        .delete(ecommerceOrderItems)
        .where(eq(ecommerceOrderItems.orderId, orderId));
    } else {
      // Insert new order
      orderId = crypto.randomUUID();
      await db.insert(ecommerceOrders).values({
        ...orderData,
        id: orderId,
      });
    }

    // Insert line items
    for (const item of order.products) {
      const productId = await getInternalProductId(workspaceId, String(item.product_id));
      const itemData = transformOrderItem(item, orderId, workspaceId, productId, order.currency);
      await db.insert(ecommerceOrderItems).values(itemData);
    }

    processedCount++;
  }

  return processedCount;
}

/**
 * Process a single order from webhook
 */
export async function processTiendanubeOrder(
  order: TiendanubeOrder,
  workspaceId: string
): Promise<string> {
  const customerId = order.customer?.id
    ? await getInternalCustomerId(workspaceId, String(order.customer.id))
    : null;

  const orderData = transformOrder(order, workspaceId, customerId);

  const existing = await db
    .select()
    .from(ecommerceOrders)
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        eq(ecommerceOrders.externalId, String(order.id))
      )
    )
    .limit(1);

  let orderId: string;

  if (existing.length > 0) {
    orderId = existing[0]!.id;
    await db
      .update(ecommerceOrders)
      .set({
        ...orderData,
        updatedAt: new Date(),
      })
      .where(eq(ecommerceOrders.id, orderId));

    // Delete and re-insert line items
    await db
      .delete(ecommerceOrderItems)
      .where(eq(ecommerceOrderItems.orderId, orderId));
  } else {
    orderId = crypto.randomUUID();
    await db.insert(ecommerceOrders).values({
      ...orderData,
      id: orderId,
    });
  }

  // Insert line items
  for (const item of order.products) {
    const productId = await getInternalProductId(workspaceId, String(item.product_id));
    const itemData = transformOrderItem(item, orderId, workspaceId, productId, order.currency);
    await db.insert(ecommerceOrderItems).values(itemData);
  }

  return orderId;
}

/**
 * Cancel an order from webhook
 */
export async function cancelTiendanubeOrder(
  workspaceId: string,
  externalId: string,
  cancelReason?: string
): Promise<void> {
  await db
    .update(ecommerceOrders)
    .set({
      financialStatus: 'voided',
      cancelledAt: new Date(),
      metadata: {
        cancelReason,
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        eq(ecommerceOrders.externalId, externalId)
      )
    );
}
