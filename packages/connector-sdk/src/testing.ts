// Testing utilities for connectors

import {
  ConnectorDefinition,
  ConnectorContext,
  ConnectorLogger,
  SyncResult,
  EntityDefinition,
} from './types';
import { BaseConnector } from './base-connector';
import { validateConnectorDefinition } from './validators';

/**
 * Mock logger for testing
 */
export function createMockLogger(): ConnectorLogger {
  const logs: Array<{
    level: string;
    message: string;
    meta?: Record<string, unknown>;
  }> = [];

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      logs.push({ level: 'debug', message, meta });
    },
    info(message: string, meta?: Record<string, unknown>) {
      logs.push({ level: 'info', message, meta });
    },
    warn(message: string, meta?: Record<string, unknown>) {
      logs.push({ level: 'warn', message, meta });
    },
    error(message: string, meta?: Record<string, unknown>) {
      logs.push({ level: 'error', message, meta });
    },
    getLogs: () => logs,
    clearLogs: () => {
      logs.length = 0;
    },
  } as ConnectorLogger & {
    getLogs: () => typeof logs;
    clearLogs: () => void;
  };
}

/**
 * Create a mock context for testing
 */
export function createMockContext(
  options?: Partial<ConnectorContext>
): ConnectorContext {
  return {
    workspaceId: 'test-workspace-id',
    connectorId: 'test-connector-id',
    credentials: {},
    config: {},
    logger: createMockLogger(),
    ...options,
  };
}

/**
 * Test suite for connectors
 */
export class ConnectorTestSuite {
  private connector: BaseConnector;
  private context: ConnectorContext;

  constructor(
    connector: BaseConnector,
    context?: Partial<ConnectorContext>
  ) {
    this.connector = connector;
    this.context = createMockContext(context);
    this.connector.initialize(this.context);
  }

  /**
   * Run all tests
   */
  async runAll(): Promise<TestResults> {
    const results: TestResults = {
      passed: 0,
      failed: 0,
      tests: [],
    };

    // Definition validation
    await this.runTest(
      results,
      'Definition Validation',
      () => this.testDefinitionValidation()
    );

    // Credential validation
    await this.runTest(
      results,
      'Credential Validation',
      () => this.testCredentialValidation()
    );

    // Connection test
    await this.runTest(
      results,
      'Connection Test',
      () => this.testConnection()
    );

    // Entity sync tests
    const entities = this.connector.getDefinition().entities;
    for (const entity of entities) {
      await this.runTest(
        results,
        `Sync Entity: ${entity.name}`,
        () => this.testEntitySync(entity)
      );
    }

    return results;
  }

  /**
   * Run a single test
   */
  private async runTest(
    results: TestResults,
    name: string,
    testFn: () => Promise<TestResult>
  ): Promise<void> {
    try {
      const result = await testFn();
      results.tests.push({ name, ...result });

      if (result.passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      results.tests.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Test definition validation
   */
  private async testDefinitionValidation(): Promise<TestResult> {
    const definition = this.connector.getDefinition();
    const validation = validateConnectorDefinition(definition);

    return {
      passed: validation.valid,
      error: validation.errors.length > 0
        ? validation.errors.join(', ')
        : undefined,
    };
  }

  /**
   * Test credential validation
   */
  private async testCredentialValidation(): Promise<TestResult> {
    try {
      const isValid = await this.connector.validateCredentials();
      return {
        passed: isValid,
        error: isValid ? undefined : 'Credentials validation failed',
      };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test connection
   */
  private async testConnection(): Promise<TestResult> {
    try {
      const result = await this.connector.testConnection();
      return {
        passed: result.success,
        error: result.message,
        details: result.details,
      };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test entity sync
   */
  private async testEntitySync(
    entity: EntityDefinition
  ): Promise<TestResult> {
    try {
      const result = await this.connector.syncEntity(entity, {
        pageSize: 10,
      });

      const passed =
        result.success &&
        result.errors.length === 0 &&
        result.recordsProcessed >= 0;

      return {
        passed,
        error: result.errors.length > 0
          ? result.errors.map((e) => e.message).join(', ')
          : undefined,
        details: {
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          hasMore: result.hasMore,
        },
      };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

interface TestResult {
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

interface TestResults {
  passed: number;
  failed: number;
  tests: Array<{ name: string } & TestResult>;
}

/**
 * Create a mock response for API testing
 */
export function createMockResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    delay?: number;
  }
): Promise<Response> {
  const { status = 200, headers = {}, delay = 0 } = options || {};

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        new Response(JSON.stringify(data), {
          status,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        })
      );
    }, delay);
  });
}

/**
 * Create a mock fetch function for testing
 */
export function createMockFetch(
  responses: Record<string, unknown>
): typeof fetch {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return createMockResponse(response);
      }
    }

    return createMockResponse({ error: 'Not found' }, { status: 404 });
  };
}
