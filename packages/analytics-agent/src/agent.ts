import { createLogger } from '@aibos/core';
import type { VerticalType } from '@aibos/core';
import { createDefaultProvider, ToolRegistry, createAnalyticsPrompt } from '@aibos/ai-runtime';
import type { LLMProviderInterface, Message } from '@aibos/ai-runtime';
import { handleNLQ, type NLQResult } from './nlq';
import { registerMetricTools } from './metrics';

const logger = createLogger('analytics-agent');

export interface AnalyticsAgentConfig {
  workspaceId: string;
  verticalType: VerticalType;
  currency: string;
  timezone: string;
}

/**
 * Analytics Agent - the main entry point for analytics functionality
 */
export class AnalyticsAgent {
  private config: AnalyticsAgentConfig;
  private provider: LLMProviderInterface;
  private toolRegistry: ToolRegistry;
  private systemPrompt: string;

  constructor(config: AnalyticsAgentConfig) {
    this.config = config;
    this.provider = createDefaultProvider();
    this.toolRegistry = new ToolRegistry();

    // Register tools based on vertical
    registerMetricTools(this.toolRegistry, config.verticalType);

    // Create system prompt
    this.systemPrompt = createAnalyticsPrompt({
      verticalType: config.verticalType,
      currency: config.currency,
      timezone: config.timezone,
      tools: this.toolRegistry
        .getDefinitions()
        .map((t) => `- ${t.name}: ${t.description}`)
        .join('\n'),
    });

    logger.info('Analytics Agent initialized', {
      workspaceId: config.workspaceId,
      verticalType: config.verticalType,
    });
  }

  /**
   * Ask a natural language question
   */
  async ask(question: string): Promise<NLQResult> {
    logger.info('Processing question', {
      workspaceId: this.config.workspaceId,
      question,
    });

    const result = await handleNLQ({
      question,
      workspaceId: this.config.workspaceId,
      verticalType: this.config.verticalType,
      provider: this.provider,
      toolRegistry: this.toolRegistry,
      systemPrompt: this.systemPrompt,
    });

    logger.info('Question processed', {
      workspaceId: this.config.workspaceId,
      success: result.success,
      intent: result.intent,
    });

    return result;
  }

  /**
   * Chat with the agent (maintains conversation history)
   */
  async chat(messages: Message[]): Promise<Message> {
    const response = await this.provider.complete({
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...messages,
      ],
      tools: this.toolRegistry.getDefinitions(),
    });

    return response.message;
  }

  /**
   * Get suggestions for questions based on recent data
   */
  getSuggestions(): string[] {
    const baseSuggestions = [
      'How did revenue change vs last week?',
      'What are my top performing products?',
      'How are new vs returning customers performing?',
    ];

    if (this.config.verticalType === 'ecommerce') {
      return [
        ...baseSuggestions,
        'What is my average order value trend?',
        'Which channels are driving the most sales?',
      ];
    }

    if (this.config.verticalType === 'saas') {
      return [
        'How did MRR change this month?',
        'What is my churn rate?',
        'Which plans are most popular?',
        ...baseSuggestions.slice(0, 2),
      ];
    }

    return baseSuggestions;
  }
}

/**
 * Create an Analytics Agent instance
 */
export function createAnalyticsAgent(config: AnalyticsAgentConfig): AnalyticsAgent {
  return new AnalyticsAgent(config);
}


