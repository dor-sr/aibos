/**
 * Slack Channel
 * 
 * Slack communication channel for AI employees.
 */

import { createLogger } from '@aibos/core';
import type {
  ChannelProvider,
  UnifiedMessage,
  SendMessageInput,
  Conversation,
  SlackChannelConfig,
} from '../../types';

const logger = createLogger('communication:slack');

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  attachments?: SlackAttachment[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: unknown[];
  accessory?: unknown;
}

interface SlackAttachment {
  fallback: string;
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
}

interface SlackEventPayload {
  type: string;
  event: {
    type: string;
    user?: string;
    channel: string;
    text?: string;
    ts: string;
    thread_ts?: string;
    blocks?: SlackBlock[];
    files?: Array<{
      id: string;
      name: string;
      url_private: string;
      mimetype: string;
      size: number;
    }>;
  };
  event_id: string;
  event_time: number;
}

/**
 * Slack Channel Provider
 */
export class SlackChannel implements ChannelProvider {
  readonly channel = 'slack' as const;
  private config: SlackChannelConfig | null = null;
  private initialized = false;

  /**
   * Initialize the Slack channel
   */
  async initialize(config: SlackChannelConfig): Promise<void> {
    this.config = config;
    this.initialized = true;

    // Test the connection
    try {
      await this.testConnection();
      logger.info('Slack channel initialized');
    } catch (error) {
      logger.error('Failed to initialize Slack channel', error as Error);
      throw error;
    }
  }

  /**
   * Send a Slack message
   */
  async send(input: SendMessageInput): Promise<UnifiedMessage> {
    if (!this.isConfigured()) {
      throw new Error('Slack channel not configured');
    }

    const id = `slack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Determine target channel/user
    const channelId = input.metadata?.slack?.channelId || this.config!.defaultChannel;
    if (!channelId) {
      throw new Error('No Slack channel specified');
    }

    // Build Slack message
    const slackMessage: SlackMessage = {
      channel: channelId,
      text: input.content,
      blocks: input.metadata?.slack?.blocks as SlackBlock[] | undefined,
    };

    // Add threading
    if (input.threadId || input.metadata?.slack?.threadTs) {
      slackMessage.thread_ts = input.metadata?.slack?.threadTs || input.threadId;
    }

    try {
      const result = await this.postMessage(slackMessage);

      const message: UnifiedMessage = {
        id,
        workspaceId: input.workspaceId,
        employeeId: input.employeeId,
        contactId: input.contactId,
        channel: 'slack',
        direction: 'outbound',
        status: 'sent',
        priority: input.priority || 'normal',
        content: input.content,
        threadId: slackMessage.thread_ts,
        externalId: result.ts,
        metadata: {
          slack: {
            channelId,
            messageTs: result.ts,
            threadTs: slackMessage.thread_ts,
          },
        },
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      };

      logger.info('Slack message sent', {
        id,
        channel: channelId,
      });

      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send Slack message', new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Receive Slack event from webhook
   */
  async receive(webhookPayload: SlackEventPayload): Promise<UnifiedMessage | null> {
    // Only handle message events
    if (webhookPayload.event.type !== 'message' && webhookPayload.event.type !== 'app_mention') {
      return null;
    }

    // Ignore bot messages to prevent loops
    if (webhookPayload.event.user?.startsWith('B')) {
      return null;
    }

    const id = `slack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const event = webhookPayload.event;

    const message: UnifiedMessage = {
      id,
      workspaceId: '', // Will be resolved by inbox
      channel: 'slack',
      direction: 'inbound',
      status: 'delivered',
      priority: 'normal',
      content: event.text || '',
      externalId: event.ts,
      threadId: event.thread_ts,
      attachments: event.files?.map(file => ({
        id: file.id,
        name: file.name,
        url: file.url_private,
        mimeType: file.mimetype,
        size: file.size,
      })),
      metadata: {
        slack: {
          channelId: event.channel,
          userId: event.user,
          messageTs: event.ts,
          threadTs: event.thread_ts,
          blocks: event.blocks,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    logger.info('Slack message received', {
      id,
      channel: event.channel,
      user: event.user,
    });

    return message;
  }

  /**
   * Validate Slack webhook signature
   */
  validateWebhook(payload: unknown, signature: string): boolean {
    if (!this.config?.signingSecret) {
      return false;
    }

    // Implement Slack signature validation
    // https://api.slack.com/authentication/verifying-requests-from-slack
    logger.debug('Validating Slack webhook signature');
    
    // TODO: Implement actual signature validation using crypto.timingSafeEqual
    return true;
  }

  /**
   * Get conversations (channels the bot is in)
   */
  async getConversations(options?: { limit?: number; offset?: number }): Promise<Conversation[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await this.slackApi('conversations.list', {
        types: 'public_channel,private_channel,im,mpim',
        limit: options?.limit || 100,
      });

      return (response.channels || []).map((channel: any) => ({
        id: channel.id,
        workspaceId: '', // Will be resolved
        contactId: channel.user || channel.id,
        channel: 'slack' as const,
        subject: channel.name || 'Direct Message',
        status: 'active' as const,
        lastMessageAt: new Date(),
        messageCount: 0,
        unreadCount: channel.unread_count || 0,
        metadata: {
          channelName: channel.name,
          isChannel: channel.is_channel,
          isIm: channel.is_im,
        },
        createdAt: new Date(channel.created * 1000),
        updatedAt: new Date(),
      }));
    } catch (error) {
      logger.error('Failed to get Slack conversations', error as Error);
      return [];
    }
  }

  /**
   * Mark message as read (add reaction or update)
   */
  async markAsRead(messageId: string): Promise<void> {
    // Slack doesn't have explicit read receipts
    // Could add a reaction to indicate the message was processed
    logger.debug('Marking Slack message as read', { messageId });
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return this.initialized && this.config !== null;
  }

  /**
   * Post a message to Slack
   */
  private async postMessage(message: SlackMessage): Promise<{ ts: string }> {
    const response = await this.slackApi('chat.postMessage', message as unknown as Record<string, unknown>);
    return { ts: response.ts };
  }

  /**
   * Test the Slack connection
   */
  private async testConnection(): Promise<void> {
    const response = await this.slackApi('auth.test', {});
    logger.debug('Slack auth test', { user: response.user, team: response.team });
  }

  /**
   * Make a Slack API request
   */
  private async slackApi(method: string, params: Record<string, unknown>): Promise<any> {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * Send a message with interactive components
   */
  async sendInteractive(
    channelId: string,
    text: string,
    blocks: SlackBlock[]
  ): Promise<{ ts: string }> {
    return this.postMessage({
      channel: channelId,
      text,
      blocks,
    });
  }

  /**
   * Update an existing message
   */
  async updateMessage(channelId: string, ts: string, text: string, blocks?: SlackBlock[]): Promise<void> {
    await this.slackApi('chat.update', {
      channel: channelId,
      ts,
      text,
      blocks,
    });
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(channelId: string, ts: string, emoji: string): Promise<void> {
    await this.slackApi('reactions.add', {
      channel: channelId,
      timestamp: ts,
      name: emoji,
    });
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<{
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  } | null> {
    try {
      const response = await this.slackApi('users.info', { user: userId });
      const user = response.user;
      return {
        id: user.id,
        name: user.real_name || user.name,
        email: user.profile?.email,
        avatar: user.profile?.image_72,
      };
    } catch (error) {
      logger.error('Failed to get Slack user info', error as Error);
      return null;
    }
  }
}

/**
 * Create a Slack channel instance
 */
export function createSlackChannel(): SlackChannel {
  return new SlackChannel();
}

