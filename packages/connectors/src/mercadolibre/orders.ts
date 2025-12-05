/**
 * MercadoLibre Orders Sync
 */

import { db } from '@aibos/data-model';
import { ecommerceOrders, ecommerceOrderItems, ecommerceCustomers } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { MercadoLibreClient } from './client';
import type { MercadoLibreOrder, MercadoLibreOrderItem, MercadoLibreSyncOptions, MercadoLibreBuyer } from './types';
import { getInternalProductId } from './listings';

/**
 * Map MercadoLibre order status to internal status
 */
function mapPaymentStatus(status: string): 'pending' | 'paid' | 'refunded' | 'voided' {
  const statusMap: Record<string, 'pending' | 'paid' | 'refunded' | 'voided'> = {
    confirmed: 'pending',
    payment_required: 'pending',
    payment_in_process: 'pending',
    partially_paid: 'pending',
    paid: 'paid',
    cancelled: 'voided',
  };
  return statusMap[status] || 'pending';
}

/**
 * Map MercadoLibre fulfillment status to internal status
 */
function mapFulfillmentStatus(fulfilled: boolean | null): 'unfulfilled' | 'partial' | 'fulfilled' {
  if (fulfilled === null) return 'unfulfilled';
  return fulfilled ? 'fulfilled' : 'unfulfilled';
}

/**
 * Ensure customer exists and return ID
 */
