import { createLogger, generateId } from '@aibos/core';
import { db, saasPlans, type NewSaasPlan } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { StripeClient, Stripe, ListPricesParams } from './client';

const logger = createLogger('stripe:plans');

// Re-export with Stripe prefix to avoid conflicts
export type StripeListPricesParams = ListPricesParams;

/**
 * Sync Stripe products and prices to normalized SaaS plans schema
 * In Stripe, a "plan" is represented by a Product + Price combination
 */
export async function syncStripePlans(
  client: StripeClient,
  workspaceId: string,
  params: ListPricesParams = {}
): Promise<number> {
  logger.info('Syncing Stripe plans (prices)', { workspaceId, params });

  // Get all recurring prices (subscriptions)
  const prices = await client.listPrices({
    ...params,
    type: 'recurring',
    active: params.active ?? true,
  });

  // Also get products for names and descriptions
  const products = await client.listProducts({ active: params.active ?? true });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalProcessed = 0;

  for (const price of prices) {
    const productId =
      typeof price.product === 'string' ? price.product : price.product?.id;
    const product = productId ? productMap.get(productId) : undefined;

    await processPlan(price, product, workspaceId);
    totalProcessed++;
  }

  logger.info('Stripe plans sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Stripe price (with product) into normalized SaaS plan schema
 */
export async function processPlan(
  price: Stripe.Price,
  product: Stripe.Product | undefined,
  workspaceId: string
): Promise<string> {
  const externalId = price.id;

  // Check if plan already exists
  const existing = await db
    .select({ id: saasPlans.id })
    .from(saasPlans)
    .where(
      and(
        eq(saasPlans.workspaceId, workspaceId),
        eq(saasPlans.source, 'stripe'),
        eq(saasPlans.externalId, externalId)
      )
    )
    .limit(1);

  // Determine plan name from product or price nickname
  const planName = product?.name ?? price.nickname ?? `Plan ${price.id.slice(-8)}`;

  // Calculate amount (Stripe stores in smallest currency unit)
  const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00';

  // Transform Stripe price to normalized plan format
  const normalizedPlan: NewSaasPlan = {
    id: existing[0]?.id ?? generateId(),
    workspaceId,
    externalId,
    source: 'stripe',
    name: planName,
    description: product?.description ?? undefined,
    amount,
    currency: price.currency.toUpperCase(),
    interval: price.recurring?.interval ?? undefined,
    intervalCount: price.recurring?.interval_count ?? 1,
    trialDays: price.recurring?.trial_period_days ?? undefined,
    isActive: price.active ? 'true' : 'false',
    metadata: {
      productId: typeof price.product === 'string' ? price.product : price.product?.id,
      priceNickname: price.nickname,
      productActive: product?.active,
      ...((price.metadata as Record<string, unknown>) ?? {}),
    },
    updatedAt: new Date(),
  };

  // Upsert plan
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(saasPlans)
      .set(normalizedPlan)
      .where(eq(saasPlans.id, existingRecord.id));

    logger.debug('Updated plan', {
      priceId: externalId,
      name: planName,
    });

    return existingRecord.id;
  } else {
    await db.insert(saasPlans).values(normalizedPlan);

    logger.debug('Inserted plan', {
      priceId: externalId,
      name: planName,
    });

    return normalizedPlan.id;
  }
}

/**
 * Get internal plan ID from Stripe price ID
 */
export async function getInternalPlanId(
  workspaceId: string,
  stripePriceId: string
): Promise<string | null> {
  const result = await db
    .select({ id: saasPlans.id })
    .from(saasPlans)
    .where(
      and(
        eq(saasPlans.workspaceId, workspaceId),
        eq(saasPlans.source, 'stripe'),
        eq(saasPlans.externalId, stripePriceId)
      )
    )
    .limit(1);

  return result[0]?.id ?? null;
}

/**
 * Deactivate a plan by Stripe price ID
 */
export async function deactivatePlan(
  workspaceId: string,
  stripePriceId: string
): Promise<boolean> {
  await db
    .update(saasPlans)
    .set({ isActive: 'false', updatedAt: new Date() })
    .where(
      and(
        eq(saasPlans.workspaceId, workspaceId),
        eq(saasPlans.source, 'stripe'),
        eq(saasPlans.externalId, stripePriceId)
      )
    );

  logger.info('Deactivated plan', {
    workspaceId,
    stripePriceId,
  });

  return true;
}
