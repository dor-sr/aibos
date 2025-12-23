/**
 * Projects Schema
 * 
 * Database schema for projects and tasks managed by AI Project Manager.
 */

import { pgTable, text, timestamp, jsonb, pgEnum, integer, real } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { contacts } from './contacts';

// Enums
export const projectStatusEnum = pgEnum('project_status', [
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'blocked',
  'cancelled',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'critical',
  'high',
  'medium',
  'low',
]);

// Projects table
export const projects = pgTable('projects', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('planning'),
  startDate: timestamp('start_date', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ownerId: text('owner_id').references(() => contacts.id, { onDelete: 'set null' }),
  color: text('color'),
  tags: text('tags').array().$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Tasks table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().notNull(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  parentTaskId: text('parent_task_id'), // For subtasks
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('backlog'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  assigneeId: text('assignee_id').references(() => contacts.id, { onDelete: 'set null' }),
  reporterId: text('reporter_id').references(() => contacts.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  estimatedHours: real('estimated_hours'),
  actualHours: real('actual_hours'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  tags: text('tags').array().$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  position: integer('position').notNull().default(0), // For ordering
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Task comments table
export const taskComments = pgTable('task_comments', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => contacts.id, { onDelete: 'set null' }),
  authorType: text('author_type').notNull().default('human'), // human, ai_employee
  content: text('content').notNull(),
  attachments: jsonb('attachments').$type<Array<{
    name: string;
    url: string;
    mimeType: string;
  }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Task activity log
export const taskActivities = pgTable('task_activities', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  actorId: text('actor_id'), // Can be contact ID or employee ID
  actorType: text('actor_type').notNull(), // human, ai_employee, system
  action: text('action').notNull(), // created, updated, status_changed, assigned, commented, etc.
  changes: jsonb('changes').$type<Record<string, { from: unknown; to: unknown }>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Project members table
export const projectMembers = pgTable('project_members', {
  id: text('id').primaryKey().notNull(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner, admin, member, viewer
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Standups table (for AI PM)
export const standups = pgTable('standups', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  yesterday: text('yesterday'), // What they did yesterday
  today: text('today'), // What they're doing today
  blockers: text('blockers'), // Any blockers
  mood: text('mood'), // Optional mood indicator
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  collectedBy: text('collected_by'), // AI employee ID that collected this
  channel: text('channel'), // email, slack, widget
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Milestones table
export const milestones = pgTable('milestones', {
  id: text('id').primaryKey().notNull(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: text('status').notNull().default('pending'), // pending, in_progress, completed
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Blockers table
export const blockers = pgTable('blockers', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  reportedById: text('reported_by_id').references(() => contacts.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  severity: text('severity').notNull().default('medium'), // low, medium, high, critical
  status: text('status').notNull().default('open'), // open, in_progress, resolved
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedById: text('resolved_by_id').references(() => contacts.id, { onDelete: 'set null' }),
  resolution: text('resolution'),
  daysOpen: integer('days_open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Infer types from schema
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;

export type TaskActivity = typeof taskActivities.$inferSelect;
export type NewTaskActivity = typeof taskActivities.$inferInsert;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;

export type Standup = typeof standups.$inferSelect;
export type NewStandup = typeof standups.$inferInsert;

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;

export type Blocker = typeof blockers.$inferSelect;
export type NewBlocker = typeof blockers.$inferInsert;

