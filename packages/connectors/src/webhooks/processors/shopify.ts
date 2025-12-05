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

    try {
      // TODO: Implement Shopify event processing
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
          logger.info('Received Shopify order event', { eventType, orderId, workspaceId });
          return {
            success: true,
            eventType,
            objectId: String(orderId || 'unknown'),
            action: 'acknowledged',
            message: 'Order webhook received - full processing not yet implemented',
          };
        }

        case 'orders/cancelled': {
          const orderId = (data as { id?: string | number }).id;
          logger.info('Received Shopify order cancellation', { eventType, orderId, workspaceId });
          return {
            success: true,
            eventType,
            objectId: String(orderId || 'unknown'),
            action: 'acknowledged',
            message: 'Order cancellation webhook received',
          };
        }

        case 'customers/create':
        case 'customers/update': {
          const customerId = (data as { id?: string | number }).id;
          logger.info('Received Shopify customer event', { eventType, customerId, workspaceId });
          return {
            success: true,
            eventType,
            objectId: String(customerId || 'unknown'),
            action: 'acknowledged',
            message: 'Customer webhook received',
          };
        }

        case 'customers/delete': {
          const customerId = (data as { id?: string | number }).id;
          logger.info('Received Shopify customer deletion', { eventType, customerId, workspaceId });
          return {
            success: true,
            eventType,
            objectId: String(customerId || 'unknown'),
            action: 'acknowledged',
            message: 'Customer deletion webhook received',
          };
        }

        case 'products/create':
        case 'products/update':
        case 'products/delete': {
          const productId = (data as { id?: string | number }).id;
          logger.info('Received Shopify product event', { eventType, productId, workspaceId });
          return {
            success: true,
            eventType,
            objectId: String(productId || 'unknown'),
            action: 'acknowledged',
            message: 'Product webhook received',
          };
        }

        case 'inventory_levels/update': {
          const inventoryItemId = (data as { inventory_item_id?: string | number }).inventory_item_id;
          logger.info('Received Shopify inventory update', { eventType, inventoryItemId, workspaceId });
          return {
            success: true,
            eventType,
            objectId: String(inventoryItemId || 'unknown'),
            action: 'acknowledged',
            message: 'Inventory webhook received',
          };
        }

        case 'app/uninstalled': {
          logger.warn('Shopify app uninstalled', { workspaceId });
          return {
            success: true,
            eventType,
            objectId: workspaceId,
            action: 'uninstalled',
            message: 'App uninstalled - connector should be deactivated',
          };
        }

        default: {
          logger.debug('Unhandled Shopify event type', { eventType });
          return {
            success: true,
            eventType,
            objectId: 'unknown',
            action: 'ignored',
            message: `Event type ${eventType} not handled`,
          };
        }
      }
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
