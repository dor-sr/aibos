/**
 * MercadoLibre Webhook Handlers
 */

import type { MercadoLibreNotification, MercadoLibreWebhookTopic } from './types';
import { MercadoLibreClient } from './client';
import { processMercadoLibreOrder } from './orders';
import { processMercadoLibreListing, updateMercadoLibreListingStatus } from './listings';
import { processMercadoLibreQuestion } from './questions';
import { processShipmentWebhook } from './shipping';
import { createLogger } from '@aibos/core';

const logger = createLogger('mercadolibre:webhooks');

export interface MercadoLibreWebhookResult {
  success: boolean;
  topic: MercadoLibreWebhookTopic;
  resourceId?: string;
  error?: string;
}

export interface MercadoLibreWebhookConfig {
  workspaceId: string;
  accessToken: string;
  userId: string;
  siteId: string;
}

/**
 * Supported MercadoLibre webhook topics
 */
export const MERCADOLIBRE_WEBHOOK_TOPICS: MercadoLibreWebhookTopic[] = [
  'orders_v2',
  'items',
  'questions',
  'messages',
  'payments',
  'shipments',
  'claims',
  'invoices',
];

/**
 * Extract resource ID from resource path
 * Resource paths are like: /orders/123456789 or /items/MLA12345
 */
function extractResourceId(resource: string): string {
  const parts = resource.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Process a MercadoLibre webhook notification
 */
export async function processMercadoLibreWebhook(
  notification: MercadoLibreNotification,
  config: MercadoLibreWebhookConfig
): Promise<MercadoLibreWebhookResult> {
  const { topic, resource, user_id } = notification;
  const { workspaceId, accessToken, userId, siteId } = config;

  // Verify the notification is for the correct user
  if (String(user_id) !== userId) {
    logger.warn('Webhook user_id mismatch', {
      expected: userId,
      received: user_id,
    });
    return {
      success: false,
      topic,
      error: 'User ID mismatch',
    };
  }

  const resourceId = extractResourceId(resource);
  logger.info('Processing MercadoLibre webhook', { topic, resourceId, userId });

  // Create client for fetching full data
  const client = new MercadoLibreClient({
    accessToken,
    userId,
    siteId: siteId as 'MLA' | 'MLB' | 'MLM' | 'MLC',
  });

  try {
    switch (topic) {
      case 'orders_v2': {
        const order = await client.getOrder(parseInt(resourceId, 10));
        const orderId = await processMercadoLibreOrder(order, workspaceId);
        return {
          success: true,
          topic,
          resourceId: orderId,
        };
      }

      case 'items': {
        const item = await client.getItem(resourceId);
        const productId = await processMercadoLibreListing(item, workspaceId);
        return {
          success: true,
          topic,
          resourceId: productId,
        };
      }

      case 'questions': {
        const question = await processMercadoLibreQuestion(client, parseInt(resourceId, 10), workspaceId);
        return {
          success: true,
          topic,
          resourceId: String(question.id),
        };
      }

      case 'shipments': {
        await processShipmentWebhook(client, parseInt(resourceId, 10), workspaceId);
        return {
          success: true,
          topic,
          resourceId,
        };
      }

      case 'payments': {
        // Payment updates typically come with order updates
        // We could fetch the payment and update the order if needed
        logger.info('Payment webhook received', { resourceId });
        return {
          success: true,
          topic,
          resourceId,
        };
      }

      case 'messages': {
        // Messages are for the messaging system between buyer/seller
        logger.info('Message webhook received', { resourceId });
        return {
          success: true,
          topic,
          resourceId,
        };
      }

      case 'claims': {
        // Claims are disputes/returns
        logger.info('Claim webhook received', { resourceId });
        return {
          success: true,
          topic,
          resourceId,
        };
      }

      case 'invoices': {
        // Invoice webhooks for billing
        logger.info('Invoice webhook received', { resourceId });
        return {
          success: true,
          topic,
          resourceId,
        };
      }

      default: {
        logger.warn('Unknown MercadoLibre webhook topic', { topic });
        return {
          success: false,
          topic,
          error: `Unknown topic: ${topic}`,
        };
      }
    }
  } catch (error) {
    logger.error('Failed to process MercadoLibre webhook', error as Error);
    return {
      success: false,
      topic,
      error: (error as Error).message,
    };
  }
}

/**
 * Verify webhook authenticity
 * MercadoLibre sends webhooks without signature, so we verify by:
 * 1. Checking user_id matches
 * 2. Optionally verifying the resource exists via API
 */
export function verifyMercadoLibreWebhook(
  notification: MercadoLibreNotification,
  expectedUserId: string
): boolean {
  return String(notification.user_id) === expectedUserId;
}

/**
 * Check if a topic is supported
 */
export function isSupportedTopic(topic: string): topic is MercadoLibreWebhookTopic {
  return MERCADOLIBRE_WEBHOOK_TOPICS.includes(topic as MercadoLibreWebhookTopic);
}

/**
 * Get topic category
 */
export function getTopicCategory(topic: MercadoLibreWebhookTopic): 'order' | 'product' | 'communication' | 'shipping' | 'billing' {
  switch (topic) {
    case 'orders_v2':
    case 'payments':
      return 'order';
    case 'items':
      return 'product';
    case 'questions':
    case 'messages':
    case 'claims':
      return 'communication';
    case 'shipments':
      return 'shipping';
    case 'invoices':
      return 'billing';
    default:
      return 'order';
  }
}
