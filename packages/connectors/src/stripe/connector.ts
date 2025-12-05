import { BaseConnector } from '../base';
import type { ConnectorConfig, SyncResult } from '../types';
import { StripeClient } from './client';
import { syncStripeCustomers } from './customers';
import { syncStripePlans } from './plans';
import { syncStripeSubscriptions } from './subscriptions';
import { syncStripeInvoices } from './invoices';

/**
 * Stripe connector implementation
 * Used for SaaS subscriptions, invoices, and customers
 */
export class StripeConnector extends BaseConnector {
  private client: StripeClient;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.credentials.apiKey) {
      throw new Error('Stripe connector requires apiKey');
    }

    this.client = new StripeClient({
      apiKey: config.credentials.apiKey as string,
    });
  }

  get type(): string {
    return 'stripe';
  }

  /**
   * Get the Stripe client for direct API access
   */
  getClient(): StripeClient {
    return this.client;
  }

  /**
   * Test connection to Stripe
   */
  async testConnection(): Promise<boolean> {
    this.logger.info('Testing Stripe connection');
    return this.client.testConnection();
  }

  /**
   * Full sync of all Stripe data
   */
  async fullSync(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Stripe full sync', { workspaceId: this.config.workspaceId });

    const recordsProcessed = {
      customers: 0,
      plans: 0,
      subscriptions: 0,
      invoices: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      // 1. Sync customers first (other entities reference them)
      try {
        recordsProcessed.customers = await syncStripeCustomers(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Stripe customers', {
          count: recordsProcessed.customers,
        });
      } catch (error) {
        this.logger.error('Failed to sync customers', error as Error);
        errors.push({
          type: 'customer_sync_error',
          message: (error as Error).message,
        });
      }

      // 2. Sync plans (products/prices)
      try {
        recordsProcessed.plans = await syncStripePlans(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Stripe plans', {
          count: recordsProcessed.plans,
        });
      } catch (error) {
        this.logger.error('Failed to sync plans', error as Error);
        errors.push({
          type: 'plan_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync subscriptions
      try {
        recordsProcessed.subscriptions = await syncStripeSubscriptions(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Stripe subscriptions', {
          count: recordsProcessed.subscriptions,
        });
      } catch (error) {
        this.logger.error('Failed to sync subscriptions', error as Error);
        errors.push({
          type: 'subscription_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync invoices
      try {
        recordsProcessed.invoices = await syncStripeInvoices(
          this.client,
          this.config.workspaceId
        );
        this.logger.info('Synced Stripe invoices', {
          count: recordsProcessed.invoices,
        });
      } catch (error) {
        this.logger.error('Failed to sync invoices', error as Error);
        errors.push({
          type: 'invoice_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('Stripe full sync completed', {
        workspaceId: this.config.workspaceId,
        recordsProcessed,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Stripe full sync failed', error as Error);
      return {
        success: false,
        recordsProcessed,
        errors: [
          {
            type: 'sync_error',
            message: (error as Error).message,
          },
        ],
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Incremental sync since last sync date
   */
  async incrementalSync(since: Date): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.info('Starting Stripe incremental sync', {
      workspaceId: this.config.workspaceId,
      since: since.toISOString(),
    });

    const recordsProcessed = {
      customers: 0,
      plans: 0,
      subscriptions: 0,
      invoices: 0,
    };

    const errors: SyncResult['errors'] = [];

    try {
      // 1. Sync customers created/updated since last sync
      try {
        recordsProcessed.customers = await syncStripeCustomers(
          this.client,
          this.config.workspaceId,
          { createdAfter: since }
        );
        this.logger.info('Synced Stripe customers (incremental)', {
          count: recordsProcessed.customers,
        });
      } catch (error) {
        this.logger.error('Failed to sync customers', error as Error);
        errors.push({
          type: 'customer_sync_error',
          message: (error as Error).message,
        });
      }

      // 2. Sync plans created since last sync
      try {
        recordsProcessed.plans = await syncStripePlans(
          this.client,
          this.config.workspaceId,
          { createdAfter: since }
        );
        this.logger.info('Synced Stripe plans (incremental)', {
          count: recordsProcessed.plans,
        });
      } catch (error) {
        this.logger.error('Failed to sync plans', error as Error);
        errors.push({
          type: 'plan_sync_error',
          message: (error as Error).message,
        });
      }

      // 3. Sync subscriptions created since last sync
      try {
        recordsProcessed.subscriptions = await syncStripeSubscriptions(
          this.client,
          this.config.workspaceId,
          { createdAfter: since }
        );
        this.logger.info('Synced Stripe subscriptions (incremental)', {
          count: recordsProcessed.subscriptions,
        });
      } catch (error) {
        this.logger.error('Failed to sync subscriptions', error as Error);
        errors.push({
          type: 'subscription_sync_error',
          message: (error as Error).message,
        });
      }

      // 4. Sync invoices created since last sync
      try {
        recordsProcessed.invoices = await syncStripeInvoices(
          this.client,
          this.config.workspaceId,
          { createdAfter: since }
        );
        this.logger.info('Synced Stripe invoices (incremental)', {
          count: recordsProcessed.invoices,
        });
      } catch (error) {
        this.logger.error('Failed to sync invoices', error as Error);
        errors.push({
          type: 'invoice_sync_error',
          message: (error as Error).message,
        });
      }

      this.logger.info('Stripe incremental sync completed', {
        workspaceId: this.config.workspaceId,
        recordsProcessed,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Stripe incremental sync failed', error as Error);
      return {
        success: false,
        recordsProcessed,
        errors: [
          {
            type: 'sync_error',
            message: (error as Error).message,
          },
        ],
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Stripe API keys don't need refresh
   */
  async refreshTokens() {
    return {
      accessToken: this.config.credentials.apiKey as string,
    };
  }
}
