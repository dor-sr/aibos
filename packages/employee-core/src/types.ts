/**
 * AI Employee Core Types
 * 
 * Core type definitions for the AI Employee framework.
 */

// Employee Types
export type EmployeeType = 
  | 'project_manager'
  | 'customer_success'
  | 'sales_dev'
  | 'support'
  | 'executive_assistant';

export type EmployeeStatus = 'active' | 'paused' | 'training' | 'archived';

// Trust Levels
export type TrustLevel = 
  | 'requires_approval'    // All actions need human approval
  | 'low_confidence'       // Most actions need approval, some auto
  | 'high_confidence'      // Most actions auto, some need approval
  | 'autonomous';          // All actions auto, human can review

// Communication Channels
export type CommunicationChannel = 
  | 'email'
  | 'slack'
  | 'whatsapp'
  | 'widget'
  | 'sms';

// Personality Traits
export interface PersonalityTraits {
  formality: 'casual' | 'professional' | 'formal';
  verbosity: 'concise' | 'balanced' | 'detailed';
  tone: 'friendly' | 'neutral' | 'authoritative';
  emoji_usage: 'none' | 'minimal' | 'moderate';
}

// Employee Persona Configuration
export interface PersonaConfig {
  name: string;
  avatarUrl?: string;
  title: string;
  bio?: string;
  signature?: string;
  personality: PersonalityTraits;
  workingHours?: {
    timezone: string;
    start: string; // HH:mm format
    end: string;
    workDays: number[]; // 0-6, 0 = Sunday
  };
  responseTimeTarget?: number; // minutes
}

// Trust Configuration
export interface TrustConfig {
  defaultLevel: TrustLevel;
  actionOverrides: Record<string, TrustLevel>;
  autoApproveThreshold: number; // 0-1 confidence threshold
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  id: string;
  condition: 'low_confidence' | 'high_risk' | 'unknown_contact' | 'sensitive_topic';
  action: 'require_approval' | 'notify_human' | 'pause_and_alert';
  notifyUsers?: string[];
}

// Employee Instance
export interface Employee {
  id: string;
  workspaceId: string;
  type: EmployeeType;
  name: string;
  avatarUrl?: string;
  persona: PersonaConfig;
  trustConfig: TrustConfig;
  knowledgeBaseIds: string[];
  status: EmployeeStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Knowledge Base Entry
export interface KnowledgeBaseEntry {
  id: string;
  employeeId: string;
  category: 'company' | 'product' | 'process' | 'faq' | 'policy' | 'custom';
  title: string;
  content: string;
  embedding?: number[];
  priority: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Contact Types
export type ContactType = 'team_member' | 'client' | 'lead' | 'vendor' | 'partner' | 'other';

export interface Contact {
  id: string;
  workspaceId: string;
  type: ContactType;
  email?: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
  preferredChannel: CommunicationChannel;
  timezone?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  healthScore?: number; // 0-100
  lastInteractionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interaction Types
export type InteractionDirection = 'inbound' | 'outbound';
export type InteractionType = 
  | 'message'
  | 'email'
  | 'call'
  | 'meeting'
  | 'task_update'
  | 'system';

export interface Interaction {
  id: string;
  workspaceId: string;
  contactId: string;
  employeeId: string;
  channel: CommunicationChannel;
  direction: InteractionDirection;
  type: InteractionType;
  subject?: string;
  content: string;
  metadata?: Record<string, unknown>;
  sentimentScore?: number; // -1 to 1
  threadId?: string;
  replyToId?: string;
  createdAt: Date;
}

// Memory Types
export type MemoryContextType = 'contact' | 'project' | 'workspace' | 'conversation';

export interface EmployeeMemory {
  id: string;
  employeeId: string;
  contextType: MemoryContextType;
  contextId: string;
  content: string;
  embedding?: number[];
  importanceScore: number; // 0-1
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
}

// Action Types
export type ActionStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ActionType =
  | 'send_message'
  | 'send_email'
  | 'create_task'
  | 'update_task'
  | 'schedule_meeting'
  | 'create_reminder'
  | 'escalate'
  | 'update_contact'
  | 'log_interaction'
  | 'custom';

export type ActionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ActionDefinition {
  type: ActionType;
  name: string;
  description: string;
  riskLevel: ActionRiskLevel;
  reversible: boolean;
  requiredParams: string[];
  optionalParams: string[];
}

export interface EmployeeAction {
  id: string;
  employeeId: string;
  workspaceId: string;
  type: ActionType;
  parameters: Record<string, unknown>;
  status: ActionStatus;
  confidenceScore: number; // 0-1
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  scheduledFor?: Date;
  executedAt?: Date;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Trust Metrics
export interface EmployeeTrustMetrics {
  id: string;
  employeeId: string;
  actionType: ActionType;
  totalActions: number;
  approvedCount: number;
  rejectedCount: number;
  autoApprovedCount: number;
  averageConfidence: number;
  currentTrustLevel: TrustLevel;
  updatedAt: Date;
}

// Create/Update DTOs
export interface CreateEmployeeInput {
  workspaceId: string;
  type: EmployeeType;
  name: string;
  avatarUrl?: string;
  persona: PersonaConfig;
  trustConfig?: Partial<TrustConfig>;
  knowledgeBaseIds?: string[];
}

export interface UpdateEmployeeInput {
  name?: string;
  avatarUrl?: string;
  persona?: Partial<PersonaConfig>;
  trustConfig?: Partial<TrustConfig>;
  knowledgeBaseIds?: string[];
  status?: EmployeeStatus;
}

export interface CreateContactInput {
  workspaceId: string;
  type: ContactType;
  email?: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  preferredChannel?: CommunicationChannel;
  timezone?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateActionInput {
  employeeId: string;
  type: ActionType;
  parameters: Record<string, unknown>;
  confidenceScore?: number;
  scheduledFor?: Date;
}

// Event Types
export interface EmployeeEvent {
  type: string;
  employeeId: string;
  workspaceId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface ActionEvent extends EmployeeEvent {
  type: 'action.created' | 'action.approved' | 'action.rejected' | 'action.executed' | 'action.failed';
  actionId: string;
}

export interface MessageEvent extends EmployeeEvent {
  type: 'message.received' | 'message.sent';
  contactId: string;
  channel: CommunicationChannel;
  content: string;
}

