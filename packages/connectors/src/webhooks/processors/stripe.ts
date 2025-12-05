/**
 * Stripe Webhook Event Processor
 * Processes Stripe webhook events and updates the database
 */

import { createLogger } from '@aibos/core';
import type Stripe from 'stripe';
import type {
  WebhookEventProcessor,
  ParsedWebhookEvent,
  WebhookProcessingResult,
} from '../types';
import { processCustomer, deleteCustomerByExternalId } from '../../stripe/customers';
import { processPlan, deactivatePlan } from '../../stripe/plans';
import { processSubscription, cancelSubscription } from '../../stripe/subscriptions';
import { processInvoice, markInvoicePaid, markInvoiceVoid } from '../../stripe/invoices';

const logger = createLogger('webhook:stripe:processor');

// Event types we handle
export const STRIPE_SUPPORTED_EVENTS = [
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

/**
 * Stripe event processor
 */
export class StripeEventProcessor implements WebhookEventProcessor {
  provider = 'stripe' as const;

  getSupportedEventTypes(): string[] {
    return STRIPE_SUPPORTED_EVENTS;
  }

  async processEvent(
    event: ParsedWebhookEvent,
    workspaceId: string
  ): Promise<WebhookProcessingResult> {
    const eventType = event.type;
    const data = event.data;

    logger.debug('Processing Stripe event', { eventType, eventId: event.id });

    try {
      switch (eventType) {
        // Customer events
        case 'customer.created':
        case 'customer.updated': {
          const customer = data as unknown as Stripe.Customer;
          await processCustomer(customer, workspaceId);
          return {
            success: true,
            eventType,
            objectId: customer.id,
            action: eventType === 'customer.created' ? 'created' : 'updated',
          };
        }

        case 'customer.deleted': {
          const customer = data as unknown as Stripe.Customer;
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
          const price = data as unknown as Stripe.Price;
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
          const price = data as unknown as Stripe.Price;
          await deactivatePlan(workspaceId, price.id);
          return {
            success: true,
            eventType,
            objectId: price.id,
            action: 'deactivated',
          };
        }

        // Product events (handled via price sync)
        case 'product.created':
        case 'product.updated':
        case 'product.deleted': {
          const product = data as unknown as Stripe.Product;
          return {
            success: true,
            eventType,
            objectId: product.id,
            action: 'acknowledged',
            message: 'Product events handled via price sync',
          };
        }

        // Subscription events
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = data as unknown as Stripe.Subscription;
          await processSubscription(subscription, workspaceId);
          return {
            success: true,
            eventType,
            objectId: subscription.id,
            action: eventType.includes('created') ? 'created' : 'updated',
          };
        }

        case 'customer.subscription.deleted': {
          const subscription = data as unknown as Stripe.Subscription;
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
          const invoice = data as unknown as Stripe.Invoice;
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
          const invoice = data as unknown as Stripe.Invoice;
          if (invoice.id) {
            await processInvoice(invoice, workspaceId);
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
          const invoice = data as unknown as Stripe.Invoice;
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
          const invoice = data as unknown as Stripe.Invoice;
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
          logger.debug('Unhandled event type', { eventType });
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
      logger.error('Failed to process Stripe event', err as Error, {
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

export const stripeProcessor = new StripeEventProcessor();
