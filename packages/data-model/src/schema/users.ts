import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Enums
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member', 'viewer']);

// Users table (synced from Supabase Auth)
export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(), // Matches Supabase auth.users.id
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Workspace memberships
export const workspaceMemberships = pgTable('workspace_memberships', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').notNull().default('member'),
  invitedBy: text('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Infer types from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type NewWorkspaceMembership = typeof workspaceMemberships.$inferInsert;






