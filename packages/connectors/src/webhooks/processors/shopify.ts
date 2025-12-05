/**
 * Shopify Webhook Event Processor
 * Processes Shopify webhook events and updates the database
 */

import { createLogger } from '@aibos/core';
import type {
  WebhookEventProcessor,
  ParsedWebhookEvent,
  WebhookProcessingResult,
} from '../types';
import { emitRealtimeEvent, triggerMetricRecalculation, type RealtimeEventType } from '../../realtime';

const logger = createLogger('webhook:shopify:processor');

// Event types we handle
export const SHOPIFY_SUPPORTED_EVENTS = [
  // Order events
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'orders/fulfilled',
  // Customer events
  'customers/create',
  'customers/update',
  'customers/delete',
  // Product events
  'products/create',
  'products/update',
  'products/delete',
  // Inventory events
  'inventory_levels/update',
  // App events
  'app/uninstalled',
];

/**
 * Shopify event processor
 * Note: This is a scaffold that will be fully implemented when Shopify webhooks are set up
 */
export class ShopifyEventProcessor implements WebhookEventProcessor {
  provider = 'shopify' as const;

  getSupportedEventTypes(): string[] {
    return SHOPIFY_SUPPORTED_EVENTS;
  }

  async processEvent(
    event: ParsedWebhookEvent,
    workspaceId: string
  ): Promise<WebhookProcessingResult> {
    const eventType = event.type;
    const data = event.data;

    logger.debug('Processing Shopify event', { eventType, eventId: event.id });

    let result: WebhookProcessingResult;
    let realtimeEventType: RealtimeEventType | null = null;
    let realtimeEventData: Record<string, unknown> = {};

    try {
      // TODO: Implement full Shopify event processing
      // This will use the existing Shopify sync functions:
      // - syncShopifyOrders
      // - syncShopifyCustomers
      // - syncShopifyProducts

      switch (eventType) {
        case 'orders/create':
        case 'orders/updated':
        case 'orders/paid':
        case 'orders/fulfilled': {
          // Process order event
          const orderId = (data as { id?: string | number }).id;
          const totalPrice = (data as { total_price?: string | number }).total_price;
          logger.info('Received Shopify order event', { eventType, orderId, workspaceId });
          
          realtimeEventType = eventType === 'orders/create' ? 'order.created' : 'order.updated';
          realtimeEventData = {
            orderId: String(orderId),
            totalPrice: totalPrice ? Number(totalPrice) : 0,
            status: eventType.split('/')[1],
          };
          
          result = {
            success: true,
            eventType,
            objectId: String(orderId || 'unknown'),
            action: 'acknowledged',
            message: 'Order webhook received',
          };
          break;
        }

        case 'orders/cancelled': {
          const orderId = (data as { id?: string | number }).id;
          logger.info('Received Shopify order cancellation', { eventType, orderId, workspaceId });
          
          realtimeEventType = 'order.updated';
          realtimeEventData = {
            orderId: String(orderId),
            status: 'cancelled',
          };
          
          result = {
            success: true,
            eventType,
            objectId: String(orderId || 'unknown'),
            action: 'acknowledged',
            message: 'Order cancellation webhook received',
          };
          break;
        }

        case 'customers/create':
        case 'customers/update': {
          const customerId = (data as { id?: string | number }).id;
          const email = (data as { email?: string }).email;
          logger.info('Received Shopify customer event', { eventType, customerId, workspaceId });
          
          realtimeEventType = eventType === 'customers/create' ? 'customer.created' : 'customer.updated';
          realtimeEventData = {
            customerId: String(customerId),
            email,
          };
          
          result = {
            success: true,
            eventType,
            objectId: String(customerId || 'unknown'),
            action: 'acknowledged',
            message: 'Customer webhook received',
          };
          break;
        }

        case 'customers/delete': {
          const customerId = (data as { id?: string | number }).id;
          logger.info('Received Shopify customer deletion', { eventType, customerId, workspaceId });
          
          result = {
            success: true,
            eventType,
            objectId: String(customerId || 'unknown'),
            action: 'acknowledged',
            message: 'Customer deletion webhook received',
          };
          break;
        }

        case 'products/create':
        case 'products/update':
        case 'products/delete': {
          const productId = (data as { id?: string | number }).id;
          const title = (data as { title?: string }).title;
          logger.info('Received Shopify product event', { eventType, productId, workspaceId });
          
          if (eventType !== 'products/delete') {
            realtimeEventType = eventType === 'products/create' ? 'product.created' : 'product.updated';
            realtimeEventData = {
              productId: String(productId),
              title,
            };
          }
          
          result = {
            success: true,
            eventType,
            objectId: String(productId || 'unknown'),
            action: 'acknowledged',
            message: 'Product webhook received',
          };
          break;
        }

        case 'inventory_levels/update': {
          const inventoryItemId = (data as { inventory_item_id?: string | number }).inventory_item_id;
          logger.info('Received Shopify inventory update', { eventType, inventoryItemId, workspaceId });
          
          result = {
            success: true,
            eventType,
            objectId: String(inventoryItemId || 'unknown'),
            action: 'acknowledged',
            message: 'Inventory webhook received',
          };
          break;
        }

        case 'app/uninstalled': {
          logger.warn('Shopify app uninstalled', { workspaceId });
          result = {
            success: true,
            eventType,
            objectId: workspaceId,
            action: 'uninstalled',
            message: 'App uninstalled - connector should be deactivated',
          };
          break;
        }

        default: {
          logger.debug('Unhandled Shopify event type', { eventType });
          result = {
            success: true,
            eventType,
            objectId: 'unknown',
            action: 'ignored',
            message: `Event type ${eventType} not handled`,
          };
        }
      }

      // Emit real-time event if applicable
      if (result.success && realtimeEventType) {
        emitRealtimeEvent({
          type: realtimeEventType,
          workspaceId,
          data: {
            ...realtimeEventData,
            sourceEventId: event.id,
            sourceEventType: eventType,
          },
        });

        // Trigger metric recalculation for events that affect metrics
        triggerMetricRecalculation(workspaceId, realtimeEventType, event.id);
      }

      return result;
    } catch (err) {
      logger.error('Failed to process Shopify event', err as Error, {
        eventType,
        eventId: event.id,
      });
      return {
        success: false,
        eventType,
        objectId: 'unknown',
        action: 'error',
        error: (err as Error).message,
      };
    }
  }
}

export const shopifyProcessor = new ShopifyEventProcessor();
