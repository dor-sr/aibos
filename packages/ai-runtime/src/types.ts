/**
 * AI Runtime types and interfaces
 */

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: string;
}

export interface CompletionRequest {
  messages: Message[];
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  message: Message;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolProperty;
}

export interface StreamChunk {
  content?: string;
  toolCall?: Partial<ToolCall>;
  done: boolean;
}

/**
 * LLM Provider interface - all providers must implement this
 */
export interface LLMProviderInterface {
  /**
   * Generate a completion
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate a streaming completion
   */
  stream?(request: CompletionRequest): AsyncIterable<StreamChunk>;
}





