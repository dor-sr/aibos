import { relations } from 'drizzle-orm';
import { workspaces } from './workspace';
import { users, workspaceMemberships } from './users';
import { connectors, syncLogs } from './connectors';
import { ecommerceCustomers, ecommerceProducts, ecommerceOrders, ecommerceOrderItems } from './ecommerce';
import { saasPlans, saasCustomers, saasSubscriptions, saasInvoices } from './saas';
import { reports, anomalies, questionHistory } from './reports';
import { notificationSettings, notificationLogs } from './notifications';

// Workspace relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  memberships: many(workspaceMemberships),
  connectors: many(connectors),
  ecommerceCustomers: many(ecommerceCustomers),
  ecommerceProducts: many(ecommerceProducts),
  ecommerceOrders: many(ecommerceOrders),
  saasPlans: many(saasPlans),
  saasCustomers: many(saasCustomers),
  saasSubscriptions: many(saasSubscriptions),
  saasInvoices: many(saasInvoices),
  reports: many(reports),
  anomalies: many(anomalies),
  questionHistory: many(questionHistory),
  notificationSettings: many(notificationSettings),
  notificationLogs: many(notificationLogs),
}));

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMemberships),
}));

// Membership relations
export const workspaceMembershipsRelations = relations(workspaceMemberships, ({ one }) => ({
  user: one(users, {
    fields: [workspaceMemberships.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [workspaceMemberships.workspaceId],
    references: [workspaces.id],
  }),
  inviter: one(users, {
    fields: [workspaceMemberships.invitedBy],
    references: [users.id],
  }),
}));

// Connector relations
export const connectorsRelations = relations(connectors, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [connectors.workspaceId],
    references: [workspaces.id],
  }),
  syncLogs: many(syncLogs),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  connector: one(connectors, {
    fields: [syncLogs.connectorId],
    references: [connectors.id],
  }),
  workspace: one(workspaces, {
    fields: [syncLogs.workspaceId],
    references: [workspaces.id],
  }),
}));

// Ecommerce relations
export const ecommerceCustomersRelations = relations(ecommerceCustomers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [ecommerceCustomers.workspaceId],
    references: [workspaces.id],
  }),
  orders: many(ecommerceOrders),
}));

export const ecommerceProductsRelations = relations(ecommerceProducts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [ecommerceProducts.workspaceId],
    references: [workspaces.id],
  }),
  orderItems: many(ecommerceOrderItems),
}));

export const ecommerceOrdersRelations = relations(ecommerceOrders, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [ecommerceOrders.workspaceId],
    references: [workspaces.id],
  }),
  customer: one(ecommerceCustomers, {
    fields: [ecommerceOrders.customerId],
    references: [ecommerceCustomers.id],
  }),
  items: many(ecommerceOrderItems),
}));

export const ecommerceOrderItemsRelations = relations(ecommerceOrderItems, ({ one }) => ({
  order: one(ecommerceOrders, {
    fields: [ecommerceOrderItems.orderId],
    references: [ecommerceOrders.id],
  }),
  product: one(ecommerceProducts, {
    fields: [ecommerceOrderItems.productId],
    references: [ecommerceProducts.id],
  }),
  workspace: one(workspaces, {
    fields: [ecommerceOrderItems.workspaceId],
    references: [workspaces.id],
  }),
}));

// SaaS relations
export const saasPlansRelations = relations(saasPlans, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [saasPlans.workspaceId],
    references: [workspaces.id],
  }),
  subscriptions: many(saasSubscriptions),
}));

export const saasCustomersRelations = relations(saasCustomers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [saasCustomers.workspaceId],
    references: [workspaces.id],
  }),
  subscriptions: many(saasSubscriptions),
  invoices: many(saasInvoices),
}));

export const saasSubscriptionsRelations = relations(saasSubscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [saasSubscriptions.workspaceId],
    references: [workspaces.id],
  }),
  customer: one(saasCustomers, {
    fields: [saasSubscriptions.customerId],
    references: [saasCustomers.id],
  }),
  plan: one(saasPlans, {
    fields: [saasSubscriptions.planId],
    references: [saasPlans.id],
  }),
}));

export const saasInvoicesRelations = relations(saasInvoices, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [saasInvoices.workspaceId],
    references: [workspaces.id],
  }),
  customer: one(saasCustomers, {
    fields: [saasInvoices.customerId],
    references: [saasCustomers.id],
  }),
  subscription: one(saasSubscriptions, {
    fields: [saasInvoices.subscriptionId],
    references: [saasSubscriptions.id],
  }),
}));

// Reports relations
export const reportsRelations = relations(reports, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [reports.workspaceId],
    references: [workspaces.id],
  }),
}));

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [anomalies.workspaceId],
    references: [workspaces.id],
  }),
}));

export const questionHistoryRelations = relations(questionHistory, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [questionHistory.workspaceId],
    references: [workspaces.id],
  }),
}));

// Notification relations
export const notificationSettingsRelations = relations(notificationSettings, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [notificationSettings.workspaceId],
    references: [workspaces.id],
  }),
  logs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [notificationLogs.workspaceId],
    references: [workspaces.id],
  }),
  settings: one(notificationSettings, {
    fields: [notificationLogs.settingsId],
    references: [notificationSettings.id],
  }),
}));

