/**
 * Types for Conversational Memory
 */

// Message role
export type MessageRole = 'user' | 'assistant' | 'system';

// Conversation status
export type ConversationStatus = 'active' | 'archived' | 'deleted';

// Entity types that can be extracted
export type EntityType = 
  | 'product'
  | 'customer'
  | 'campaign'
  | 'metric'
  | 'date_range'
  | 'time_period'
  | 'channel'
  | 'segment'
  | 'currency'
  | 'percentage'
  | 'number';

// Extracted entity
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  id?: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
  normalized?: string;
}

// Tool call record
export interface ToolCallRecord {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  timestamp: string;
}

// Conversation message
export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  extractedEntities?: ExtractedEntity[] | null;
  entities?: ExtractedEntity[];
  toolCalls?: ToolCallRecord[] | null;
  processingTimeMs?: number;
  tokenCount?: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

// Conversation
export interface Conversation {
  id: string;
  workspaceId: string;
  userId: string | null;
  title?: string;
  summary?: string;
  status: ConversationStatus;
  messageCount: number;
  extractedEntities?: ExtractedEntity[];
  lastActivityAt?: Date;
  lastMessageAt?: Date;
  metadata?: ConversationMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation metadata
export interface ConversationMetadata {
  lastTopic?: string;
  preferredMetrics?: string[];
  preferredPeriod?: string;
  compressedAt?: string;
  contextVersion?: number;
}

// Entity memory record
export interface EntityMemoryRecord {
  id: string;
  workspaceId: string;
  conversationId?: string;
  entityType: EntityType;
  entityValue: string;
  entityId?: string;
  mentionCount: number;
  lastMentionedAt: Date;
  context?: string;
  createdAt: Date;
}

// Conversation context (for LLM prompts)
export interface ConversationContext {
  conversationId: string;
  recentMessages: ConversationMessage[];
  summary?: string;
  activeEntities: ExtractedEntity[];
  preferredMetrics: string[];
  preferredPeriod?: string;
  lastTopic?: string;
}

// Options for conversation service
export interface ConversationServiceOptions {
  maxMessagesInContext?: number;
  maxTokensInContext?: number;
  summarizeAfterMessages?: number;
  autoExtractEntities?: boolean;
}

// Options for message creation
export interface CreateMessageOptions {
  intent?: string;
  entities?: ExtractedEntity[];
  toolCalls?: ToolCallRecord[];
  processingTimeMs?: number;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

// Options for creating a conversation
export interface CreateConversationOptions {
  userId?: string;
  title?: string;
  metadata?: ConversationMetadata;
}

// Options for adding a message
export interface AddMessageOptions {
  intent?: string;
  toolCalls?: ToolCallRecord[] | null;
  metadata?: Record<string, unknown> | null;
}
