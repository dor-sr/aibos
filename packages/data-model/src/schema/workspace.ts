import { pgTable, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const verticalTypeEnum = pgEnum('vertical_type', [
  'ecommerce',
  'saas',
  'hospitality',
  'restaurant',
  'services',
  'generic',
]);

export const planTypeEnum = pgEnum('plan_type', ['free', 'starter', 'growth', 'enterprise']);

export const workspaceStatusEnum = pgEnum('workspace_status', ['active', 'suspended', 'churned']);

// Workspace table
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  verticalType: verticalTypeEnum('vertical_type').notNull().default('generic'),
  currency: text('currency').notNull().default('USD'),
  timezone: text('timezone').notNull().default('UTC'),
  settings: jsonb('settings').$type<WorkspaceSettings>().default({
    weekStartsOn: 1,
    fiscalYearStartMonth: 1,
  }),
  activeAgents: text('active_agents').array().$type<string[]>().default(['analytics']),
  plan: planTypeEnum('plan').notNull().default('free'),
  status: workspaceStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type for workspace settings stored in JSONB
interface WorkspaceSettings {
  weekStartsOn: 0 | 1;
  fiscalYearStartMonth: number;
  reportingEmail?: string;
  slackWebhook?: string;
}

// Infer types from schema
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

