/**
 * Webhook Gateway Module
 * Unified webhook processing infrastructure for all providers
 */

// Types
export * from './types';

// Gateway
export { webhookGateway, WebhookGateway } from './gateway';
export type { WebhookGatewayResult } from './gateway';

// Verifiers
export {
  getVerifier,
  isProviderSupported,
  getSupportedProviders,
  stripeVerifier,
  shopifyVerifier,
} from './verifiers';

// Processors
export {
  getEventProcessor,
  getSupportedEvents,
  stripeProcessor,
  shopifyProcessor,
  STRIPE_SUPPORTED_EVENTS,
  SHOPIFY_SUPPORTED_EVENTS,
} from './processors';

// Outbound Webhook Delivery Service
export {
  deliverWebhook,
  processWebhookDelivery,
  signWebhookPayload,
  verifyWebhookSignature,
  createWebhookHeaders,
  calculateRetryDelay,
  WEBHOOK_EVENT_TYPES,
} from './delivery-service';
export type {
  WebhookEndpoint,
  WebhookPayload,
  DeliveryResult,
  WebhookDelivery,
  WebhookEventType,
} from './delivery-service';


