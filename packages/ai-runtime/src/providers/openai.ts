import OpenAI from 'openai';
import { BaseLLMProvider } from './base';
import type {
  LLMConfig,
  CompletionRequest,
  CompletionResponse,
  Message,
  Tool,
  StreamChunk,
} from '../types';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    this.validateConfig();

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  getDefaultModel(): string {
    return 'gpt-4-turbo-preview';
  }

  /**
   * Generate a completion using OpenAI
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.logger.debug('Generating completion', {
      model: this.config.model,
      messageCount: request.messages.length,
      hasTools: !!request.tools?.length,
    });

    const response = await this.client.chat.completions.create({
      model: this.config.model || this.getDefaultModel(),
      messages: this.formatMessages(request.messages),
      tools: request.tools ? this.formatTools(request.tools) : undefined,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    const message = this.parseMessage(choice.message);

    this.logger.debug('Completion generated', {
      finishReason: choice.finish_reason,
      usage: response.usage,
    });

    return {
      message,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  /**
   * Generate a streaming completion
   */
  override async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    this.logger.debug('Starting streaming completion', {
      model: this.config.model,
    });

    const stream = await this.client.chat.completions.create({
      model: this.config.model || this.getDefaultModel(),
      messages: this.formatMessages(request.messages),
      tools: request.tools ? this.formatTools(request.tools) : undefined,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { content: delta.content, done: false };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          yield {
            toolCall: {
              id: tc.id,
              name: tc.function?.name,
              arguments: tc.function?.arguments
                ? JSON.parse(tc.function.arguments)
                : undefined,
            },
            done: false,
          };
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        yield { done: true };
      }
    }
  }

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(
    messages: Message[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId!,
        };
      }

      if (msg.role === 'assistant' && msg.toolCalls) {
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }

      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    });
  }

  /**
   * Format tools for OpenAI API
   */
  private formatTools(tools: Tool[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as unknown as Record<string, unknown>,
      },
    }));
  }

  /**
   * Parse OpenAI message to our format
   */
  private parseMessage(
    message: OpenAI.Chat.Completions.ChatCompletionMessage
  ): Message {
    const result: Message = {
      role: 'assistant',
      content: message.content || '',
    };

    if (message.tool_calls) {
      result.toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));
    }

    return result;
  }

  /**
   * Map OpenAI finish reason to our format
   */
  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'tool_calls' | 'length' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}

