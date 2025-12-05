/**
 * Tiendanube Webhook Event Processor
 * Processes Tiendanube webhook events and updates the database
 */

import { createLogger } from '@aibos/core';
import type {
  WebhookEventProcessor,
  ParsedWebhookEvent,
  WebhookProcessingResult,
} from '../types';
import { processTiendanubeOrder, cancelTiendanubeOrder } from '../../tiendanube/orders';
import { processTiendanubeProduct, deleteTiendanubeProduct } from '../../tiendanube/products';
import { processTiendanubeCustomer } from '../../tiendanube/customers';

const logger = createLogger('webhook:tiendanube:processor');

// Event types we handle
export const TIENDANUBE_SUPPORTED_EVENTS = [
  // Order events
  'order/created',
  'order/updated',
  'order/paid',
  'order/packed',
  'order/fulfilled',
  'order/cancelled',
  // Product events
  'product/created',
  'product/updated',
  'product/deleted',
  // Category events
  'category/created',
  'category/updated',
  'category/deleted',
  // App events
  'app/uninstalled',
];

/**
 * Tiendanube event processor
 */
export class TiendanubeEventProcessor implements WebhookEventProcessor {
  provider = 'tiendanube' as const;

  getSupportedEventTypes(): string[] {
    return TIENDANUBE_SUPPORTED_EVENTS;
  }

  async processEvent(
    event: ParsedWebhookEvent,
    workspaceId: string
  ): Promise<WebhookProcessingResult> {
    const eventType = event.type;
    const data = event.data;

    logger.debug('Processing Tiendanube event', { eventType, eventId: event.id });

    try {
      // Handle order events
      if (eventType.startsWith('order/')) {
        return await this.processOrderEvent(eventType, data, workspaceId);
      }

      // Handle product events
      if (eventType.startsWith('product/')) {
        return await this.processProductEvent(eventType, data, workspaceId);
      }

      // Handle category events (logged but not processed)
      if (eventType.startsWith('category/')) {
        return {
          success: true,
          eventType,
          objectId: String(data.id || 'unknown'),
          action: 'acknowledged',
          message: 'Category events logged for future use',
        };
      }

      // App uninstalled
      if (eventType === 'app/uninstalled') {
        logger.info('Tiendanube app uninstalled', { workspaceId });
        return {
          success: true,
          eventType,
          objectId: workspaceId,
          action: 'uninstalled',
        };
      }

      return {
        success: true,
        eventType,
        objectId: 'unknown',
        action: 'ignored',
        message: `Event type ${eventType} not handled`,
      };
    } catch (err) {
      logger.error('Failed to process Tiendanube event', err as Error, {
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

  private async processOrderEvent(
    eventType: string,
    data: Record<string, unknown>,
    workspaceId: string
  ): Promise<WebhookProcessingResult> {
    const orderId = String(data.id || 'unknown');

    switch (eventType) {
      case 'order/created':
      case 'order/updated':
      case 'order/paid':
      case 'order/packed':
      case 'order/fulfilled': {
        // Need to fetch full order data from API
        // For now, acknowledge the event
        return {
          success: true,
          eventType,
          objectId: orderId,
          action: eventType.split('/')[1] || 'updated',
          message: 'Order event received - full sync recommended',
        };
      }

      case 'order/cancelled': {
        // For cancel, we might have enough info
        if (data.id) {
          const cancelReason = data.cancel_reason as string | undefined;
          await cancelTiendanubeOrder(workspaceId, String(data.id), cancelReason);
        }
        return {
          success: true,
          eventType,
          objectId: orderId,
          action: 'cancelled',
        };
      }

      default:
        return {
          success: true,
          eventType,
          objectId: orderId,
          action: 'ignored',
        };
    }
  }

  private async processProductEvent(
    eventType: string,
    data: Record<string, unknown>,
    workspaceId: string
  ): Promise<WebhookProcessingResult> {
    const productId = String(data.id || 'unknown');

    switch (eventType) {
      case 'product/created':
      case 'product/updated': {
        // Need full product data from API
        return {
          success: true,
          eventType,
          objectId: productId,
          action: eventType.split('/')[1] || 'updated',
          message: 'Product event received - full sync recommended',
        };
      }

      case 'product/deleted': {
        if (data.id) {
          await deleteTiendanubeProduct(workspaceId, String(data.id));
        }
        return {
          success: true,
          eventType,
          objectId: productId,
          action: 'deleted',
        };
      }

      default:
        return {
          success: true,
          eventType,
          objectId: productId,
          action: 'ignored',
        };
    }
  }
}

export const tiendanubeProcessor = new TiendanubeEventProcessor();
