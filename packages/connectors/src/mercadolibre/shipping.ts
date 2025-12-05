/**
 * MercadoLibre Shipping Status Tracking
 */

import { db } from '@aibos/data-model';
import { ecommerceOrders } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@aibos/core';
import type { MercadoLibreClient } from './client';
import type { MercadoLibreShipment, MercadoLibreShipmentStatus } from './types';

const logger = createLogger('mercadolibre:shipping');

/**
 * Map MercadoLibre shipment status to internal fulfillment status
 */
function mapShipmentToFulfillment(status: MercadoLibreShipmentStatus): 'unfulfilled' | 'partial' | 'fulfilled' {
  const statusMap: Record<MercadoLibreShipmentStatus, 'unfulfilled' | 'partial' | 'fulfilled'> = {
    pending: 'unfulfilled',
    handling: 'unfulfilled',
    ready_to_ship: 'unfulfilled',
    shipped: 'partial',
    delivered: 'fulfilled',
    not_delivered: 'unfulfilled',
    cancelled: 'unfulfilled',
  };
  return statusMap[status] || 'unfulfilled';
}

/**
 * Shipping status details for display
 */
export interface ShippingStatusDetails {
  shipmentId: number;
  status: MercadoLibreShipmentStatus;
  substatus: string | null;
  trackingNumber: string | null;
  trackingMethod: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  receiverName: string | null;
  receiverAddress: string | null;
  history: {
    dateCreated: string;
    dateHandling: string | null;
    dateReadyToShip: string | null;
    dateShipped: string | null;
    dateDelivered: string | null;
    dateNotDelivered: string | null;
    dateCancelled: string | null;
  };
}

/**
 * Get shipment details and format for display
 */
export async function getShipmentDetails(
  client: MercadoLibreClient,
  shipmentId: number
): Promise<ShippingStatusDetails | null> {
  try {
    const shipment = await client.getShipment(shipmentId);

    return {
      shipmentId: shipment.id,
      status: shipment.status,
      substatus: shipment.substatus,
      trackingNumber: shipment.tracking_number,
      trackingMethod: shipment.tracking_method,
      carrier: null, // carrier_info is complex
      estimatedDelivery: shipment.shipping_option?.estimated_delivery_time?.date || null,
      receiverName: shipment.receiver_address?.receiver_name || null,
      receiverAddress: formatAddress(shipment.receiver_address),
      history: {
        dateCreated: shipment.date_created,
        dateHandling: shipment.status_history.date_handling,
        dateReadyToShip: shipment.status_history.date_ready_to_ship,
        dateShipped: shipment.status_history.date_shipped,
        dateDelivered: shipment.status_history.date_delivered,
        dateNotDelivered: shipment.status_history.date_not_delivered,
        dateCancelled: shipment.status_history.date_cancelled,
      },
    };
  } catch (error) {
    logger.error('Failed to get shipment details', error as Error);
    return null;
  }
}

/**
 * Format address for display
 */
