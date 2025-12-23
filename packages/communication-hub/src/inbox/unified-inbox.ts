/**
 * Unified Inbox
 * 
 * Aggregates messages from all communication channels into a single inbox.
 */

import { createLogger } from '@aibos/core';
import type {
  ChannelType,
  UnifiedMessage,
  Conversation,
  InboxItem,
  MessageDirection,
  MessagePriority,
  SendMessageInput,
  ChannelConfig,
  MessageEvent,
} from '../types';

const logger = createLogger('communication:inbox');

export interface InboxFilters {
  channel?: ChannelType;
  contactId?: string;
  employeeId?: string;
  unreadOnly?: boolean;
  priority?: MessagePriority;
  since?: Date;
  limit?: number;
  offset?: number;
}

export interface InboxStats {
  totalMessages: number;
  unreadMessages: number;
  byChannel: Record<ChannelType, { total: number; unread: number }>;
  pendingReplies: number;
}

type MessageHandler = (event: MessageEvent) => void;

/**
 * Unified Inbox class
 */
export class UnifiedInbox {
  private workspaceId: string;
  private messages: Map<string, UnifiedMessage> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private handlers: Map<string, MessageHandler[]> = new Map();
  private config: ChannelConfig = {};

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Configure channels
   */
  configure(config: ChannelConfig): void {
    this.config = config;
    logger.info('Inbox configured', {
      workspaceId: this.workspaceId,
      channels: Object.keys(config),
    });
  }

  /**
   * Get inbox items (messages or conversations)
   */
  getItems(filters: InboxFilters = {}): InboxItem[] {
    const {
      channel,
      contactId,
      employeeId,
      unreadOnly,
      priority,
      since,
      limit = 50,
      offset = 0,
    } = filters;

    // Get all conversations
    let items: InboxItem[] = [];

    for (const conversation of this.conversations.values()) {
      // Apply filters
      if (channel && conversation.channel !== channel) continue;
      if (contactId && conversation.contactId !== contactId) continue;
      if (employeeId && conversation.employeeId !== employeeId) continue;
      if (since && conversation.lastMessageAt < since) continue;

      // Get latest message for preview
      const latestMessage = this.getLatestMessageForConversation(conversation.id);
      
      const item: InboxItem = {
        id: conversation.id,
        type: 'conversation',
        channel: conversation.channel,
        contactId: conversation.contactId,
        contactName: this.getContactName(conversation.contactId),
        preview: latestMessage?.content.slice(0, 100) || '',
        unread: conversation.unreadCount > 0,
        timestamp: conversation.lastMessageAt,
        employeeId: conversation.employeeId,
        conversationId: conversation.id,
        messageCount: conversation.messageCount,
        priority: this.getConversationPriority(conversation),
      };

      if (unreadOnly && !item.unread) continue;
      if (priority && item.priority !== priority) continue;

      items.push(item);
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    return items.slice(offset, offset + limit);
  }

  /**
   * Get unread count
   */
  getUnreadCount(filters?: { channel?: ChannelType; contactId?: string }): number {
    let count = 0;
    for (const conversation of this.conversations.values()) {
      if (filters?.channel && conversation.channel !== filters.channel) continue;
      if (filters?.contactId && conversation.contactId !== filters.contactId) continue;
      count += conversation.unreadCount;
    }
    return count;
  }

  /**
   * Get inbox statistics
   */
  getStats(): InboxStats {
    const stats: InboxStats = {
      totalMessages: this.messages.size,
      unreadMessages: 0,
      byChannel: {
        email: { total: 0, unread: 0 },
        slack: { total: 0, unread: 0 },
        whatsapp: { total: 0, unread: 0 },
        widget: { total: 0, unread: 0 },
      },
      pendingReplies: 0,
    };

    for (const conversation of this.conversations.values()) {
      stats.byChannel[conversation.channel].total += conversation.messageCount;
      stats.byChannel[conversation.channel].unread += conversation.unreadCount;
      stats.unreadMessages += conversation.unreadCount;

      // Count pending replies (conversations needing response)
      if (this.needsReply(conversation)) {
        stats.pendingReplies++;
      }
    }

    return stats;
  }

  /**
   * Add a message to the inbox
   */
  addMessage(message: UnifiedMessage): void {
    this.messages.set(message.id, message);

    // Update or create conversation
    this.updateConversation(message);

    // Emit event
    this.emit({
      type: message.direction === 'inbound' ? 'message.received' : 'message.sent',
      message,
      timestamp: new Date(),
    });

    logger.debug('Message added to inbox', {
      id: message.id,
      channel: message.channel,
      direction: message.direction,
    });
  }

  /**
   * Get messages for a conversation
   */
  getConversationMessages(conversationId: string, limit: number = 50): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];

    for (const message of this.messages.values()) {
      if (message.threadId === conversationId || this.getConversationId(message) === conversationId) {
        messages.push(message);
      }
    }

