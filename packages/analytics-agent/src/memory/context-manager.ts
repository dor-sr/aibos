/**
 * Context Manager
 * 
 * Manages conversation context for LLM prompts.
 * Handles context window size, summarization, and relevance scoring.
 */

import { createLogger } from '@aibos/core';
import type {
  ConversationMessage,
  ConversationContext,
  ExtractedEntity,
} from './types';
import { getTopEntities, mergeEntities } from './entity-extractor';

const logger = createLogger('memory:context-manager');

// Default configuration
const DEFAULT_MAX_MESSAGES = 10;
const DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_SUMMARIZE_THRESHOLD = 20;

export interface ContextManagerOptions {
  maxMessages?: number;
  maxTokens?: number;
  summarizeThreshold?: number;
}

/**
 * Context Manager class
 */
export class ContextManager {
  private maxMessages: number;
  private maxTokens: number;
  private summarizeThreshold: number;

  constructor(options: ContextManagerOptions = {}) {
    this.maxMessages = options.maxMessages || DEFAULT_MAX_MESSAGES;
    this.maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    this.summarizeThreshold = options.summarizeThreshold || DEFAULT_SUMMARIZE_THRESHOLD;
  }

  /**
   * Build conversation context from messages
   */
  buildContext(
    conversationId: string,
    messages: ConversationMessage[],
    summary?: string
  ): ConversationContext {
    // Get recent messages within limits
    const recentMessages = this.selectRecentMessages(messages);

    // Collect all entities from recent messages
    const allEntities: ExtractedEntity[] = [];
    for (const msg of recentMessages) {
      if (msg.entities) {
        allEntities.push(...msg.entities);
      }
    }

    // Get top entities for context
    const activeEntities = getTopEntities(mergeEntities(allEntities), 15);

    // Extract preferences from message history
    const preferences = this.extractPreferences(messages);

    return {
      conversationId,
      recentMessages,
      summary,
      activeEntities,
      preferredMetrics: preferences.metrics,
      preferredPeriod: preferences.period,
      lastTopic: preferences.topic,
    };
  }

  /**
   * Select recent messages that fit within context limits
   */
  selectRecentMessages(messages: ConversationMessage[]): ConversationMessage[] {
    // Start from the most recent
    const reversed = [...messages].reverse();
    const selected: ConversationMessage[] = [];
    let totalTokens = 0;

    for (const msg of reversed) {
      const msgTokens = msg.tokenCount || this.estimateTokens(msg.content);
      
      // Check limits
      if (selected.length >= this.maxMessages) break;
      if (totalTokens + msgTokens > this.maxTokens) break;

      selected.unshift(msg); // Add to front to maintain order
      totalTokens += msgTokens;
    }

    return selected;
  }

  /**
   * Estimate token count for a message
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if context needs summarization
   */
  needsSummarization(messageCount: number): boolean {
    return messageCount >= this.summarizeThreshold;
  }

  /**
   * Generate a summary prompt for conversation
   */
  generateSummaryPrompt(messages: ConversationMessage[]): string {
    const messageTexts = messages.map(
      (m) => `${m.role.toUpperCase()}: ${m.content}`
    ).join('\n\n');

    return `Summarize the following conversation between a user and an analytics assistant. 
Focus on:
1. Key topics discussed
2. Important metrics mentioned
3. Time periods of interest
4. Any specific products, customers, or segments discussed
5. Key insights or findings

Keep the summary concise but include all relevant context that would help continue the conversation.

CONVERSATION:
${messageTexts}

SUMMARY:`;
  }

