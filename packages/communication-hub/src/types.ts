/**
 * Communication Hub Types
 */

// Channel types
export type ChannelType = 'email' | 'slack' | 'whatsapp' | 'widget';

// Message status
export type MessageStatus = 
  | 'draft'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'bounced';

// Message direction
export type MessageDirection = 'inbound' | 'outbound';

// Message priority
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

// Unified message format
export interface UnifiedMessage {
  id: string;
  workspaceId: string;
  employeeId?: string;
  contactId?: string;
  channel: ChannelType;
  direction: MessageDirection;
  status: MessageStatus;
  priority: MessagePriority;
  subject?: string;
  content: string;
  htmlContent?: string;
  attachments?: Attachment[];
  threadId?: string;
  replyToId?: string;
  externalId?: string; // ID in external system
  metadata?: MessageMetadata;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MessageMetadata {
  // Email specific
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    from: string;
    replyTo?: string;
    messageId?: string;
    headers?: Record<string, string>;
  };
  // Slack specific
  slack?: {
    channelId: string;
    channelName?: string;
    userId?: string;
    messageTs: string;
    threadTs?: string;
    blocks?: unknown[];
  };
  // WhatsApp specific
  whatsapp?: {
    phone: string;
    templateId?: string;
    templateParams?: Record<string, string>;
    status?: string;
    timestamp?: string;
  };
  // Widget specific
  widget?: {
    sessionId: string;
    visitorId?: string;
    pageUrl?: string;
    userAgent?: string;
  };
}

// Conversation/Thread
export interface Conversation {
  id: string;
  workspaceId: string;
  contactId: string;
  employeeId?: string;
  channel: ChannelType;
  subject?: string;
  status: 'active' | 'resolved' | 'archived';
  lastMessageAt: Date;
  messageCount: number;
  unreadCount: number;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Send message input
export interface SendMessageInput {
  workspaceId: string;
  employeeId?: string;
  contactId: string;
  channel: ChannelType;
  content: string;
  htmlContent?: string;
  subject?: string;
  attachments?: Omit<Attachment, 'id'>[];
  threadId?: string;
  replyToId?: string;
  priority?: MessagePriority;
  scheduledFor?: Date;
  metadata?: MessageMetadata;
}

// Channel configuration
export interface ChannelConfig {
  email?: EmailChannelConfig;
  slack?: SlackChannelConfig;
  whatsapp?: WhatsAppChannelConfig;
  widget?: WidgetChannelConfig;
}

export interface EmailChannelConfig {
  provider: 'resend' | 'sendgrid' | 'ses';
  apiKey: string;
  from: string;
  replyTo?: string;
  inboundWebhookSecret?: string;
}

export interface SlackChannelConfig {
  botToken: string;
  appToken?: string;
  signingSecret: string;
  defaultChannel?: string;
}

export interface WhatsAppChannelConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessAccountId?: string;
}

export interface WidgetChannelConfig {
  enabled: boolean;
  allowedOrigins: string[];
  brandColor?: string;
  welcomeMessage?: string;
  offlineMessage?: string;
}

// Template types
export interface MessageTemplate {
  id: string;
  workspaceId: string;
  name: string;
  channel: ChannelType | 'all';
  subject?: string;
  content: string;
  htmlContent?: string;
  variables: string[]; // e.g., ['name', 'company']
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inbox item (for unified inbox)
export interface InboxItem {
  id: string;
  type: 'message' | 'conversation';
  channel: ChannelType;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  preview: string;
  unread: boolean;
  timestamp: Date;
  employeeId?: string;
  conversationId?: string;
  messageCount?: number;
  priority: MessagePriority;
}

// Channel provider interface
export interface ChannelProvider {
  readonly channel: ChannelType;
  
  initialize(config: unknown): Promise<void>;
  
  send(message: SendMessageInput): Promise<UnifiedMessage>;
  
  receive?(webhookPayload: unknown): Promise<UnifiedMessage | null>;
  
  validateWebhook?(payload: unknown, signature: string): boolean;
  
  getConversations?(options: { limit?: number; offset?: number }): Promise<Conversation[]>;
  
  markAsRead?(messageId: string): Promise<void>;
  
  isConfigured(): boolean;
}

// Event types
export interface MessageEvent {
  type: 'message.received' | 'message.sent' | 'message.delivered' | 'message.read' | 'message.failed';
  message: UnifiedMessage;
  timestamp: Date;
}

export interface ConversationEvent {
  type: 'conversation.created' | 'conversation.updated' | 'conversation.resolved';
  conversation: Conversation;
  timestamp: Date;
}

