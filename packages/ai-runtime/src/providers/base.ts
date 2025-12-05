import { createLogger, type Logger } from '@aibos/core';
import type {
  LLMConfig,
  LLMProviderInterface,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from '../types';

/**
 * Base LLM provider class
 */
export abstract class BaseLLMProvider implements LLMProviderInterface {
  protected config: LLMConfig;
  protected logger: Logger;

  constructor(config: LLMConfig) {
    this.config = config;
    this.logger = createLogger(`llm:${config.provider}`);
  }

  /**
   * Generate a completion
   */
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate a streaming completion (optional)
   */
  stream?(request: CompletionRequest): AsyncIterable<StreamChunk>;

  /**
   * Get the default model for this provider
   */
  abstract getDefaultModel(): string;

  /**
   * Validate the configuration
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.config.provider} provider`);
    }
  }
}