  /**
   * Extract user preferences from message history
   */
  private extractPreferences(messages: ConversationMessage[]): {
    metrics: string[];
    period?: string;
    topic?: string;
  } {
    const metricMentions = new Map<string, number>();
    let lastPeriod: string | undefined;
    let lastTopic: string | undefined;

    for (const msg of messages) {
      if (msg.entities) {
        for (const entity of msg.entities) {
          if (entity.type === 'metric') {
            const normalized = entity.normalized || entity.value;
            metricMentions.set(
              normalized,
              (metricMentions.get(normalized) || 0) + 1
            );
          }
          if (entity.type === 'time_period' || entity.type === 'date_range') {
            lastPeriod = entity.normalized || entity.value;
          }
        }
      }

      // Extract topic from intent
      if (msg.role === 'user' && msg.intent) {
        lastTopic = msg.intent;
      }
    }

    // Get top metrics by mention count
    const sortedMetrics = [...metricMentions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([metric]) => metric);

    return {
      metrics: sortedMetrics,
      period: lastPeriod,
      topic: lastTopic,
    };
  }

  /**
   * Format context for LLM prompt
   */
  formatContextForPrompt(context: ConversationContext): string {
    const parts: string[] = [];

    // Add summary if available
    if (context.summary) {
      parts.push(`CONVERSATION SUMMARY:\n${context.summary}`);
    }

    // Add active entities
    if (context.activeEntities.length > 0) {
      const entityList = context.activeEntities
        .map((e) => `- ${e.type}: ${e.normalized || e.value}`)
        .join('\n');
      parts.push(`ACTIVE CONTEXT:\n${entityList}`);
    }

    // Add preferences
    if (context.preferredMetrics.length > 0) {
      parts.push(`USER FOCUS AREAS: ${context.preferredMetrics.join(', ')}`);
    }
    if (context.preferredPeriod) {
      parts.push(`TIME PERIOD OF INTEREST: ${context.preferredPeriod}`);
    }

    // Add recent messages
    if (context.recentMessages.length > 0) {
      const messageHistory = context.recentMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      parts.push(`RECENT CONVERSATION:\n${messageHistory}`);
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Create a follow-up aware prompt
   */
  createFollowUpPrompt(
    currentQuestion: string,
    context: ConversationContext
  ): string {
    const contextStr = this.formatContextForPrompt(context);

    return `You are an analytics assistant helping with business data questions.

${contextStr}

---

NEW QUESTION: ${currentQuestion}

If this appears to be a follow-up question, use the conversation context to understand what the user is referring to. 
Pay attention to pronouns like "it", "this", "that" which may refer to previously discussed entities.
If the time period is not specified, use the previously discussed period if available.

Provide a helpful, data-driven response.`;
  }

  /**
   * Score relevance of a message to current context
   */
  scoreMessageRelevance(
    message: ConversationMessage,
    currentEntities: ExtractedEntity[]
  ): number {
    if (!message.entities || message.entities.length === 0) {
      return 0.5; // Neutral score for messages without entities
    }

    const currentTypes = new Set(currentEntities.map((e) => e.type));
    const currentValues = new Set(
      currentEntities.map((e) => e.normalized || e.value)
    );

    let score = 0;
    let maxScore = 0;

    for (const entity of message.entities) {
      maxScore += 1;
      
      // Higher score for matching values
      if (currentValues.has(entity.normalized || entity.value)) {
        score += 1;
      }
      // Lower score for matching types only
      else if (currentTypes.has(entity.type)) {
        score += 0.5;
      }
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Filter messages by relevance to current context
   */
  filterByRelevance(
    messages: ConversationMessage[],
    currentEntities: ExtractedEntity[],
    minScore: number = 0.3
  ): ConversationMessage[] {
    return messages.filter((msg) => {
      const score = this.scoreMessageRelevance(msg, currentEntities);
      return score >= minScore;
    });
  }
}

// Export singleton instance
export const contextManager = new ContextManager();

// Export factory function
export function createContextManager(options?: ContextManagerOptions): ContextManager {
  return new ContextManager(options);
}

/**
 * Quick helper to build context
 */
export function buildConversationContext(
  conversationId: string,
  messages: ConversationMessage[],
  summary?: string,
  options?: ContextManagerOptions
): ConversationContext {
  const manager = new ContextManager(options);
  return manager.buildContext(conversationId, messages, summary);
}
