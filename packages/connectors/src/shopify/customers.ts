import { createLogger, generateId } from '@aibos/core';
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
  // Transform Shopify customer to normalized format
  const normalizedCustomer = {
    id: generateId(),
    workspaceId,
    externalId: customer.id.toString(),
    source: 'shopify',
    email: customer.email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    totalOrders: customer.orders_count,
    totalSpent: parseFloat(customer.total_spent),
    currency: customer.currency,
    tags: customer.tags ? customer.tags.split(',').map((t) => t.trim()) : [],
    sourceCreatedAt: new Date(customer.created_at),
  };

  // TODO: Write to database using @aibos/data-model
  logger.debug('Processed customer', {
    customerId: normalizedCustomer.externalId,
    email: normalizedCustomer.email,
  });
}

