import { createLogger } from '@aibos/core';
import type { ToolCall, ToolResult } from '../types';
import type { ToolRegistry } from './registry';

const logger = createLogger('tools:executor');

/**
 * Execute tool calls and return results
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  registry: ToolRegistry
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    logger.debug('Executing tool call', { name: call.name, id: call.id });

    const handler = registry.getHandler(call.name);

    if (!handler) {
      logger.warn('Tool not found', { name: call.name });
      results.push({
        toolCallId: call.id,
        result: JSON.stringify({ error: `Tool not found: ${call.name}` }),
      });
      continue;
    }

    try {
      const result = await handler(call.arguments);
      results.push({
        toolCallId: call.id,
        result,
      });
      logger.debug('Tool call completed', { name: call.name });
    } catch (error) {
      logger.error('Tool call failed', error as Error, { name: call.name });
      results.push({
        toolCallId: call.id,
        result: JSON.stringify({
          error: `Tool execution failed: ${(error as Error).message}`,
        }),
      });
    }
  }

  return results;
}

/**
 * Execute tool calls in parallel
 */
export async function executeToolCallsParallel(
  toolCalls: ToolCall[],
  registry: ToolRegistry
): Promise<ToolResult[]> {
  const promises = toolCalls.map(async (call) => {
    const handler = registry.getHandler(call.name);

    if (!handler) {
      return {
        toolCallId: call.id,
        result: JSON.stringify({ error: `Tool not found: ${call.name}` }),
      };
    }

    try {
      const result = await handler(call.arguments);
      return {
        toolCallId: call.id,
        result,
      };
    } catch (error) {
      return {
        toolCallId: call.id,
        result: JSON.stringify({
          error: `Tool execution failed: ${(error as Error).message}`,
        }),
      };
    }
  });

  return Promise.all(promises);
}






