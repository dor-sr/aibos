import { createLogger } from '@aibos/core';
import type { Stripe } from './client';
import { processCustomer, deleteCustomerByExternalId } from './customers';
import { processPlan, deactivatePlan } from './plans';
import { processSubscription, cancelSubscription } from './subscriptions';
import { processInvoice, markInvoicePaid, markInvoiceVoid } from './invoices';

const logger = createLogger('stripe:webhooks');

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'price.created'
  | 'price.updated'
  | 'price.deleted'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.deleted'
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.voided'
  | 'invoice.finalized';

/**
 * Result of processing a webhook event
 */
export interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  objectId: string;
  action: string;
  error?: string;
}

/**
 * Process a Stripe webhook event
 */
export async function processWebhookEvent(
  event: Stripe.Event,
  workspaceId: string
): Promise<WebhookProcessingResult> {
  const eventType = event.type;
  const eventId = event.id;

  logger.info('Processing Stripe webhook event', {
    eventType,
    eventId,
    workspaceId,
  });

  try {
    switch (eventType) {
      // Customer events
      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        await processCustomer(customer, workspaceId);
        return {
          success: true,
          eventType,
          objectId: customer.id,
          action: eventType === 'customer.created' ? 'created' : 'updated',
        };
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        await deleteCustomerByExternalId(workspaceId, customer.id);
        return {
          success: true,
          eventType,
          objectId: customer.id,
          action: 'deleted',
        };
      }

      // Price events (we treat prices as plans)
      case 'price.created':
      case 'price.updated': {
        const price = event.data.object as Stripe.Price;
        // Only process recurring prices (subscription plans)
        if (price.type === 'recurring') {
          await processPlan(price, undefined, workspaceId);
        }
        return {
          success: true,
          eventType,
          objectId: price.id,
          action: eventType === 'price.created' ? 'created' : 'updated',
        };
      }

      case 'price.deleted': {
        const price = event.data.object as Stripe.Price;
        await deactivatePlan(workspaceId, price.id);
        return {
          success: true,
          eventType,
          objectId: price.id,
          action: 'deactivated',
        };
      }

      // Product events (just log, we sync products with prices)
      case 'product.created':
      case 'product.updated':
      case 'product.deleted': {
        const product = event.data.object as Stripe.Product;
        logger.info('Product event received (handled via price sync)', {
          productId: product.id,
          eventType,
        });
        return {
          success: true,
          eventType,
          objectId: product.id,
          action: 'acknowledged',
        };
      }

      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await processSubscription(subscription, workspaceId);
        return {
          success: true,
          eventType,
          objectId: subscription.id,
          action: eventType.includes('created') ? 'created' : 'updated',
        };
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await cancelSubscription(workspaceId, subscription.id);
        return {
          success: true,
          eventType,
          objectId: subscription.id,
          action: 'canceled',
        };
      }

      // Invoice events
      case 'invoice.created':
      case 'invoice.updated':
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.id) {
          await processInvoice(invoice, workspaceId);
        }
        return {
          success: true,
          eventType,
          objectId: invoice.id ?? 'unknown',
          action: eventType.split('.')[1] ?? 'updated',
        };
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.id) {
          // First process the full invoice update
          await processInvoice(invoice, workspaceId);
          // Then explicitly mark as paid
          await markInvoicePaid(
            workspaceId,
            invoice.id,
            invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000)
              : undefined
          );
        }
        return {
          success: true,
          eventType,
          objectId: invoice.id ?? 'unknown',
          action: 'paid',
        };
      }

      case 'invoice.voided': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.id) {
          await markInvoiceVoid(workspaceId, invoice.id);
        }
        return {
          success: true,
          eventType,
          objectId: invoice.id ?? 'unknown',
          action: 'voided',
        };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Process the invoice update which will have the failed status
        if (invoice.id) {
          await processInvoice(invoice, workspaceId);
        }
        return {
          success: true,
          eventType,
          objectId: invoice.id ?? 'unknown',
          action: 'payment_failed',
        };
      }

      default: {
        logger.debug('Unhandled webhook event type', { eventType });
        return {
          success: true,
          eventType,
          objectId: 'unknown',
          action: 'ignored',
        };
      }
    }
  } catch (error) {
    logger.error('Failed to process webhook event', error as Error, {
      eventType,
      eventId,
    });
    return {
      success: false,
      eventType,
      objectId: 'unknown',
      action: 'error',
      error: (error as Error).message,
    };
  }
}

/**
 * List of webhook events we want to receive from Stripe
 */
export const STRIPE_WEBHOOK_EVENTS: string[] = [
  // Customer events
  'customer.created',
  'customer.updated',
  'customer.deleted',
  // Product/Price events
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  // Subscription events
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  // Invoice events
  'invoice.created',
  'invoice.updated',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.voided',
];
