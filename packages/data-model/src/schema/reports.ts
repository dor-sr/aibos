import { pgTable, text, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Enums
export const reportTypeEnum = pgEnum('report_type', ['weekly', 'monthly', 'quarterly']);

export const anomalySeverityEnum = pgEnum('anomaly_severity', ['low', 'medium', 'high', 'critical']);

// Generated reports
export const reports = pgTable(
  'reports',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: reportTypeEnum('type').notNull(),
    title: text('title').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    summary: text('summary'), // AI-generated summary
    metrics: jsonb('metrics').$type<ReportMetrics>().notNull(),
    insights: jsonb('insights').$type<ReportInsight[]>().default([]),
    status: text('status').notNull().default('generated'), // generated, sent, failed
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('reports_workspace_idx').on(table.workspaceId),
    index('reports_period_idx').on(table.workspaceId, table.periodStart),
  ]
);

// Detected anomalies
export const anomalies = pgTable(
  'anomalies',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metricName: text('metric_name').notNull(),
    severity: anomalySeverityEnum('severity').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    explanation: text('explanation'), // AI-generated explanation
    currentValue: text('current_value').notNull(),
    previousValue: text('previous_value'),
    changePercent: text('change_percent'),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    isAcknowledged: text('is_acknowledged').default('false'),
    acknowledgedBy: text('acknowledged_by'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('anomalies_workspace_idx').on(table.workspaceId),
    index('anomalies_detected_idx').on(table.workspaceId, table.detectedAt),
    index('anomalies_metric_idx').on(table.workspaceId, table.metricName),
  ]
);

// NLQ question history
export const questionHistory = pgTable(
  'question_history',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    question: text('question').notNull(),
    intent: text('intent'), // classified intent
    queryPattern: text('query_pattern'), // matched query pattern
    parameters: jsonb('parameters').$type<Record<string, unknown>>(),
    answer: text('answer'),
    answerData: jsonb('answer_data').$type<Record<string, unknown>>(),
    success: text('success').default('true'),
    errorMessage: text('error_message'),
    processingTimeMs: text('processing_time_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('question_history_workspace_idx').on(table.workspaceId),
    index('question_history_user_idx').on(table.workspaceId, table.userId),
  ]
);

// Type definitions for JSONB columns
interface ReportMetrics {
  revenue?: { current: number; previous: number; change: number };
  orders?: { current: number; previous: number; change: number };
  aov?: { current: number; previous: number; change: number };
  mrr?: { current: number; previous: number; change: number };
  customers?: { current: number; previous: number; change: number };
  [key: string]: { current: number; previous: number; change: number } | undefined;
}

interface ReportInsight {
  type: 'highlight' | 'concern' | 'opportunity';
  title: string;
  description: string;
  metric?: string;
  priority: number;
}

// Infer types from schema
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Anomaly = typeof anomalies.$inferSelect;
export type NewAnomaly = typeof anomalies.$inferInsert;
export type QuestionHistory = typeof questionHistory.$inferSelect;
export type NewQuestionHistory = typeof questionHistory.$inferInsert;


