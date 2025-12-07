import { pgTable, text, timestamp, integer, numeric, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Enums
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
]);

// Plans (pricing tiers)
export const saasPlans = pgTable(
  'saas_plans',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(), // Stripe product/price ID
    source: text('source').notNull(), // stripe
    name: text('name').notNull(),
    description: text('description'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    interval: text('interval'), // month, year
    intervalCount: integer('interval_count').default(1),
    trialDays: integer('trial_days'),
    isActive: text('is_active').default('true'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('saas_plans_workspace_idx').on(table.workspaceId),
    index('saas_plans_external_idx').on(table.workspaceId, table.source, table.externalId),
  ]
);

// Customers (SaaS)
export const saasCustomers = pgTable(
  'saas_customers',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(), // Stripe customer ID
    source: text('source').notNull(),
    email: text('email'),
    name: text('name'),
    description: text('description'),
    currency: text('currency').default('USD'),
    balance: numeric('balance', { precision: 12, scale: 2 }).default('0'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('saas_customers_workspace_idx').on(table.workspaceId),
    index('saas_customers_email_idx').on(table.email),
    index('saas_customers_external_idx').on(table.workspaceId, table.source, table.externalId),
  ]
);

// Subscriptions
export const saasSubscriptions = pgTable(
  'saas_subscriptions',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => saasCustomers.id, { onDelete: 'cascade' }),
    planId: text('plan_id').references(() => saasPlans.id),
    externalId: text('external_id').notNull(), // Stripe subscription ID
    source: text('source').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    mrr: numeric('mrr', { precision: 12, scale: 2 }).notNull(), // Monthly recurring revenue
    currency: text('currency').notNull().default('USD'),
    quantity: integer('quantity').default(1),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    cancelAtPeriodEnd: text('cancel_at_period_end').default('false'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('saas_subscriptions_workspace_idx').on(table.workspaceId),
    index('saas_subscriptions_customer_idx').on(table.customerId),
    index('saas_subscriptions_external_idx').on(table.workspaceId, table.source, table.externalId),
    index('saas_subscriptions_status_idx').on(table.workspaceId, table.status),
  ]
);

// Invoices
export const saasInvoices = pgTable(
  'saas_invoices',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => saasCustomers.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id').references(() => saasSubscriptions.id),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    status: invoiceStatusEnum('status').notNull(),
    number: text('number'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
    tax: numeric('tax', { precision: 12, scale: 2 }),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }),
    amountDue: numeric('amount_due', { precision: 12, scale: 2 }),
    currency: text('currency').notNull().default('USD'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('saas_invoices_workspace_idx').on(table.workspaceId),
    index('saas_invoices_customer_idx').on(table.customerId),
    index('saas_invoices_external_idx').on(table.workspaceId, table.source, table.externalId),
    index('saas_invoices_date_idx').on(table.workspaceId, table.sourceCreatedAt),
  ]
);

// Infer types from schema
export type SaasPlan = typeof saasPlans.$inferSelect;
export type NewSaasPlan = typeof saasPlans.$inferInsert;
export type SaasCustomer = typeof saasCustomers.$inferSelect;
export type NewSaasCustomer = typeof saasCustomers.$inferInsert;
export type SaasSubscription = typeof saasSubscriptions.$inferSelect;
export type NewSaasSubscription = typeof saasSubscriptions.$inferInsert;
export type SaasInvoice = typeof saasInvoices.$inferSelect;
export type NewSaasInvoice = typeof saasInvoices.$inferInsert;







