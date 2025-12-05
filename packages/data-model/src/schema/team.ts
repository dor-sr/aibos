import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { users } from './users';

// ============================================================================
// Stage 17.1 - Enhanced Role System
// ============================================================================

// Custom role status
export const roleStatusEnum = pgEnum('role_status', ['active', 'archived']);

// Permission categories for RBAC
export interface RolePermissions {
  // Dashboard permissions
  dashboard: {
    view: boolean;
    edit: boolean;
  };
  // Analytics permissions
  analytics: {
    view: boolean;
    askQuestions: boolean;
    exportData: boolean;
  };
  // Marketing agent permissions
  marketing: {
    view: boolean;
    manage: boolean;
    generateContent: boolean;
  };
  // Operations agent permissions
  operations: {
    view: boolean;
    manage: boolean;
    adjustInventory: boolean;
  };
  // Connector permissions
  connectors: {
    view: boolean;
    add: boolean;
    remove: boolean;
    sync: boolean;
  };
  // Report permissions
  reports: {
    view: boolean;
    create: boolean;
    schedule: boolean;
  };
  // Settings permissions
  settings: {
    view: boolean;
    editWorkspace: boolean;
    manageTeam: boolean;
    manageBilling: boolean;
  };
  // API permissions
  api: {
    viewKeys: boolean;
    createKeys: boolean;
    revokeKeys: boolean;
  };
}

// Default permission templates
export const ROLE_TEMPLATES: Record<string, RolePermissions> = {
  owner: {
    dashboard: { view: true, edit: true },
    analytics: { view: true, askQuestions: true, exportData: true },
    marketing: { view: true, manage: true, generateContent: true },
    operations: { view: true, manage: true, adjustInventory: true },
    connectors: { view: true, add: true, remove: true, sync: true },
    reports: { view: true, create: true, schedule: true },
    settings: { view: true, editWorkspace: true, manageTeam: true, manageBilling: true },
    api: { viewKeys: true, createKeys: true, revokeKeys: true },
  },
  admin: {
    dashboard: { view: true, edit: true },
    analytics: { view: true, askQuestions: true, exportData: true },
    marketing: { view: true, manage: true, generateContent: true },
    operations: { view: true, manage: true, adjustInventory: true },
    connectors: { view: true, add: true, remove: true, sync: true },
    reports: { view: true, create: true, schedule: true },
    settings: { view: true, editWorkspace: true, manageTeam: true, manageBilling: false },
    api: { viewKeys: true, createKeys: true, revokeKeys: true },
  },
  editor: {
    dashboard: { view: true, edit: true },
    analytics: { view: true, askQuestions: true, exportData: true },
    marketing: { view: true, manage: true, generateContent: true },
    operations: { view: true, manage: true, adjustInventory: false },
    connectors: { view: true, add: false, remove: false, sync: true },
    reports: { view: true, create: true, schedule: false },
    settings: { view: true, editWorkspace: false, manageTeam: false, manageBilling: false },
    api: { viewKeys: false, createKeys: false, revokeKeys: false },
  },
  viewer: {
    dashboard: { view: true, edit: false },
    analytics: { view: true, askQuestions: true, exportData: false },
    marketing: { view: true, manage: false, generateContent: false },
    operations: { view: true, manage: false, adjustInventory: false },
    connectors: { view: true, add: false, remove: false, sync: false },
    reports: { view: true, create: false, schedule: false },
    settings: { view: false, editWorkspace: false, manageTeam: false, manageBilling: false },
    api: { viewKeys: false, createKeys: false, revokeKeys: false },
  },
};

// Custom roles table
export const roles = pgTable(
  'roles',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    permissions: jsonb('permissions').$type<RolePermissions>().notNull(),
    isSystem: boolean('is_system').notNull().default(false), // System roles cannot be deleted
    status: roleStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('roles_workspace_idx').on(table.workspaceId),
    nameIdx: index('roles_name_idx').on(table.workspaceId, table.name),
  })
);

// User role assignments
export const userRoles = pgTable(
  'user_roles',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedBy: text('assigned_by').references(() => users.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWorkspaceIdx: index('user_roles_user_workspace_idx').on(table.userId, table.workspaceId),
    workspaceIdx: index('user_roles_workspace_idx').on(table.workspaceId),
  })
);

// ============================================================================
// Stage 17.2 - Team Invitations
// ============================================================================

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const workspaceInvites = pgTable(
  'workspace_invites',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(), // Secure invite token
    status: inviteStatusEnum('status').notNull().default('pending'),
    message: text('message'), // Optional personal message from inviter
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedBy: text('accepted_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('workspace_invites_workspace_idx').on(table.workspaceId),
    emailIdx: index('workspace_invites_email_idx').on(table.email),
    tokenIdx: index('workspace_invites_token_idx').on(table.token),
    statusIdx: index('workspace_invites_status_idx').on(table.status),
  })
);

// ============================================================================
// Stage 17.3 - Activity and Audit Logs
// ============================================================================

