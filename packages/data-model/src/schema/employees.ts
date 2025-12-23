/**
 * AI Employee Schema
 * 
 * Database schema for AI employees, their memories, actions, and trust metrics.
 */

import { pgTable, text, timestamp, jsonb, pgEnum, real, integer, boolean } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Enums
export const employeeTypeEnum = pgEnum('employee_type', [
  'project_manager',
  'customer_success',
  'sales_dev',
  'support',
  'executive_assistant',
]);

export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'paused',
  'training',
  'archived',
]);

export const trustLevelEnum = pgEnum('trust_level', [
  'requires_approval',
  'low_confidence',
  'high_confidence',
  'autonomous',
]);

export const actionStatusEnum = pgEnum('action_status', [
  'pending',
  'approved',
  'rejected',
  'executing',
  'completed',
  'failed',
  'cancelled',
]);

export const actionTypeEnum = pgEnum('action_type', [
  'send_message',
  'send_email',
  'create_task',
  'update_task',
  'schedule_meeting',
  'create_reminder',
  'escalate',
  'update_contact',
  'log_interaction',
  'custom',
]);

export const memoryContextTypeEnum = pgEnum('memory_context_type', [
  'contact',
  'project',
  'workspace',
  'conversation',
]);

// Employee instances table
export const employees = pgTable('employees', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  type: employeeTypeEnum('type').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  personaConfig: jsonb('persona_config').$type<PersonaConfig>().notNull(),
  trustConfig: jsonb('trust_config').$type<TrustConfig>().notNull(),
  knowledgeBaseIds: text('knowledge_base_ids').array().$type<string[]>().default([]),
  status: employeeStatusEnum('status').notNull().default('active'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Knowledge base entries table
export const knowledgeBaseEntries = pgTable('knowledge_base_entries', {
  id: text('id').primaryKey().notNull(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // company, product, process, faq, policy, custom
  title: text('title').notNull(),
  content: text('content').notNull(),
  embedding: jsonb('embedding').$type<number[]>(),
  priority: integer('priority').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Employee memories table
export const employeeMemories = pgTable('employee_memories', {
  id: text('id').primaryKey().notNull(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  contextType: memoryContextTypeEnum('context_type').notNull(),
  contextId: text('context_id').notNull(),
  content: text('content').notNull(),
  embedding: jsonb('embedding').$type<number[]>(),
  importanceScore: real('importance_score').notNull().default(0.5),
  accessCount: integer('access_count').notNull().default(0),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  tags: text('tags').array().$type<string[]>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Employee actions table
export const employeeActions = pgTable('employee_actions', {
  id: text('id').primaryKey().notNull(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  type: actionTypeEnum('type').notNull(),
  parameters: jsonb('parameters').$type<Record<string, unknown>>().notNull(),
  status: actionStatusEnum('status').notNull().default('pending'),
  confidenceScore: real('confidence_score').notNull().default(0.5),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedBy: text('rejected_by'),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  result: jsonb('result').$type<Record<string, unknown>>(),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Employee trust metrics table
export const employeeTrustMetrics = pgTable('employee_trust_metrics', {
  id: text('id').primaryKey().notNull(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  actionType: actionTypeEnum('action_type').notNull(),
  totalActions: integer('total_actions').notNull().default(0),
  approvedCount: integer('approved_count').notNull().default(0),
  rejectedCount: integer('rejected_count').notNull().default(0),
  autoApprovedCount: integer('auto_approved_count').notNull().default(0),
  averageConfidence: real('average_confidence').notNull().default(0.5),
  currentTrustLevel: trustLevelEnum('current_trust_level').notNull().default('requires_approval'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Action audit log table
export const actionAuditLogs = pgTable('action_audit_logs', {
  id: text('id').primaryKey().notNull(),
  actionId: text('action_id')
    .notNull()
    .references(() => employeeActions.id, { onDelete: 'cascade' }),
  event: text('event').notNull(), // created, approved, rejected, executed, failed, cancelled
  userId: text('user_id'),
  details: jsonb('details').$type<Record<string, unknown>>(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

// Type definitions for JSONB fields
export interface PersonaConfig {
  name: string;
  avatarUrl?: string;
  title: string;
  bio?: string;
  signature?: string;
  personality: {
    formality: 'casual' | 'professional' | 'formal';
    verbosity: 'concise' | 'balanced' | 'detailed';
    tone: 'friendly' | 'neutral' | 'authoritative';
    emoji_usage: 'none' | 'minimal' | 'moderate';
  };
  workingHours?: {
    timezone: string;
    start: string;
    end: string;
    workDays: number[];
  };
  responseTimeTarget?: number;
}

export interface TrustConfig {
  defaultLevel: 'requires_approval' | 'low_confidence' | 'high_confidence' | 'autonomous';
  actionOverrides: Record<string, string>;
  autoApproveThreshold: number;
  escalationRules: Array<{
    id: string;
    condition: string;
    action: string;
    notifyUsers?: string[];
  }>;
}

// Infer types from schema
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type KnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferSelect;
export type NewKnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferInsert;

export type EmployeeMemory = typeof employeeMemories.$inferSelect;
export type NewEmployeeMemory = typeof employeeMemories.$inferInsert;

export type EmployeeAction = typeof employeeActions.$inferSelect;
export type NewEmployeeAction = typeof employeeActions.$inferInsert;

export type EmployeeTrustMetric = typeof employeeTrustMetrics.$inferSelect;
export type NewEmployeeTrustMetric = typeof employeeTrustMetrics.$inferInsert;

export type ActionAuditLog = typeof actionAuditLogs.$inferSelect;
export type NewActionAuditLog = typeof actionAuditLogs.$inferInsert;