async function ensureCustomer(
  buyer: MercadoLibreBuyer,
  workspaceId: string,
  order: MercadoLibreOrder
): Promise<string | null> {
  if (!buyer.id) return null;

  const externalId = String(buyer.id);
  
  // Check if customer exists
  const existing = await db
    .select()
    .from(ecommerceCustomers)
    .where(
      and(
        eq(ecommerceCustomers.workspaceId, workspaceId),
        eq(ecommerceCustomers.externalId, externalId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!.id;
  }

  // Create customer
  const id = crypto.randomUUID();
  await db.insert(ecommerceCustomers).values({
    id,
    workspaceId,
    externalId,
    source: 'mercadolibre',
    email: `${buyer.nickname}@mercadolibre.user`, // ML doesn't expose email in orders
    firstName: buyer.first_name || buyer.nickname,
    lastName: buyer.last_name || '',
    phone: null,
    totalOrders: 1,
    totalSpent: String(order.total_amount),
    currency: order.currency_id,
    tags: [],
    metadata: {
      nickname: buyer.nickname,
      siteId: order.context.site,
    },
    sourceCreatedAt: new Date(order.date_created),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return id;
}

/**
 * Transform MercadoLibre order to internal format
 */
function transformOrder(order: MercadoLibreOrder, workspaceId: string, customerId: string | null) {
  // Calculate total fees
  let totalFees = 0;
  for (const item of order.order_items) {
    totalFees += item.sale_fee;
  }
  for (const payment of order.payments) {
    totalFees += payment.marketplace_fee;
  }

  // Calculate net revenue
  const netRevenue = order.total_amount - totalFees;

  return {
    workspaceId,
    externalId: String(order.id),
    source: 'mercadolibre',
    orderNumber: String(order.id),
    customerId,
    status: order.status,
    financialStatus: mapPaymentStatus(order.status),
    fulfillmentStatus: mapFulfillmentStatus(order.fulfilled),
    subtotalPrice: String(order.total_amount),
    totalDiscount: String(order.coupon.amount || 0),
    totalTax: String(order.taxes?.amount || 0),
    totalShipping: '0', // Shipping is handled separately
    totalPrice: String(order.total_amount),
    currency: order.currency_id,
    itemCount: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
    discountCodes: [],
    tags: order.tags,
    note: order.comment,
    metadata: {
      siteId: order.context.site,
      packId: order.pack_id,
      channel: order.context.channel,
      flows: order.context.flows,
      buyer: {
        id: order.buyer.id,
        nickname: order.buyer.nickname,
        firstName: order.buyer.first_name,
        lastName: order.buyer.last_name,
      },
      payments: order.payments.map(p => ({
        id: p.id,
        status: p.status,
        paymentMethodId: p.payment_method_id,
        transactionAmount: p.transaction_amount,
        marketplaceFee: p.marketplace_fee,
        dateApproved: p.date_approved,
      })),
      fees: {
        totalSaleFee: order.order_items.reduce((sum, item) => sum + item.sale_fee, 0),
        totalMarketplaceFee: order.payments.reduce((sum, p) => sum + p.marketplace_fee, 0),
        total: totalFees,
      },
      netRevenue,
      shippingId: order.shipping?.id,
    },
    cancelledAt: order.status === 'cancelled' ? new Date(order.last_updated) : null,
    refundedAt: null,
    sourceCreatedAt: new Date(order.date_created),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Transform MercadoLibre order item to internal format
 */
function transformOrderItem(
  item: MercadoLibreOrderItem,
  orderId: string,
  workspaceId: string,
  productId: string | null,
  currency: string
) {
  const variantTitle = item.item.variation_attributes
    .map(v => v.value_name)
    .filter(Boolean)
    .join(' / ');

  const price = item.unit_price || 0;
  const quantity = item.quantity || 1;
  const totalPrice = price * quantity;

  return {
    id: crypto.randomUUID(),
    orderId,
    workspaceId,
    productId,
    externalId: String(item.item.variation_id || item.item.id),
    externalProductId: item.item.id,
    title: item.item.title,
    variantTitle: variantTitle || null,
    sku: item.item.seller_sku,
    quantity,
    price: String(price),
    totalDiscount: '0',
    totalPrice: String(totalPrice),
    currency,
    metadata: {
      categoryId: item.item.category_id,
      condition: item.item.condition,
      listingTypeId: item.listing_type_id,
      saleFee: item.sale_fee,
      fullUnitPrice: item.full_unit_price,
      manufacturingDays: item.manufacturing_days,
      variationId: item.item.variation_id,
    },
    createdAt: new Date(),
  };
}

/**
 * Sync orders from MercadoLibre
 */
export async function syncMercadoLibreOrders(
  client: MercadoLibreClient,
  workspaceId: string,
  options: MercadoLibreSyncOptions = {}
): Promise<number> {
  const orders = await client.fetchAllOrders(options);
  let processedCount = 0;

  for (const order of orders) {
    // Ensure customer exists
    const customerId = await ensureCustomer(order.buyer, workspaceId, order);

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
    for (const item of order.order_items) {
      const productId = await getInternalProductId(workspaceId, item.item.id);
      const itemData = transformOrderItem(item, orderId, workspaceId, productId, order.currency_id);
      await db.insert(ecommerceOrderItems).values(itemData);
    }

    processedCount++;
  }

  return processedCount;
}

/**
 * Process a single order from webhook
 */
export async function processMercadoLibreOrder(
  order: MercadoLibreOrder,
  workspaceId: string
): Promise<string> {
  const customerId = await ensureCustomer(order.buyer, workspaceId, order);
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
  for (const item of order.order_items) {
    const productId = await getInternalProductId(workspaceId, item.item.id);
    const itemData = transformOrderItem(item, orderId, workspaceId, productId, order.currency_id);
    await db.insert(ecommerceOrderItems).values(itemData);
  }

  return orderId;
}

/**
 * Calculate net revenue after fees for a workspace
 */
export async function calculateNetRevenue(
  workspaceId: string,
  startDate: Date,
  endDate: Date
): Promise<{ gross: number; fees: number; net: number }> {
  const orders = await db
    .select()
    .from(ecommerceOrders)
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        eq(ecommerceOrders.financialStatus, 'paid')
      )
    );

  let gross = 0;
  let fees = 0;

  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    if (orderDate >= startDate && orderDate <= endDate) {
      gross += parseFloat(order.totalPrice || '0');
      
      const metadata = order.metadata as { fees?: { total?: number } } | null;
      if (metadata?.fees?.total) {
        fees += metadata.fees.total;
      }
    }
  }

  return {
    gross,
    fees,
    net: gross - fees,
  };
}
