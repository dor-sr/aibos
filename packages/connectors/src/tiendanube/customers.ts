/**
 * Tiendanube Customer Sync
 */

import { db } from '@aibos/data-model';
import { ecommerceCustomers } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { TiendanubeClient } from './client';
import type { TiendanubeCustomer, TiendanubeSyncOptions } from './types';

/**
 * Transform Tiendanube customer to internal format
 */
function transformCustomer(customer: TiendanubeCustomer, workspaceId: string) {
  return {
    workspaceId,
    externalId: String(customer.id),
    source: 'tiendanube',
    email: customer.email,
    firstName: customer.name.split(' ')[0] || '',
    lastName: customer.name.split(' ').slice(1).join(' ') || '',
    phone: customer.phone,
    totalOrders: 0, // Will be calculated from orders
    totalSpent: customer.total_spent,
    currency: customer.total_spent_currency,
    tags: [],
    metadata: {
      identification: customer.identification,
      note: customer.note,
      defaultAddress: customer.default_address,
      billing: {
        name: customer.billing_name,
        phone: customer.billing_phone,
        address: customer.billing_address,
        city: customer.billing_city,
        province: customer.billing_province,
        country: customer.billing_country,
        zipcode: customer.billing_zipcode,
      },
    },
    sourceCreatedAt: new Date(customer.created_at),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Sync customers from Tiendanube
 */
export async function syncTiendanubeCustomers(
  client: TiendanubeClient,
  workspaceId: string,
  options: TiendanubeSyncOptions = {}
): Promise<number> {
  const customers = await client.fetchAllCustomers(options);
  let processedCount = 0;

  for (const customer of customers) {
    const customerData = transformCustomer(customer, workspaceId);

    // Check if customer exists
    const existing = await db
      .select()
      .from(ecommerceCustomers)
      .where(
        and(
          eq(ecommerceCustomers.workspaceId, workspaceId),
          eq(ecommerceCustomers.externalId, String(customer.id))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing customer
      await db
        .update(ecommerceCustomers)
        .set({
          ...customerData,
          updatedAt: new Date(),
        })
        .where(eq(ecommerceCustomers.id, existing[0]!.id));
    } else {
      // Insert new customer
      await db.insert(ecommerceCustomers).values({
        ...customerData,
        id: crypto.randomUUID(),
      });
    }

    processedCount++;
  }

  return processedCount;
}

/**
 * Get internal customer ID from Tiendanube external ID
 */
export async function getInternalCustomerId(
  workspaceId: string,
  externalId: string
): Promise<string | null> {
  const result = await db
    .select({ id: ecommerceCustomers.id })
    .from(ecommerceCustomers)
    .where(
      and(
        eq(ecommerceCustomers.workspaceId, workspaceId),
        eq(ecommerceCustomers.externalId, externalId)
      )
    )
    .limit(1);

  return result[0]?.id || null;
}

/**
 * Process a single customer from webhook
 */
export async function processTiendanubeCustomer(
  customer: TiendanubeCustomer,
  workspaceId: string
): Promise<string> {
  const customerData = transformCustomer(customer, workspaceId);

  const existing = await db
    .select()
    .from(ecommerceCustomers)
    .where(
      and(
        eq(ecommerceCustomers.workspaceId, workspaceId),
        eq(ecommerceCustomers.externalId, String(customer.id))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ecommerceCustomers)
      .set({
        ...customerData,
        updatedAt: new Date(),
      })
      .where(eq(ecommerceCustomers.id, existing[0]!.id));
    return existing[0]!.id;
  } else {
    const id = crypto.randomUUID();
    await db.insert(ecommerceCustomers).values({
      ...customerData,
      id,
    });
    return id;
  }
}
