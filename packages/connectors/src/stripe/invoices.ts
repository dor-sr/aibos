import { createLogger, generateId } from '@aibos/core';
import { db, saasInvoices, type NewSaasInvoice } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { StripeClient, Stripe, ListInvoicesParams } from './client';
import { getInternalCustomerId, processCustomer } from './customers';
import { getInternalSubscriptionId } from './subscriptions';

const logger = createLogger('stripe:invoices');

// Re-export with Stripe prefix to avoid conflicts
export type StripeListInvoicesParams = ListInvoicesParams;

/**
 * Map Stripe invoice status to our schema enum
 */
function mapInvoiceStatus(
  stripeStatus: Stripe.Invoice.Status | null
): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' {
  if (!stripeStatus) return 'draft';

  const statusMap: Record<string, NewSaasInvoice['status']> = {
    draft: 'draft',
    open: 'open',
    paid: 'paid',
    void: 'void',
    uncollectible: 'uncollectible',
  };
  return statusMap[stripeStatus] ?? 'draft';
}

/**
 * Sync Stripe invoices to normalized SaaS schema
 */
export async function syncStripeInvoices(
  client: StripeClient,
  workspaceId: string,
  params: ListInvoicesParams = {}
): Promise<number> {
  logger.info('Syncing Stripe invoices', { workspaceId, params });

  const invoices = await client.listInvoices(params);
  let totalProcessed = 0;

  for (const invoice of invoices) {
    try {
      await processInvoice(invoice, workspaceId, client);
      totalProcessed++;
    } catch (error) {
      logger.warn('Failed to process invoice', {
        invoiceId: invoice.id,
        error: (error as Error).message,
      });
    }
  }

  logger.info('Stripe invoices sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Stripe invoice into normalized SaaS schema
 */
export async function processInvoice(
  invoice: Stripe.Invoice,
  workspaceId: string,
  client?: StripeClient
): Promise<string> {
  const externalId = invoice.id;

  if (!externalId) {
    throw new Error('Invoice ID is required');
  }

  // Get or create customer reference
  const stripeCustomerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!stripeCustomerId) {
    throw new Error(`Invoice ${externalId} has no customer`);
  }

  let customerId = await getInternalCustomerId(workspaceId, stripeCustomerId);

  // If customer doesn't exist and we have the full customer object, create it
  if (!customerId && typeof invoice.customer !== 'string' && invoice.customer) {
    customerId = await processCustomer(invoice.customer as Stripe.Customer, workspaceId);
  }

  // If still no customer ID, we can't proceed
  if (!customerId) {
    throw new Error(`Customer ${stripeCustomerId} not found for invoice ${externalId}`);
  }

  // Get subscription ID if available
  let subscriptionId: string | null = null;
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  if (stripeSubscriptionId) {
    subscriptionId = await getInternalSubscriptionId(workspaceId, stripeSubscriptionId);
  }

  // Check if invoice already exists
  const existing = await db
    .select({ id: saasInvoices.id })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.workspaceId, workspaceId),
        eq(saasInvoices.source, 'stripe'),
        eq(saasInvoices.externalId, externalId)
      )
    )
    .limit(1);

  // Convert amounts from cents to dollars
  const subtotal = invoice.subtotal ? (invoice.subtotal / 100).toFixed(2) : undefined;
  const tax = invoice.tax ? (invoice.tax / 100).toFixed(2) : undefined;
  const total = invoice.total ? (invoice.total / 100).toFixed(2) : '0.00';
  const amountPaid = invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : undefined;
  const amountDue = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : undefined;

  // Transform Stripe invoice to normalized format
  const normalizedInvoice: NewSaasInvoice = {
    id: existing[0]?.id ?? generateId(),
    workspaceId,
    customerId,
    subscriptionId: subscriptionId ?? undefined,
    externalId,
    source: 'stripe',
    status: mapInvoiceStatus(invoice.status),
    number: invoice.number ?? undefined,
    subtotal,
    tax,
    total,
    amountPaid,
    amountDue,
    currency: invoice.currency.toUpperCase(),
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : undefined,
    voidedAt: invoice.status_transitions?.voided_at
      ? new Date(invoice.status_transitions.voided_at * 1000)
      : undefined,
    metadata: invoice.metadata as Record<string, unknown> | undefined,
    sourceCreatedAt: new Date(invoice.created * 1000),
    updatedAt: new Date(),
  };

  // Upsert invoice
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(saasInvoices)
      .set(normalizedInvoice)
      .where(eq(saasInvoices.id, existingRecord.id));

    logger.debug('Updated invoice', {
      invoiceId: externalId,
      status: invoice.status,
      total,
    });

    return existingRecord.id;
  } else {
    await db.insert(saasInvoices).values(normalizedInvoice);

    logger.debug('Inserted invoice', {
      invoiceId: externalId,
      status: invoice.status,
      total,
    });

    return normalizedInvoice.id;
  }
}

/**
 * Get internal invoice ID from Stripe external ID
 */
export async function getInternalInvoiceId(
  workspaceId: string,
  stripeInvoiceId: string
): Promise<string | null> {
  const result = await db
    .select({ id: saasInvoices.id })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.workspaceId, workspaceId),
        eq(saasInvoices.source, 'stripe'),
        eq(saasInvoices.externalId, stripeInvoiceId)
      )
    )
    .limit(1);

  return result[0]?.id ?? null;
}

/**
 * Mark an invoice as paid
 */
export async function markInvoicePaid(
  workspaceId: string,
  stripeInvoiceId: string,
  paidAt?: Date
): Promise<boolean> {
  await db
    .update(saasInvoices)
    .set({
      status: 'paid',
      paidAt: paidAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(saasInvoices.workspaceId, workspaceId),
        eq(saasInvoices.source, 'stripe'),
        eq(saasInvoices.externalId, stripeInvoiceId)
      )
    );

  logger.info('Marked invoice as paid', {
    workspaceId,
    stripeInvoiceId,
  });

  return true;
}

/**
 * Mark an invoice as void
 */
export async function markInvoiceVoid(
  workspaceId: string,
  stripeInvoiceId: string
): Promise<boolean> {
  await db
    .update(saasInvoices)
    .set({
      status: 'void',
      voidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(saasInvoices.workspaceId, workspaceId),
        eq(saasInvoices.source, 'stripe'),
        eq(saasInvoices.externalId, stripeInvoiceId)
      )
    );

  logger.info('Marked invoice as void', {
    workspaceId,
    stripeInvoiceId,
  });

  return true;
}