export const activityActionEnum = pgEnum('activity_action', [
  // Authentication
  'user.login',
  'user.logout',
  // Team management
  'team.invite_sent',
  'team.invite_accepted',
  'team.invite_revoked',
  'team.member_removed',
  'team.role_changed',
  'team.role_created',
  'team.role_updated',
  'team.role_deleted',
  // Workspace
  'workspace.created',
  'workspace.updated',
  'workspace.settings_changed',
  // Connectors
  'connector.added',
  'connector.removed',
  'connector.synced',
  'connector.sync_failed',
  // Analytics
  'analytics.question_asked',
  'analytics.report_generated',
  'analytics.export_created',
  // Marketing
  'marketing.campaign_analyzed',
  'marketing.content_generated',
  'marketing.recommendation_applied',
  // Operations
  'operations.inventory_adjusted',
  'operations.alert_acknowledged',
  'operations.reorder_created',
  // Resources
  'resource.question_saved',
  'resource.view_saved',
  'resource.dashboard_created',
  'resource.shared',
  'resource.unshared',
  // API
  'api.key_created',
  'api.key_revoked',
  // Billing
  'billing.plan_changed',
  'billing.payment_succeeded',
  'billing.payment_failed',
]);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: activityActionEnum('action').notNull(),
    resourceType: text('resource_type'), // e.g., 'connector', 'report', 'question'
    resourceId: text('resource_id'), // ID of the affected resource
    resourceName: text('resource_name'), // Human-readable name for display
    metadata: jsonb('metadata').$type<Record<string, unknown>>(), // Additional context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('activity_logs_workspace_idx').on(table.workspaceId),
    userIdx: index('activity_logs_user_idx').on(table.userId),
    actionIdx: index('activity_logs_action_idx').on(table.action),
    createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
    resourceIdx: index('activity_logs_resource_idx').on(table.resourceType, table.resourceId),
  })
);

// ============================================================================
// Stage 17.4 - Shared Resources
// ============================================================================

// Saved questions/queries
export const savedQuestions = pgTable(
  'saved_questions',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    question: text('question').notNull(),
    response: text('response'), // Cached response
    agentType: text('agent_type').notNull().default('analytics'), // analytics, marketing, operations
    isShared: boolean('is_shared').notNull().default(false),
    isPinned: boolean('is_pinned').notNull().default(false),
    usageCount: integer('usage_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('saved_questions_workspace_idx').on(table.workspaceId),
    userIdx: index('saved_questions_user_idx').on(table.userId),
    sharedIdx: index('saved_questions_shared_idx').on(table.isShared),
  })
);

// Saved dashboard views/filters
export const savedViews = pgTable(
  'saved_views',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    viewType: text('view_type').notNull(), // 'dashboard', 'analytics', 'marketing', 'operations'
    config: jsonb('config').$type<SavedViewConfig>().notNull(),
    isShared: boolean('is_shared').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('saved_views_workspace_idx').on(table.workspaceId),
    userIdx: index('saved_views_user_idx').on(table.userId),
    typeIdx: index('saved_views_type_idx').on(table.viewType),
  })
);

// Configuration for saved views
export interface SavedViewConfig {
  dateRange?: {
    type: 'relative' | 'absolute';
    value: string; // e.g., '7d', '30d', '2024-01-01:2024-01-31'
  };
  filters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
    value: unknown;
  }>;
  metrics?: string[]; // Selected metrics to display
  chartType?: string;
  sortBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  groupBy?: string;
  customSettings?: Record<string, unknown>;
}

// Dashboard templates (workspace-level)
export const dashboardTemplates = pgTable(
  'dashboard_templates',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    config: jsonb('config').$type<DashboardTemplateConfig>().notNull(),
    isPublic: boolean('is_public').notNull().default(false), // Available to all workspace members
    thumbnail: text('thumbnail'), // Preview image URL
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('dashboard_templates_workspace_idx').on(table.workspaceId),
    publicIdx: index('dashboard_templates_public_idx').on(table.isPublic),
  })
);

export interface DashboardTemplateConfig {
  layout: Array<{
    id: string;
    type: 'metric' | 'chart' | 'table' | 'text' | 'question';
    position: { x: number; y: number; w: number; h: number };
    config: Record<string, unknown>;
  }>;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
  };
}

// Comments and annotations on insights/reports
export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resourceType: text('resource_type').notNull(), // 'report', 'insight', 'question', 'anomaly'
    resourceId: text('resource_id').notNull(),
    parentId: text('parent_id'), // For replies/threads
    content: text('content').notNull(),
    mentions: text('mentions').array().$type<string[]>(), // User IDs mentioned
    isResolved: boolean('is_resolved').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('comments_workspace_idx').on(table.workspaceId),
    resourceIdx: index('comments_resource_idx').on(table.resourceType, table.resourceId),
    parentIdx: index('comments_parent_idx').on(table.parentId),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvites.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type SavedQuestion = typeof savedQuestions.$inferSelect;
export type NewSavedQuestion = typeof savedQuestions.$inferInsert;
export type SavedView = typeof savedViews.$inferSelect;
export type NewSavedView = typeof savedViews.$inferInsert;
export type DashboardTemplate = typeof dashboardTemplates.$inferSelect;
export type NewDashboardTemplate = typeof dashboardTemplates.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
