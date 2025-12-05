import { createLogger, generateId } from '@aibos/core';
import { db, saasSubscriptions, type NewSaasSubscription } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { StripeClient, Stripe, ListSubscriptionsParams } from './client';
import { getInternalCustomerId, processCustomer } from './customers';
import { getInternalPlanId, processPlan } from './plans';

const logger = createLogger('stripe:subscriptions');

// Re-export with Stripe prefix to avoid conflicts
export type StripeListSubscriptionsParams = ListSubscriptionsParams;

/**
 * Map Stripe subscription status to our schema enum
 */
function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' {
  const statusMap: Record<Stripe.Subscription.Status, NewSaasSubscription['status']> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    paused: 'paused',
  };
  return statusMap[stripeStatus] ?? 'active';
}

/**
 * Calculate MRR from a subscription
 * Normalizes all intervals to monthly
 */
function calculateMRR(subscription: Stripe.Subscription): number {
  let totalMrr = 0;

  for (const item of subscription.items.data) {
    const price = item.price;
    const quantity = item.quantity ?? 1;

    if (price.type !== 'recurring' || !price.recurring) {
      continue;
    }

    const unitAmount = price.unit_amount ?? 0;
    const intervalCount = price.recurring.interval_count;
    const interval = price.recurring.interval;

    // Convert to monthly rate
    let monthlyAmount: number;
    switch (interval) {
      case 'day':
        monthlyAmount = (unitAmount * 30) / intervalCount;
        break;
      case 'week':
        monthlyAmount = (unitAmount * 4.33) / intervalCount;
        break;
      case 'month':
        monthlyAmount = unitAmount / intervalCount;
        break;
      case 'year':
        monthlyAmount = unitAmount / (12 * intervalCount);
        break;
      default:
        monthlyAmount = unitAmount;
    }

    totalMrr += monthlyAmount * quantity;
  }

  // Convert from cents to dollars
  return totalMrr / 100;
}

/**
 * Sync Stripe subscriptions to normalized SaaS schema
 */
export async function syncStripeSubscriptions(
  client: StripeClient,
  workspaceId: string,
  params: ListSubscriptionsParams = {}
): Promise<number> {
  logger.info('Syncing Stripe subscriptions', { workspaceId, params });

  const subscriptions = await client.listSubscriptions(params);
  let totalProcessed = 0;

  for (const subscription of subscriptions) {
    await processSubscription(subscription, workspaceId, client);
    totalProcessed++;
  }

  logger.info('Stripe subscriptions sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Stripe subscription into normalized SaaS schema
 */
export async function processSubscription(
  subscription: Stripe.Subscription,
  workspaceId: string,
  client?: StripeClient
): Promise<string> {
  const externalId = subscription.id;

  // Get or create customer reference
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  let customerId = await getInternalCustomerId(workspaceId, stripeCustomerId);

  // If customer doesn't exist and we have the full customer object, create it
  if (!customerId && typeof subscription.customer !== 'string' && !('deleted' in subscription.customer)) {
    customerId = await processCustomer(subscription.customer as Stripe.Customer, workspaceId);
  }

  // If still no customer ID, we can't proceed
  if (!customerId) {
    logger.warn('Could not find or create customer for subscription', {
      subscriptionId: externalId,
      stripeCustomerId,
    });
    throw new Error(`Customer ${stripeCustomerId} not found for subscription ${externalId}`);
  }

  // Get plan ID from the first subscription item's price
  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price?.id;
  let planId: string | null = null;

  if (stripePriceId) {
    planId = await getInternalPlanId(workspaceId, stripePriceId);

    // If plan doesn't exist and we have the price object, try to create it
    if (!planId && firstItem?.price) {
      // Fetch the product if needed
      let product: Stripe.Product | undefined;
      const productRef = firstItem.price.product;
      if (typeof productRef === 'string' && client) {
        try {
          const rawClient = client.getRawClient();
          product = await rawClient.products.retrieve(productRef);
        } catch {
          // Product might be deleted, continue without it
        }
      } else if (typeof productRef !== 'string' && !('deleted' in productRef)) {
        product = productRef as Stripe.Product;
      }

      planId = await processPlan(firstItem.price, product, workspaceId);
    }
  }

  // Calculate MRR
  const mrr = calculateMRR(subscription);

  // Check if subscription already exists
  const existing = await db
    .select({ id: saasSubscriptions.id })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.externalId, externalId)
      )
    )
    .limit(1);

  // Get total quantity across all items
  const totalQuantity = subscription.items.data.reduce(
    (sum, item) => sum + (item.quantity ?? 1),
    0
  );

  // Transform Stripe subscription to normalized format
  const normalizedSubscription: NewSaasSubscription = {
    id: existing[0]?.id ?? generateId(),
    workspaceId,
    customerId,
    planId: planId ?? undefined,
    externalId,
    source: 'stripe',
    status: mapSubscriptionStatus(subscription.status),
    mrr: mrr.toFixed(2),
    currency: subscription.currency.toUpperCase(),
    quantity: totalQuantity,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
    metadata: subscription.metadata as Record<string, unknown> | undefined,
    sourceCreatedAt: new Date(subscription.created * 1000),
    updatedAt: new Date(),
  };

  // Upsert subscription
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(saasSubscriptions)
      .set(normalizedSubscription)
      .where(eq(saasSubscriptions.id, existingRecord.id));

    logger.debug('Updated subscription', {
      subscriptionId: externalId,
      status: subscription.status,
      mrr,
    });

    return existingRecord.id;
  } else {
    await db.insert(saasSubscriptions).values(normalizedSubscription);

    logger.debug('Inserted subscription', {
      subscriptionId: externalId,
      status: subscription.status,
      mrr,
    });

    return normalizedSubscription.id;
  }
}

/**
 * Get internal subscription ID from Stripe external ID
 */
export async function getInternalSubscriptionId(
  workspaceId: string,
  stripeSubscriptionId: string
): Promise<string | null> {
  const result = await db
    .select({ id: saasSubscriptions.id })
    .from(saasSubscriptions)
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.externalId, stripeSubscriptionId)
      )
    )
    .limit(1);

  return result[0]?.id ?? null;
}

/**
 * Cancel a subscription by marking it as canceled
 */
export async function cancelSubscription(
  workspaceId: string,
  stripeSubscriptionId: string
): Promise<boolean> {
  await db
    .update(saasSubscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(saasSubscriptions.workspaceId, workspaceId),
        eq(saasSubscriptions.source, 'stripe'),
        eq(saasSubscriptions.externalId, stripeSubscriptionId)
      )
    );

  logger.info('Canceled subscription', {
    workspaceId,
    stripeSubscriptionId,
  });

  return true;
}
