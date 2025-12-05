import { createLogger, generateId } from '@aibos/core';
import { db, saasCustomers, type NewSaasCustomer } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { StripeClient, Stripe, ListCustomersParams } from './client';

const logger = createLogger('stripe:customers');

// Re-export with Stripe prefix to avoid conflicts
export type StripeListCustomersParams = ListCustomersParams;

/**
 * Sync Stripe customers to normalized SaaS schema
 */
export async function syncStripeCustomers(
  client: StripeClient,
  workspaceId: string,
  params: ListCustomersParams = {}
): Promise<number> {
  logger.info('Syncing Stripe customers', { workspaceId, params });

  const customers = await client.listCustomers(params);
  let totalProcessed = 0;

  for (const customer of customers) {
    await processCustomer(customer, workspaceId);
    totalProcessed++;
  }

  logger.info('Stripe customers sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Stripe customer into normalized SaaS schema
 */
export async function processCustomer(
  customer: Stripe.Customer,
  workspaceId: string
): Promise<string> {
  const externalId = customer.id;

  // Check if customer already exists
  const existing = await db
    .select({ id: saasCustomers.id })
    .from(saasCustomers)
    .where(
      and(
        eq(saasCustomers.workspaceId, workspaceId),
        eq(saasCustomers.source, 'stripe'),
        eq(saasCustomers.externalId, externalId)
      )
    )
    .limit(1);

  // Transform Stripe customer to normalized format
  const normalizedCustomer: NewSaasCustomer = {
    id: existing[0]?.id ?? generateId(),
    workspaceId,
    externalId,
    source: 'stripe',
    email: customer.email ?? undefined,
    name: customer.name ?? undefined,
    description: customer.description ?? undefined,
    currency: customer.currency?.toUpperCase() ?? 'USD',
    balance: (customer.balance / 100).toFixed(2), // Convert from cents
    metadata: customer.metadata as Record<string, unknown> | undefined,
    sourceCreatedAt: new Date(customer.created * 1000),
    updatedAt: new Date(),
  };

  // Upsert customer
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(saasCustomers)
      .set(normalizedCustomer)
      .where(eq(saasCustomers.id, existingRecord.id));

    logger.debug('Updated customer', {
      customerId: externalId,
      email: customer.email,
    });

    return existingRecord.id;
  } else {
    await db.insert(saasCustomers).values(normalizedCustomer);

    logger.debug('Inserted customer', {
      customerId: externalId,
      email: customer.email,
    });

    return normalizedCustomer.id;
  }
}

/**
 * Get internal customer ID from Stripe external ID
 */
export async function getInternalCustomerId(
  workspaceId: string,
  stripeCustomerId: string
): Promise<string | null> {
  const result = await db
    .select({ id: saasCustomers.id })
    .from(saasCustomers)
    .where(
      and(
        eq(saasCustomers.workspaceId, workspaceId),
        eq(saasCustomers.source, 'stripe'),
        eq(saasCustomers.externalId, stripeCustomerId)
      )
    )
    .limit(1);

  return result[0]?.id ?? null;
}

/**
 * Delete a customer by Stripe ID
 */
export async function deleteCustomerByExternalId(
  workspaceId: string,
  stripeCustomerId: string
): Promise<boolean> {
  const result = await db
    .delete(saasCustomers)
    .where(
      and(
        eq(saasCustomers.workspaceId, workspaceId),
        eq(saasCustomers.source, 'stripe'),
        eq(saasCustomers.externalId, stripeCustomerId)
      )
    );

  logger.info('Deleted customer', {
    workspaceId,
    stripeCustomerId,
  });

  return true;
}