function formatAddress(address: MercadoLibreShipment['receiver_address'] | null): string | null {
  if (!address) return null;

  const parts = [
    address.street_name,
    address.street_number,
    address.city?.name,
    address.state?.name,
    address.country?.name,
    address.zip_code,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Sync shipment status for an order
 */
export async function syncShipmentStatus(
  client: MercadoLibreClient,
  workspaceId: string,
  orderId: number
): Promise<void> {
  const shipment = await client.getShipmentByOrder(orderId);
  
  if (!shipment) {
    logger.warn('No shipment found for order', { orderId });
    return;
  }

  const fulfillmentStatus = mapShipmentToFulfillment(shipment.status);

  // Update order with shipment info
  await db
    .update(ecommerceOrders)
    .set({
      fulfillmentStatus,
      metadata: {
        shipment: {
          id: shipment.id,
          status: shipment.status,
          substatus: shipment.substatus,
          trackingNumber: shipment.tracking_number,
          carrier: shipment.tracking_method,
          shippedAt: shipment.status_history.date_shipped,
          deliveredAt: shipment.status_history.date_delivered,
          receiverAddress: formatAddress(shipment.receiver_address),
        },
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ecommerceOrders.workspaceId, workspaceId),
        eq(ecommerceOrders.externalId, String(orderId))
      )
    );

  logger.info('Synced shipment status', {
    workspaceId,
    orderId,
    shipmentId: shipment.id,
    status: shipment.status,
  });
}

/**
 * Process shipment webhook
 */
export async function processShipmentWebhook(
  client: MercadoLibreClient,
  shipmentId: number,
  workspaceId: string
): Promise<void> {
  const shipment = await client.getShipment(shipmentId);
  const fulfillmentStatus = mapShipmentToFulfillment(shipment.status);

  // Find order by shipping ID in metadata
  // Note: This requires the order to have been synced with shipping ID
  const orders = await db
    .select()
    .from(ecommerceOrders)
    .where(eq(ecommerceOrders.workspaceId, workspaceId));

  for (const order of orders) {
    const metadata = order.metadata as { shippingId?: number } | null;
    if (metadata?.shippingId === shipmentId) {
      await db
        .update(ecommerceOrders)
        .set({
          fulfillmentStatus,
          metadata: {
            ...metadata,
            shipment: {
              id: shipment.id,
              status: shipment.status,
              substatus: shipment.substatus,
              trackingNumber: shipment.tracking_number,
              carrier: shipment.tracking_method,
              shippedAt: shipment.status_history.date_shipped,
              deliveredAt: shipment.status_history.date_delivered,
            },
            shippingAddress: {
              name: shipment.receiver_address?.receiver_name || '',
              address: shipment.receiver_address?.street_name || '',
              city: shipment.receiver_address?.city?.name || '',
              province: shipment.receiver_address?.state?.name || '',
              zip: shipment.receiver_address?.zip_code || '',
              country: shipment.receiver_address?.country?.name || '',
              phone: shipment.receiver_address?.receiver_phone || '',
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(ecommerceOrders.id, order.id));

      logger.info('Updated order from shipment webhook', {
        orderId: order.id,
        shipmentId,
        status: shipment.status,
      });
      break;
    }
  }
}

/**
 * Get shipping statistics
 */
export interface ShippingStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  failed: number;
  averageDeliveryDays: number | null;
}

export async function getShippingStats(
  workspaceId: string,
  startDate: Date,
  endDate: Date
): Promise<ShippingStats> {
  const orders = await db
    .select()
    .from(ecommerceOrders)
    .where(eq(ecommerceOrders.workspaceId, workspaceId));

  const stats: ShippingStats = {
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    failed: 0,
    averageDeliveryDays: null,
  };

  let totalDeliveryTime = 0;
  let deliveredCount = 0;

  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    if (orderDate < startDate || orderDate > endDate) continue;

    const metadata = order.metadata as { 
      source?: string;
      shipment?: { 
        status?: string;
        shippedAt?: string;
        deliveredAt?: string;
      };
    } | null;

    if (metadata?.source !== 'mercadolibre') continue;

    stats.total++;

    const shipmentStatus = metadata.shipment?.status;
    switch (shipmentStatus) {
      case 'pending':
      case 'handling':
      case 'ready_to_ship':
        stats.pending++;
        break;
      case 'shipped':
        stats.inTransit++;
        break;
      case 'delivered':
        stats.delivered++;
        
        // Calculate delivery time
        if (metadata.shipment?.shippedAt && metadata.shipment?.deliveredAt) {
          const shipped = new Date(metadata.shipment.shippedAt).getTime();
          const delivered = new Date(metadata.shipment.deliveredAt).getTime();
          totalDeliveryTime += (delivered - shipped) / (1000 * 60 * 60 * 24);
          deliveredCount++;
        }
        break;
      case 'not_delivered':
      case 'cancelled':
        stats.failed++;
        break;
      default:
        stats.pending++;
    }
  }

  if (deliveredCount > 0) {
    stats.averageDeliveryDays = totalDeliveryTime / deliveredCount;
  }

  return stats;
}
