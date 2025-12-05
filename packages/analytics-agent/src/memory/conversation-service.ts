/**
 * Conversation Service
 * 
 * Manages conversation storage and retrieval for conversational memory.
 * Note: Database operations use stubs - implement with actual queries in production.
 */

import { createLogger } from '@aibos/core';
import type {
  Conversation,
  ConversationMessage,
  MessageRole,
  ExtractedEntity,
  ConversationContext,
  CreateConversationOptions,
  AddMessageOptions,
} from './types';
import { EntityExtractor, createEntityExtractor } from './entity-extractor';
import { ContextManager, createContextManager } from './context-manager';

const logger = createLogger('memory:conversation');

/**
 * Conversation Service class
 */
export class ConversationService {
  private workspaceId: string;
  private entityExtractor: EntityExtractor;
  private contextManager: ContextManager;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.entityExtractor = createEntityExtractor();
    this.contextManager = createContextManager();
  }

  /**
   * Create a new conversation
   */
  async createConversation(options: CreateConversationOptions = {}): Promise<Conversation> {
    const { userId, title, metadata } = options;
    const id = crypto.randomUUID();
    const now = new Date();

    const conversation: Conversation = {
      id,
      workspaceId: this.workspaceId,
      userId: userId || null,
      title: title || 'New Conversation',
      status: 'active',
      messageCount: 0,
      extractedEntities: [],
      lastActivityAt: now,
      metadata: metadata || null,
      createdAt: now,
      updatedAt: now,
    };

    // Stub: In production, save to database

    logger.info('Conversation created', {
      conversationId: id,
      workspaceId: this.workspaceId,
    });

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(_conversationId: string): Promise<Conversation | null> {
    // Stub: In production, fetch from database
    return null;
  }

  /**
   * Get conversations for user
   */
  async getConversations(_userId?: string): Promise<Conversation[]> {
    // Stub: In production, fetch from database
    return [];
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    content: string,
    role: MessageRole,
    options: AddMessageOptions = {}
  ): Promise<ConversationMessage> {
    const id = crypto.randomUUID();
    const now = new Date();

    // Extract entities from user messages
    let entities: ExtractedEntity[] = [];
    if (role === 'user') {
      entities = this.entityExtractor.extract(content);
    }

    const message: ConversationMessage = {
      id,
      conversationId,
      role,
      content,
      extractedEntities: entities,
      toolCalls: options.toolCalls || null,
      metadata: options.metadata || null,
      createdAt: now,
    };

    // Stub: In production, save to database and update conversation

    logger.debug('Message added', {
      conversationId,
      messageId: id,
      role,
      entityCount: entities.length,
    });

    return message;
  }

  /**
   * Get messages for conversation
   */
  async getMessages(
    _conversationId: string,
    _options: { limit?: number; before?: Date } = {}
  ): Promise<ConversationMessage[]> {
    // Stub: In production, fetch from database
    return [];
  }

  /**
   * Get context for LLM prompt
   */
  async getConversationContext(
    conversationId: string,
    _maxTokens: number = 4000
  ): Promise<ConversationContext> {
    const conversation = await this.getConversation(conversationId);
    const messages = await this.getMessages(conversationId, { limit: 50 });

    return this.contextManager.buildContext(
      conversationId,
      messages,
      conversation?.summary
    );
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId: string): Promise<boolean> {
    // Stub: In production, update status in database
    logger.info('Conversation archived', { conversationId });
    return true;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    // Stub: In production, delete from database
    logger.info('Conversation deleted', { conversationId });
    return true;
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string): Promise<boolean> {
    // Stub: In production, update in database
    logger.info('Conversation title updated', { conversationId, title });
    return true;
  }

  /**
   * Generate title from first message
   */
  async generateTitle(conversationId: string): Promise<string> {
    const messages = await this.getMessages(conversationId, { limit: 1 });
    const firstMessage = messages[0];

    if (!firstMessage) {
      return 'New Conversation';
    }

    // Simple title generation from first message
    const content = firstMessage.content;
    const title = content.length > 50 ? content.substring(0, 47) + '...' : content;

    await this.updateTitle(conversationId, title);
    return title;
  }

  /**
   * Get all entities from conversation
   */
  async getConversationEntities(conversationId: string): Promise<ExtractedEntity[]> {
    const messages = await this.getMessages(conversationId);
    const allEntities: ExtractedEntity[] = [];

    for (const message of messages) {
      if (message.extractedEntities) {
        allEntities.push(...message.extractedEntities);
      }
    }

    // Merge and deduplicate
    return this.entityExtractor.mergeEntities([], allEntities);
  }

  /**
   * Search conversations
   */
  async searchConversations(
    _query: string,
    _options: { userId?: string; limit?: number } = {}
  ): Promise<Conversation[]> {
    // Stub: In production, perform full-text search
    return [];
  }
}

// Export factory function
export function createConversationService(workspaceId: string): ConversationService {
  return new ConversationService(workspaceId);
}