    // Sort by creation time
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return messages.slice(-limit);
  }

  /**
   * Mark messages as read
   */
  markAsRead(messageIds: string[]): void {
    for (const id of messageIds) {
      const message = this.messages.get(id);
      if (message && !message.readAt) {
        message.readAt = new Date();
        message.status = 'read';
        
        // Update conversation unread count
        const conversationId = this.getConversationId(message);
        const conversation = this.conversations.get(conversationId);
        if (conversation && conversation.unreadCount > 0) {
          conversation.unreadCount--;
        }
      }
    }
  }

  /**
   * Mark conversation as read
   */
  markConversationAsRead(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
      
      // Mark all messages as read
      for (const message of this.messages.values()) {
        if (this.getConversationId(message) === conversationId && !message.readAt) {
          message.readAt = new Date();
          message.status = 'read';
        }
      }
    }
  }

  /**
   * Resolve a conversation
   */
  resolveConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'resolved';
      conversation.updatedAt = new Date();
      
      logger.info('Conversation resolved', { conversationId });
    }
  }

  /**
   * Assign conversation to an employee
   */
  assignConversation(conversationId: string, employeeId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.employeeId = employeeId;
      conversation.assignedTo = employeeId;
      conversation.updatedAt = new Date();
      
      logger.info('Conversation assigned', { conversationId, employeeId });
    }
  }

  /**
   * Subscribe to message events
   */
  on(event: MessageEvent['type'], handler: MessageHandler): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  /**
   * Unsubscribe from message events
   */
  off(event: MessageEvent['type'], handler: MessageHandler): void {
    const handlers = this.handlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Get a conversation by ID
   */
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * Get conversations for a contact
   */
  getContactConversations(contactId: string): Conversation[] {
    const conversations: Conversation[] = [];
    for (const conversation of this.conversations.values()) {
      if (conversation.contactId === contactId) {
        conversations.push(conversation);
      }
    }
    return conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  /**
   * Search messages
   */
  search(query: string, filters?: InboxFilters): UnifiedMessage[] {
    const queryLower = query.toLowerCase();
    const results: UnifiedMessage[] = [];

    for (const message of this.messages.values()) {
      // Apply filters
      if (filters?.channel && message.channel !== filters.channel) continue;
      if (filters?.contactId && message.contactId !== filters.contactId) continue;
      if (filters?.since && message.createdAt < filters.since) continue;

      // Search in content
      if (message.content.toLowerCase().includes(queryLower)) {
        results.push(message);
        continue;
      }

      // Search in subject
      if (message.subject?.toLowerCase().includes(queryLower)) {
        results.push(message);
      }
    }

    // Sort by relevance/date
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    return results.slice(offset, offset + limit);
  }

  // Private methods

  private updateConversation(message: UnifiedMessage): void {
    const conversationId = message.threadId || this.generateConversationId(message);
    let conversation = this.conversations.get(conversationId);

    if (!conversation) {
      conversation = {
        id: conversationId,
        workspaceId: this.workspaceId,
        contactId: message.contactId || '',
        employeeId: message.employeeId,
        channel: message.channel,
        subject: message.subject,
        status: 'active',
        lastMessageAt: message.createdAt,
        messageCount: 0,
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    conversation.messageCount++;
    conversation.lastMessageAt = message.createdAt;
    conversation.updatedAt = new Date();

    // Increment unread for inbound messages
    if (message.direction === 'inbound' && !message.readAt) {
      conversation.unreadCount++;
    }

    this.conversations.set(conversationId, conversation);
  }

  private generateConversationId(message: UnifiedMessage): string {
    // Generate conversation ID based on channel and contact
    return `conv_${message.channel}_${message.contactId}_${Date.now()}`;
  }

  private getConversationId(message: UnifiedMessage): string {
    return message.threadId || this.generateConversationId(message);
  }

  private getLatestMessageForConversation(conversationId: string): UnifiedMessage | null {
    let latest: UnifiedMessage | null = null;

    for (const message of this.messages.values()) {
      if (this.getConversationId(message) === conversationId) {
        if (!latest || message.createdAt > latest.createdAt) {
          latest = message;
        }
      }
    }

    return latest;
  }

  private getContactName(contactId: string): string {
    // TODO: Fetch from contacts database
    return contactId;
  }

  private getConversationPriority(conversation: Conversation): MessagePriority {
    // Determine priority based on various factors
    if (conversation.unreadCount > 5) return 'high';
    if (conversation.unreadCount > 2) return 'normal';
    return 'low';
  }

  private needsReply(conversation: Conversation): boolean {
    if (conversation.status !== 'active') return false;

    const latestMessage = this.getLatestMessageForConversation(conversation.id);
    if (!latestMessage) return false;

    // Needs reply if last message was inbound
    return latestMessage.direction === 'inbound';
  }

  private emit(event: MessageEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error('Event handler error', error as Error);
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.messages.clear();
    this.conversations.clear();
  }

  /**
   * Export inbox data
   */
  export(): { messages: UnifiedMessage[]; conversations: Conversation[] } {
    return {
      messages: Array.from(this.messages.values()),
      conversations: Array.from(this.conversations.values()),
    };
  }
}

/**
 * Create a unified inbox instance
 */
export function createUnifiedInbox(workspaceId: string): UnifiedInbox {
  return new UnifiedInbox(workspaceId);
}

