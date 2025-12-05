import type { LLMConfig, LLMProviderInterface } from '../types';
import { OpenAIProvider } from './openai';

/**
 * Create an LLM provider instance
 */
export function createLLMProvider(config: LLMConfig): LLMProviderInterface {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      throw new Error('Anthropic provider not yet implemented');
    case 'google':
      throw new Error('Google provider not yet implemented');
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

/**
 * Create a default OpenAI provider
 */
export function createDefaultProvider(): LLMProviderInterface {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return createLLMProvider({
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    apiKey,
    temperature: 0.7,
  });
}

