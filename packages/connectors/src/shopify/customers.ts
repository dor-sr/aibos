import { createLogger, generateId } from '@aibos/core';
import { db, ecommerceCustomers, type NewEcommerceCustomer } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { ShopifyClient, ShopifyCustomer, ListCustomersParams } from './client';

const logger = createLogger('shopify:customers');

/**
 * Sync Shopify customers to normalized schema
 */
export async function syncCustomers(
  client: ShopifyClient,
  workspaceId: string,
  params: ListCustomersParams = {}
): Promise<number> {
  logger.info('Syncing Shopify customers', { workspaceId, params });

  let totalProcessed = 0;
  let hasMore = true;
  let sinceId: string | undefined;

  while (hasMore) {
    const response = await client.listCustomers({
      ...params,
      limit: 250,
      sinceId,
    });

    const customers = response.customers;

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    // Process customers in batch
    for (const customer of customers) {
      await processCustomer(customer, workspaceId);
      totalProcessed++;
    }

    // Get the last customer ID for pagination
    sinceId = customers[customers.length - 1]?.id.toString();

    // If we got less than the limit, we're done
    if (customers.length < 250) {
      hasMore = false;
    }
  }

  logger.info('Shopify customers sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Shopify customer into normalized schema
 */
async function processCustomer(customer: ShopifyCustomer, workspaceId: string): Promise<void> {
  const externalId = customer.id.toString();

  // Check if customer already exists
  const existing = await db
    .select({ id: ecommerceCustomers.id })
    .from(ecommerceCustomers)
    .where(
      and(
        eq(ecommerceCustomers.workspaceId, workspaceId),
        eq(ecommerceCustomers.source, 'shopify'),
        eq(ecommerceCustomers.externalId, externalId)
      )
    )
    .limit(1);

  // Transform Shopify customer to normalized format
  const normalizedCustomer: NewEcommerceCustomer = {
    id: existing[0]?.id ?? generateId(),
    workspaceId,
    externalId,
    source: 'shopify',
    email: customer.email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    totalOrders: customer.orders_count,
    totalSpent: customer.total_spent,
    currency: customer.currency,
    tags: customer.tags ? customer.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    sourceCreatedAt: new Date(customer.created_at),
    updatedAt: new Date(),
  };

  // Upsert customer
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(ecommerceCustomers)
      .set(normalizedCustomer)
      .where(eq(ecommerceCustomers.id, existingRecord.id));
  } else {
    await db.insert(ecommerceCustomers).values(normalizedCustomer);
  }

  logger.debug('Processed customer', {
    customerId: externalId,
    email: customer.email,
    isUpdate: existing.length > 0,
  });
}


