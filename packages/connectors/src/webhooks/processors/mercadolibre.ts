/**
 * MercadoLibre Webhook Event Processor
 * Processes MercadoLibre webhook notifications and updates the database
 */

import { createLogger } from '@aibos/core';
import type {
  WebhookEventProcessor,
  ParsedWebhookEvent,
  WebhookProcessingResult,
} from '../types';

const logger = createLogger('webhook:mercadolibre:processor');

// Event types we handle
export const MERCADOLIBRE_SUPPORTED_EVENTS = [
  // Order events
  'orders_v2',
  // Item events
  'items',
  'items_prices',
  // Question events
  'questions',
  // Shipment events
  'shipments',
  // Messages
  'messages',
  // Claims
  'claims',
  // Payments
  'payments',
];

/**
 * MercadoLibre event processor
 */
export class MercadoLibreEventProcessor implements WebhookEventProcessor {
  provider = 'mercadolibre' as const;

  getSupportedEventTypes(): string[] {
    return MERCADOLIBRE_SUPPORTED_EVENTS;
  }

  async processEvent(
    event: ParsedWebhookEvent,
    workspaceId: string
  ): Promise<WebhookProcessingResult> {
    const eventType = event.type;
    const data = event.data;

    logger.debug('Processing MercadoLibre event', { eventType, eventId: event.id });

    try {
      // Extract resource ID from the resource path
      const resourceId = this.extractResourceId(data.resource as string);

      switch (eventType) {
        case 'orders_v2':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'updated',
            message: 'Order notification received - fetch order details from API',
          };

        case 'items':
        case 'items_prices':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'updated',
            message: 'Item notification received - fetch item details from API',
          };

        case 'questions':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'received',
            message: 'Question notification received - fetch question details from API',
          };

        case 'shipments':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'updated',
            message: 'Shipment notification received - fetch shipment details from API',
          };

        case 'messages':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'received',
            message: 'Message notification received',
          };

        case 'claims':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'received',
            message: 'Claim notification received',
          };

        case 'payments':
          return {
            success: true,
            eventType,
            objectId: resourceId,
            action: 'updated',
            message: 'Payment notification received',
          };

        default:
          return {
            success: true,
            eventType,
            objectId: resourceId || 'unknown',
            action: 'ignored',
            message: `Event type ${eventType} not handled`,
          };
      }
    } catch (err) {
      logger.error('Failed to process MercadoLibre event', err as Error, {
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

  /**
   * Extract resource ID from MercadoLibre resource path
   * e.g., "/orders/12345" -> "12345"
   */
  private extractResourceId(resource: string | undefined): string {
    if (!resource) return 'unknown';
    const parts = resource.split('/');
    return parts[parts.length - 1] || 'unknown';
  }
}

export const mercadolibreProcessor = new MercadoLibreEventProcessor();
