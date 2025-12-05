import Stripe from 'stripe';
import { createLogger } from '@aibos/core';

const logger = createLogger('stripe:client');

export interface StripeClientConfig {
  apiKey: string;
}

/**
 * Stripe API client
 * Wraps the Stripe SDK for data fetching with pagination support
 */
export class StripeClient {
  private stripe: Stripe;
  private apiKey: string;

  constructor(config: StripeClientConfig) {
    this.apiKey = config.apiKey;
    this.stripe = new Stripe(config.apiKey, {
      typescript: true,
    });
  }

  /**
   * Test the connection to Stripe
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.stripe.balance.retrieve();
      return true;
    } catch (error) {
      logger.error('Stripe connection test failed', error as Error);
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<Stripe.Account> {
    return this.stripe.accounts.retrieve();
  }

  /**
   * List customers with pagination
   */
  async listCustomers(params: ListCustomersParams = {}): Promise<Stripe.Customer[]> {
    logger.debug('Listing Stripe customers', { params });

    const allCustomers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await this.stripe.customers.list({
        limit: params.limit ?? 100,
        starting_after: startingAfter,
        created: params.createdAfter
          ? { gte: Math.floor(params.createdAfter.getTime() / 1000) }
          : undefined,
      });

      for (const customer of response.data) {
        if (!customer.deleted) {
          allCustomers.push(customer as Stripe.Customer);
        }
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1]?.id;
      }

      // Respect rate limits
      if (hasMore) {
        await this.delay(100);
      }
    }

    return allCustomers;
  }

  /**
   * List products with pagination
   */
  async listProducts(params: ListProductsParams = {}): Promise<Stripe.Product[]> {
    logger.debug('Listing Stripe products', { params });

    const allProducts: Stripe.Product[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await this.stripe.products.list({
        limit: params.limit ?? 100,
        starting_after: startingAfter,
        active: params.active,
        created: params.createdAfter
          ? { gte: Math.floor(params.createdAfter.getTime() / 1000) }
          : undefined,
      });

      allProducts.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1]?.id;
      }

      if (hasMore) {
        await this.delay(100);
      }
    }

    return allProducts;
  }

  /**
   * List prices with pagination
   */
  async listPrices(params: ListPricesParams = {}): Promise<Stripe.Price[]> {
    logger.debug('Listing Stripe prices', { params });

    const allPrices: Stripe.Price[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await this.stripe.prices.list({
        limit: params.limit ?? 100,
        starting_after: startingAfter,
        active: params.active,
        product: params.productId,
        type: params.type,
        created: params.createdAfter
          ? { gte: Math.floor(params.createdAfter.getTime() / 1000) }
          : undefined,
      });

      allPrices.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1]?.id;
      }

      if (hasMore) {
        await this.delay(100);
      }
    }

    return allPrices;
  }

  /**
   * List subscriptions with pagination
   */
  async listSubscriptions(params: ListSubscriptionsParams = {}): Promise<Stripe.Subscription[]> {
    logger.debug('Listing Stripe subscriptions', { params });

    const allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await this.stripe.subscriptions.list({
        limit: params.limit ?? 100,
        starting_after: startingAfter,
        customer: params.customerId,
        status: params.status,
        created: params.createdAfter
          ? { gte: Math.floor(params.createdAfter.getTime() / 1000) }
          : undefined,
        expand: ['data.items.data.price', 'data.customer'],
      });

      allSubscriptions.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1]?.id;
      }

      if (hasMore) {
        await this.delay(100);
      }
    }

    return allSubscriptions;
  }

  /**
   * List invoices with pagination
   */
  async listInvoices(params: ListInvoicesParams = {}): Promise<Stripe.Invoice[]> {
    logger.debug('Listing Stripe invoices', { params });

    const allInvoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await this.stripe.invoices.list({
        limit: params.limit ?? 100,
        starting_after: startingAfter,
        customer: params.customerId,
        subscription: params.subscriptionId,
        status: params.status,
        created: params.createdAfter
          ? { gte: Math.floor(params.createdAfter.getTime() / 1000) }
          : undefined,
      });

      allInvoices.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1]?.id;
      }

      if (hasMore) {
        await this.delay(100);
      }
    }

    return allInvoices;
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer.deleted ? null : (customer as Stripe.Customer);
    } catch {
      return null;
    }
  }

  /**
   * Get a single subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price', 'customer'],
      });
    } catch {
      return null;
    }
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch {
      return null;
    }
  }

  /**
   * Construct webhook event from payload
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get the raw Stripe instance for advanced operations
   */
  getRawClient(): Stripe {
    return this.stripe;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Parameter types
export interface ListCustomersParams {
  limit?: number;
  createdAfter?: Date;
}

export interface ListProductsParams {
  limit?: number;
  active?: boolean;
  createdAfter?: Date;
}

export interface ListPricesParams {
  limit?: number;
  active?: boolean;
  productId?: string;
  type?: 'one_time' | 'recurring';
  createdAfter?: Date;
}

export interface ListSubscriptionsParams {
  limit?: number;
  customerId?: string;
  status?: Stripe.SubscriptionListParams.Status;
  createdAfter?: Date;
}

export interface ListInvoicesParams {
  limit?: number;
  customerId?: string;
  subscriptionId?: string;
  status?: Stripe.InvoiceListParams.Status;
  createdAfter?: Date;
}

// Re-export Stripe types for convenience
export type { Stripe };
