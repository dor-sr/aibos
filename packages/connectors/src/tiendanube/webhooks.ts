/**
 * Tiendanube Webhook Handlers
 */

import type { TiendanubeWebhookPayload, TiendanubeWebhookEvent } from './types';
import { TiendanubeClient } from './client';
import { processTiendanubeOrder, cancelTiendanubeOrder } from './orders';
import { processTiendanubeProduct, deleteTiendanubeProduct } from './products';
import { createLogger } from '@aibos/core';

const logger = createLogger('tiendanube:webhooks');

export interface TiendanubeWebhookResult {
  success: boolean;
  event: TiendanubeWebhookEvent;
  entityId?: string;
  error?: string;
}

export interface TiendanubeWebhookConfig {
  workspaceId: string;
  accessToken: string;
  storeId: string;
}

/**
 * Supported Tiendanube webhook events
 */
export const TIENDANUBE_WEBHOOK_EVENTS: TiendanubeWebhookEvent[] = [
  'order/created',
  'order/updated',
  'order/paid',
  'order/packed',
  'order/fulfilled',
  'order/cancelled',
  'product/created',
  'product/updated',
  'product/deleted',
  'category/created',
  'category/updated',
  'category/deleted',
  'app/uninstalled',
];

/**
 * Verify Tiendanube webhook authenticity
 * Tiendanube doesn't use signatures, so we verify by checking the store_id matches
 */
export function verifyTiendanubeWebhook(
  payload: TiendanubeWebhookPayload,
  expectedStoreId: string
): boolean {
  return String(payload.store_id) === expectedStoreId;
}

/**
 * Process a Tiendanube webhook event
 */
export async function processTiendanubeWebhook(
  payload: TiendanubeWebhookPayload,
  config: TiendanubeWebhookConfig
): Promise<TiendanubeWebhookResult> {
  const { event, id } = payload;
  const { workspaceId, accessToken, storeId } = config;

  logger.info('Processing Tiendanube webhook', { event, id, storeId });

  // Create client for fetching full data
  const client = new TiendanubeClient({
    accessToken,
    storeId,
  });

  try {
    switch (event) {
      // Order events
      case 'order/created':
      case 'order/updated':
      case 'order/paid':
      case 'order/packed':
      case 'order/fulfilled': {
        if (!id) {
          throw new Error('Order ID missing from webhook payload');
        }
        const order = await client.getOrder(id);
        const orderId = await processTiendanubeOrder(order, workspaceId);
        return {
          success: true,
          event,
          entityId: orderId,
        };
      }

      case 'order/cancelled': {
        if (!id) {
          throw new Error('Order ID missing from webhook payload');
        }
        await cancelTiendanubeOrder(workspaceId, String(id));
        return {
          success: true,
          event,
          entityId: String(id),
        };
      }

      // Product events
      case 'product/created':
      case 'product/updated': {
        if (!id) {
          throw new Error('Product ID missing from webhook payload');
        }
        const product = await client.getProduct(id);
        const productId = await processTiendanubeProduct(product, workspaceId);
        return {
          success: true,
          event,
          entityId: productId,
        };
      }

      case 'product/deleted': {
        if (!id) {
          throw new Error('Product ID missing from webhook payload');
        }
        await deleteTiendanubeProduct(workspaceId, String(id));
        return {
          success: true,
          event,
          entityId: String(id),
        };
      }

      // Category events (handled for completeness, no action needed)
      case 'category/created':
      case 'category/updated':
      case 'category/deleted': {
        logger.info('Category event received, no action taken', { event, id });
        return {
          success: true,
          event,
          entityId: id ? String(id) : undefined,
        };
      }

      // App uninstalled
      case 'app/uninstalled': {
        logger.warn('App uninstalled event received', { storeId });
        return {
          success: true,
          event,
        };
      }

      default: {
        logger.warn('Unknown Tiendanube webhook event', { event });
        return {
          success: false,
          event,
          error: `Unknown event: ${event}`,
        };
      }
    }
  } catch (error) {
    logger.error('Failed to process Tiendanube webhook', error as Error);
    return {
      success: false,
      event,
      error: (error as Error).message,
    };
  }
}

/**
 * Get event category from event name
 */
export function getEventCategory(event: TiendanubeWebhookEvent): 'order' | 'product' | 'category' | 'app' {
  if (event.startsWith('order/')) return 'order';
  if (event.startsWith('product/')) return 'product';
  if (event.startsWith('category/')) return 'category';
  return 'app';
}

/**
 * Check if an event type is supported
 */
export function isSupportedEvent(event: string): event is TiendanubeWebhookEvent {
  return TIENDANUBE_WEBHOOK_EVENTS.includes(event as TiendanubeWebhookEvent);
}
