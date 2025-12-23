import { createLogger } from '@aibos/core';
import type { VerticalType } from '@aibos/core';
import type { LLMProviderInterface, ToolRegistry } from '@aibos/ai-runtime';
import { executeToolCalls } from '@aibos/ai-runtime';
import { detectIntent, type IntentType } from './intent';
import { mapQueryToPattern, type QueryPattern } from './query-mapper';
import { formatResponse } from './response-formatter';

const logger = createLogger('nlq:handler');

export interface NLQRequest {
  question: string;
  workspaceId: string;
  verticalType: VerticalType;
  provider: LLMProviderInterface;
  toolRegistry: ToolRegistry;
  systemPrompt: string;
}

export interface NLQResult {
  success: boolean;
  intent?: IntentType;
  queryPattern?: QueryPattern;
  answer: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Handle a natural language question
 */
export async function handleNLQ(request: NLQRequest): Promise<NLQResult> {
  const startTime = Date.now();

  try {
    // Step 1: Detect intent
    const intent = detectIntent(request.question, request.verticalType);
    logger.debug('Intent detected', { intent });

    // Step 2: Map to query pattern
    const queryPattern = mapQueryToPattern(intent, request.question);
    logger.debug('Query pattern mapped', { queryPattern });

    // Step 3: Generate response using LLM with tools
    const response = await request.provider.complete({
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.question },
      ],
      tools: request.toolRegistry.getDefinitions(),
    });

    // Step 4: Execute any tool calls
    let data: Record<string, unknown> = {};
    if (response.message.toolCalls && response.message.toolCalls.length > 0) {
      const toolResults = await executeToolCalls(
        response.message.toolCalls,
        request.toolRegistry
      );

      // Parse tool results
      for (const result of toolResults) {
        try {
          const parsed = JSON.parse(result.result);
          data = { ...data, ...parsed };
        } catch {
          // Result might not be JSON
        }
      }
    }

    // Step 5: Format the final response
    const answer = formatResponse(
      response.message.content,
      data,
      request.verticalType
    );

    const duration = Date.now() - startTime;
    logger.info('NLQ processed', { intent, duration });

    return {
      success: true,
      intent,
      queryPattern,
      answer,
      data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('NLQ failed', error as Error, { duration });

    return {
      success: false,
      answer: 'Sorry, I encountered an error processing your question. Please try again.',
      error: (error as Error).message,
    };
  }
}









