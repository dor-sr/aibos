/**
 * Contacts Schema
 * 
 * Database schema for contacts and interactions managed by AI employees.
 */

import { pgTable, text, timestamp, jsonb, pgEnum, real, integer } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { employees } from './employees';

// Enums
export const contactTypeEnum = pgEnum('contact_type', [
  'team_member',
  'client',
  'lead',
  'vendor',
  'partner',
  'other',
]);

export const communicationChannelEnum = pgEnum('communication_channel', [
  'email',
  'slack',
  'whatsapp',
  'widget',
  'sms',
]);

export const interactionDirectionEnum = pgEnum('interaction_direction', [
  'inbound',
  'outbound',
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  'message',
  'email',
  'call',
  'meeting',
  'task_update',
  'system',
]);

// Contacts table
export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  type: contactTypeEnum('type').notNull().default('other'),
  email: text('email'),
  phone: text('phone'),
  name: text('name').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  company: text('company'),
  role: text('role'),
  avatarUrl: text('avatar_url'),
  preferredChannel: communicationChannelEnum('preferred_channel').notNull().default('email'),
  timezone: text('timezone'),
  tags: text('tags').array().$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  healthScore: integer('health_score'), // 0-100
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  slackUserId: text('slack_user_id'),
  whatsappPhone: text('whatsapp_phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Interactions table - all communications with contacts
export const interactions = pgTable('interactions', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  employeeId: text('employee_id')
    .references(() => employees.id, { onDelete: 'set null' }),
  channel: communicationChannelEnum('channel').notNull(),
  direction: interactionDirectionEnum('direction').notNull(),
  type: interactionTypeEnum('type').notNull(),
  subject: text('subject'),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<InteractionMetadata>(),
  sentimentScore: real('sentiment_score'), // -1 to 1
  threadId: text('thread_id'),
  replyToId: text('reply_to_id'),
  externalId: text('external_id'), // ID in external system (Slack message ID, email message ID)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Contact groups table
export const contactGroups = pgTable('contact_groups', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Contact group memberships
export const contactGroupMemberships = pgTable('contact_group_memberships', {
  id: text('id').primaryKey().notNull(),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  groupId: text('group_id')
    .notNull()
    .references(() => contactGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Contact preferences
export const contactPreferences = pgTable('contact_preferences', {
  id: text('id').primaryKey().notNull(),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  preferredContactTime: text('preferred_contact_time'), // morning, afternoon, evening
  preferredDays: integer('preferred_days').array().$type<number[]>(), // 0-6
  communicationFrequency: text('communication_frequency'), // daily, weekly, monthly
  doNotContact: jsonb('do_not_contact').$type<boolean>().default(false),
  language: text('language').default('en'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Conversation threads (for tracking multi-message conversations)
export const conversationThreads = pgTable('conversation_threads', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  employeeId: text('employee_id')
    .references(() => employees.id, { onDelete: 'set null' }),
  channel: communicationChannelEnum('channel').notNull(),
  subject: text('subject'),
  status: text('status').notNull().default('active'), // active, resolved, archived
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  messageCount: integer('message_count').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type definitions
export interface InteractionMetadata {
  emailHeaders?: {
    messageId?: string;
    inReplyTo?: string;
    references?: string[];
  };
  slackMetadata?: {
    channelId?: string;
    messageTs?: string;
    threadTs?: string;
  };
  whatsappMetadata?: {
    messageId?: string;
    status?: string;
  };
  attachments?: Array<{
    name: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

// Infer types from schema
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type NewContactGroup = typeof contactGroups.$inferInsert;

export type ContactGroupMembership = typeof contactGroupMemberships.$inferSelect;
export type NewContactGroupMembership = typeof contactGroupMemberships.$inferInsert;

export type ContactPreference = typeof contactPreferences.$inferSelect;
export type NewContactPreference = typeof contactPreferences.$inferInsert;

export type ConversationThread = typeof conversationThreads.$inferSelect;
export type NewConversationThread = typeof conversationThreads.$inferInsert;

