import { createLogger, generateId } from '@aibos/core';
import { db, connectors, syncLogs } from '@aibos/data-model';
import { 
  ShopifyClient, 
  syncOrders, 
  syncProducts, 
  syncCustomers,
  StripeConnector,
} from '@aibos/connectors';
import { eq, and, inArray } from 'drizzle-orm';
import type { JobContext } from './index';

const logger = createLogger('jobs:sync-connectors');

interface ConnectorCredentials {
  accessToken?: string;
  shopDomain?: string;
  apiKey?: string;
  [key: string]: unknown;
}

/**
 * Sync data from all connected data sources
 * This job fetches new data from Shopify, Stripe, etc. and writes to normalized schema
 */
export async function syncConnectors(context: JobContext): Promise<void> {
  logger.info('Starting connector sync', { context });

  // If workspaceId is provided, only sync that workspace
  // Otherwise, sync all active workspaces
  const { workspaceId, connectorId } = context;

  if (workspaceId && connectorId) {
    // Sync specific connector
    await syncSingleConnector(workspaceId, connectorId);
  } else if (workspaceId) {
    // Sync all connectors for a workspace
    await syncWorkspaceConnectors(workspaceId);
  } else {
    // Sync all active connectors across all workspaces
    await syncAllConnectors();
  }

  logger.info('Connector sync completed');
}

async function syncSingleConnector(workspaceId: string, connectorId: string): Promise<void> {
  logger.info('Syncing single connector', { workspaceId, connectorId });

  // Get connector configuration from database
  const connector = await db
    .select()
    .from(connectors)
    .where(
      and(
        eq(connectors.id, connectorId),
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.isEnabled, true),
        inArray(connectors.status, ['connected', 'active'])
      )
    )
    .limit(1);

  const conn = connector[0];
  if (!conn) {
    logger.warn('Connector not found or not active', { workspaceId, connectorId });
    return;
  }

  await runConnectorSync(conn);

  logger.info('Single connector sync completed', { workspaceId, connectorId });
}

async function syncWorkspaceConnectors(workspaceId: string): Promise<void> {
  logger.info('Syncing workspace connectors', { workspaceId });

  // Get all active connectors for workspace
  const activeConnectors = await db
    .select()
    .from(connectors)
    .where(
      and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.isEnabled, true),
        inArray(connectors.status, ['connected', 'active'])
      )
    );

  for (const conn of activeConnectors) {
    await runConnectorSync(conn);
  }

  logger.info('Workspace connector sync completed', { workspaceId, connectorCount: activeConnectors.length });
}

async function syncAllConnectors(): Promise<void> {
  logger.info('Syncing all connectors');

  // Get all active connectors across all workspaces
  const activeConnectors = await db
    .select()
    .from(connectors)
    .where(
      and(
        eq(connectors.isEnabled, true),
        inArray(connectors.status, ['connected', 'active'])
      )
    );

  // Process connectors sequentially to avoid overwhelming external APIs
  for (const conn of activeConnectors) {
    try {
      await runConnectorSync(conn);
    } catch (error) {
      logger.error('Connector sync failed', error as Error, {
        connectorId: conn.id,
        workspaceId: conn.workspaceId,
      });
    }
  }

  logger.info('All connectors sync completed', { connectorCount: activeConnectors.length });
}

async function runConnectorSync(conn: typeof connectors.$inferSelect): Promise<void> {
  const syncLogId = generateId();
  const startedAt = new Date();

  // Create sync log entry
  await db.insert(syncLogs).values({
    id: syncLogId,
    connectorId: conn.id,
    status: 'running',
    syncType: conn.lastSyncAt ? 'incremental' : 'full',
    startedAt,
  });

  // Update connector sync status
  await db
    .update(connectors)
    .set({ lastSyncStatus: 'running' })
    .where(eq(connectors.id, conn.id));

  try {
    let recordsProcessed: Record<string, number> = {};

    switch (conn.type) {
      case 'shopify':
        recordsProcessed = await syncShopifyConnector(conn);
        break;
      case 'stripe':
        recordsProcessed = await syncStripeConnector(conn);
        break;
      // Add other connector types here
      default:
        logger.warn('Unknown connector type', { type: conn.type });
    }

    // Update sync log with success
    await db
      .update(syncLogs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed,
      })
      .where(eq(syncLogs.id, syncLogId));

    // Update connector with success
    await db
      .update(connectors)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: 'completed',
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, conn.id));

    logger.info('Connector sync completed', {
      connectorId: conn.id,
      type: conn.type,
      recordsProcessed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update sync log with failure
    await db
      .update(syncLogs)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errors: [{ type: 'sync_error', message: errorMessage }],
      })
      .where(eq(syncLogs.id, syncLogId));

    // Update connector with failure
    await db
      .update(connectors)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: 'failed',
        lastSyncError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, conn.id));

    throw error;
  }
}

async function syncShopifyConnector(
  conn: typeof connectors.$inferSelect
): Promise<Record<string, number>> {
  const credentials = conn.credentials as ConnectorCredentials | null;

  if (!credentials?.accessToken || !credentials?.shopDomain) {
    throw new Error('Missing Shopify credentials');
  }

  const client = new ShopifyClient({
    shopDomain: credentials.shopDomain,
    accessToken: credentials.accessToken,
  });

  // Test connection
  const isConnected = await client.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to Shopify');
  }

  // Sync in order: customers first (for FK references), then products, then orders
  const customersCount = await syncCustomers(client, conn.workspaceId);
  const productsCount = await syncProducts(client, conn.workspaceId);
  const ordersCount = await syncOrders(client, conn.workspaceId);

  return {
    customers: customersCount,
    products: productsCount,
    orders: ordersCount,
  };
}

async function syncStripeConnector(
  conn: typeof connectors.$inferSelect
): Promise<Record<string, number>> {
  const credentials = conn.credentials as ConnectorCredentials | null;

  if (!credentials?.apiKey) {
    throw new Error('Missing Stripe API key');
  }

  // Create Stripe connector instance
  const stripeConnector = new StripeConnector({
    id: conn.id,
    type: 'stripe',
    workspaceId: conn.workspaceId,
    credentials: { apiKey: credentials.apiKey },
    settings: conn.settings ?? {},
  });

  // Test connection
  const isConnected = await stripeConnector.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to Stripe');
  }

  // Perform sync
  let result;
  if (conn.lastSyncAt) {
    result = await stripeConnector.incrementalSync(conn.lastSyncAt);
  } else {
    result = await stripeConnector.fullSync();
  }

  if (!result.success && result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? 'Stripe sync failed');
  }

  return {
    customers: result.recordsProcessed.customers ?? 0,
    plans: result.recordsProcessed.plans ?? 0,
    subscriptions: result.recordsProcessed.subscriptions ?? 0,
    invoices: result.recordsProcessed.invoices ?? 0,
  };
}
