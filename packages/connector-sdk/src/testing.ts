/**
 * Testing utilities for connector development
 */

import type {
  ConnectorDefinition,
  ConnectorState,
  SyncResult,
  EntityType,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedProduct,
} from './types';
import { BaseConnector, FetchResult } from './base-connector';
import { validateConnectorDefinition, validateConfig } from './validation';

/**
 * Test suite result
 */
export interface TestSuiteResult {
  name: string;
  passed: boolean;
  tests: TestResult[];
  duration: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Run a complete test suite for a connector
 */
export async function runConnectorTests(
  connector: BaseConnector,
  definition: ConnectorDefinition
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const tests: TestResult[] = [];

  // Test 1: Definition validation
  tests.push(await runTest('Definition validation', async () => {
    const result = validateConnectorDefinition(definition);
    if (!result.valid) {
      throw new Error(result.error);
    }
  }));

  // Test 2: Connection test
  tests.push(await runTest('Connection test', async () => {
    const status = await connector.testConnection();
    if (!status.connected) {
      throw new Error(status.error || 'Connection failed');
    }
  }));

  // Test 3: Fetch customers
  if (definition.sync.entities.some(e => e.type === 'customer' && e.enabled)) {
    tests.push(await runTest('Fetch customers', async () => {
      const result = await connector.fetchCustomers({ limit: 10 });
      validateFetchResult(result, 'customer');
    }));
  }

  // Test 4: Fetch orders
  if (definition.sync.entities.some(e => e.type === 'order' && e.enabled)) {
    tests.push(await runTest('Fetch orders', async () => {
      const result = await connector.fetchOrders({ limit: 10 });
      validateFetchResult(result, 'order');
    }));
  }

  // Test 5: Fetch products
  if (definition.sync.entities.some(e => e.type === 'product' && e.enabled)) {
    tests.push(await runTest('Fetch products', async () => {
      const result = await connector.fetchProducts({ limit: 10 });
      validateFetchResult(result, 'product');
    }));
  }

  // Test 6: Full sync simulation
  const firstEntity = definition.sync.entities.find(e => e.enabled);
  if (firstEntity) {
    tests.push(await runTest(`Full sync (${firstEntity.type})`, async () => {
      const result = await connector.fullSync(firstEntity.type);
      validateSyncResult(result);
    }));
  }

  const allPassed = tests.every(t => t.passed);

  return {
    name: definition.metadata.name,
    passed: allPassed,
    tests,
    duration: Date.now() - startTime,
  };
}

/**
 * Run a single test
 */
async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    await fn();
    return {
      name,
      passed: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Validate fetch result structure
 */
function validateFetchResult(
  result: FetchResult<unknown>,
  entityType: EntityType
): void {
  if (!Array.isArray(result.data)) {
    throw new Error('data must be an array');
  }

  if (typeof result.hasMore !== 'boolean') {
    throw new Error('hasMore must be a boolean');
  }

  // Validate first item if exists
  if (result.data.length > 0) {
    const item = result.data[0] as Record<string, unknown>;
    
    if (!item.externalId) {
      throw new Error('Items must have externalId');
    }

    // Entity-specific validation
    switch (entityType) {
      case 'customer':
        validateCustomer(item);
        break;
      case 'order':
        validateOrder(item);
        break;
      case 'product':
        validateProduct(item);
        break;
    }
  }
}

/**
 * Validate customer structure
 */
function validateCustomer(customer: Record<string, unknown>): void {
  if (!(customer.createdAt instanceof Date)) {
    throw new Error('Customer must have createdAt as Date');
  }
}

/**
 * Validate order structure
 */
function validateOrder(order: Record<string, unknown>): void {
  if (typeof order.totalPrice !== 'number') {
    throw new Error('Order must have totalPrice as number');
  }
  if (typeof order.currency !== 'string') {
    throw new Error('Order must have currency as string');
  }
  if (!Array.isArray(order.lineItems)) {
    throw new Error('Order must have lineItems as array');
  }
}

/**
 * Validate product structure
 */
function validateProduct(product: Record<string, unknown>): void {
  if (typeof product.name !== 'string') {
    throw new Error('Product must have name as string');
  }
  if (!Array.isArray(product.variants)) {
    throw new Error('Product must have variants as array');
  }
}

/**
 * Validate sync result structure
 */
function validateSyncResult(result: SyncResult): void {
  if (typeof result.success !== 'boolean') {
    throw new Error('SyncResult must have success as boolean');
  }
  if (typeof result.recordsProcessed !== 'number') {
    throw new Error('SyncResult must have recordsProcessed as number');
  }
  if (!Array.isArray(result.errors)) {
    throw new Error('SyncResult must have errors as array');
  }
}

/**
 * Create mock customer data for testing
 */
export function createMockCustomer(
  overrides?: Partial<NormalizedCustomer>
): NormalizedCustomer {
  return {
    externalId: `cust_${Date.now()}`,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'Customer',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock order data for testing
 */
export function createMockOrder(
  overrides?: Partial<NormalizedOrder>
): NormalizedOrder {
  return {
    externalId: `ord_${Date.now()}`,
    status: 'completed',
    financialStatus: 'paid',
    currency: 'USD',
    totalPrice: 9999,
    subtotalPrice: 8999,
    totalTax: 800,
    totalDiscount: 0,
    lineItems: [
      {
        externalId: `li_${Date.now()}`,
        name: 'Test Product',
        quantity: 1,
        price: 8999,
        totalDiscount: 0,
      },
    ],
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock product data for testing
 */
export function createMockProduct(
  overrides?: Partial<NormalizedProduct>
): NormalizedProduct {
  return {
    externalId: `prod_${Date.now()}`,
    name: 'Test Product',
    description: 'A test product',
    status: 'active',
    variants: [
      {
        externalId: `var_${Date.now()}`,
        sku: 'TEST-001',
        price: 2999,
        inventoryQuantity: 100,
      },
    ],
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock connector state for testing
 */
export function createMockConnectorState(
  workspaceId: string = 'test-workspace',
  connectorId: string = 'test-connector'
): ConnectorState {
  return {
    workspaceId,
    connectorId,
    credentials: {},
    config: {},
    lastSyncCursors: {
      customer: undefined,
      order: undefined,
      product: undefined,
      subscription: undefined,
      invoice: undefined,
      transaction: undefined,
      campaign: undefined,
      event: undefined,
      custom: undefined,
    },
  };
}
