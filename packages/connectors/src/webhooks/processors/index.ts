/**
 * Webhook Event Processors
 * Provider-specific event processing implementations
 */

import type { WebhookProvider, WebhookEventProcessor } from '../types';
import { stripeProcessor, STRIPE_SUPPORTED_EVENTS } from './stripe';
import { shopifyProcessor, SHOPIFY_SUPPORTED_EVENTS } from './shopify';
import { tiendanubeProcessor, TIENDANUBE_SUPPORTED_EVENTS } from './tiendanube';
import { mercadolibreProcessor, MERCADOLIBRE_SUPPORTED_EVENTS } from './mercadolibre';

// Registry of all processors
const processors = new Map<WebhookProvider, WebhookEventProcessor>();
processors.set('stripe', stripeProcessor);
processors.set('shopify', shopifyProcessor);
processors.set('tiendanube', tiendanubeProcessor);
processors.set('mercadolibre', mercadolibreProcessor);

/**
 * Get the processor for a provider
 */
export function getEventProcessor(provider: WebhookProvider): WebhookEventProcessor | undefined {
  return processors.get(provider);
}

/**
 * Get all supported events for a provider
 */
export function getSupportedEvents(provider: WebhookProvider): string[] {
  const processor = processors.get(provider);
  return processor ? processor.getSupportedEventTypes() : [];
}

export { stripeProcessor, STRIPE_SUPPORTED_EVENTS } from './stripe';
export { shopifyProcessor, SHOPIFY_SUPPORTED_EVENTS } from './shopify';
export { tiendanubeProcessor, TIENDANUBE_SUPPORTED_EVENTS } from './tiendanube';
export { mercadolibreProcessor, MERCADOLIBRE_SUPPORTED_EVENTS } from './mercadolibre';


