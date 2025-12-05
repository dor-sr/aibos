import { pgTable, text, timestamp, jsonb, pgEnum, index, integer, real, boolean, date } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { users } from './users';

// ===== CONVERSATIONAL MEMORY (Stage 13.1) =====

// Conversation status enum
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'archived', 'deleted']);

// Conversations table - stores chat sessions
export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'), // Auto-generated or user-defined
    summary: text('summary'), // AI-generated summary for context compression
    status: conversationStatusEnum('status').notNull().default('active'),
    messageCount: integer('message_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<ConversationMetadata>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversations_workspace_idx').on(table.workspaceId),
    index('conversations_user_idx').on(table.workspaceId, table.userId),
    index('conversations_status_idx').on(table.workspaceId, table.status),
  ]
);

// Message role enum
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);

// Conversation messages table
export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: text('id').primaryKey().notNull(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    intent: text('intent'), // Detected intent
    entities: jsonb('entities').$type<ExtractedEntity[]>(), // Extracted entities (products, dates, etc.)
    toolCalls: jsonb('tool_calls').$type<ToolCallRecord[]>(), // Tool calls made
    processingTimeMs: integer('processing_time_ms'),
    tokenCount: integer('token_count'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversation_messages_conv_idx').on(table.conversationId),
    index('conversation_messages_created_idx').on(table.conversationId, table.createdAt),
  ]
);

// Entity memory - remembers important entities mentioned in conversations
export const entityMemory = pgTable(
  'entity_memory',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id')
      .references(() => conversations.id, { onDelete: 'set null' }),
    entityType: text('entity_type').notNull(), // product, customer, campaign, metric, date_range
    entityValue: text('entity_value').notNull(),
    entityId: text('entity_id'), // Reference to actual entity in DB if applicable
    mentionCount: integer('mention_count').notNull().default(1),
    lastMentionedAt: timestamp('last_mentioned_at', { withTimezone: true }).notNull().defaultNow(),
    context: text('context'), // Context in which entity was mentioned
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('entity_memory_workspace_idx').on(table.workspaceId),
    index('entity_memory_type_idx').on(table.workspaceId, table.entityType),
    index('entity_memory_conv_idx').on(table.conversationId),
  ]
);

// ===== PROACTIVE INSIGHTS (Stage 13.2) =====

// Insight type enum
export const insightTypeEnum = pgEnum('insight_type', [
  'opportunity',    // Growth opportunity detected
  'risk',          // Potential issue detected
  'highlight',     // Positive trend
  'anomaly',       // Statistical anomaly
  'recommendation' // Action recommendation
]);

// Insight category enum
export const insightCategoryEnum = pgEnum('insight_category', [
  'revenue',
  'orders',
  'customers',
  'products',
  'marketing',
  'operations',
  'churn',
  'growth'
]);

// Insight status enum
export const insightStatusEnum = pgEnum('insight_status', [
  'new',
  'viewed',
  'acknowledged',
  'actioned',
  'dismissed',
  'expired'
]);

// Insights table
export const insights = pgTable(
  'insights',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: insightTypeEnum('type').notNull(),
    category: insightCategoryEnum('category').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    explanation: text('explanation'), // AI-generated detailed explanation
    recommendedAction: text('recommended_action'),
    priority: integer('priority').notNull().default(50), // 1-100, higher = more important
    score: real('score'), // Confidence/importance score
    metrics: jsonb('metrics').$type<InsightMetrics>(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    status: insightStatusEnum('status').notNull().default('new'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    viewedBy: text('viewed_by'),
    actionedAt: timestamp('actioned_at', { withTimezone: true }),
    actionedBy: text('actioned_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    deliveredVia: jsonb('delivered_via').$type<string[]>(), // ['email', 'slack', 'in_app']
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('insights_workspace_idx').on(table.workspaceId),
    index('insights_type_idx').on(table.workspaceId, table.type),
    index('insights_category_idx').on(table.workspaceId, table.category),
    index('insights_status_idx').on(table.workspaceId, table.status),
    index('insights_priority_idx').on(table.workspaceId, table.priority),
    index('insights_created_idx').on(table.workspaceId, table.createdAt),
  ]
);

// Insight actions log
export const insightActions = pgTable(
  'insight_actions',
  {
    id: text('id').primaryKey().notNull(),
    insightId: text('insight_id')
      .notNull()
      .references(() => insights.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // viewed, acknowledged, actioned, dismissed
    feedback: text('feedback'), // Optional user feedback
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('insight_actions_insight_idx').on(table.insightId),
    index('insight_actions_user_idx').on(table.userId),
  ]
);

// ===== COHORT ANALYSIS (Stage 13.3) =====

// Cohort type enum
export const cohortTypeEnum = pgEnum('cohort_type', [
  'acquisition',   // By acquisition date
  'first_purchase', // By first purchase date
  'subscription_start', // By subscription start date
  'custom'         // Custom cohort definition
]);

// Cohorts table
export const cohorts = pgTable(
  'cohorts',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: cohortTypeEnum('type').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    customerCount: integer('customer_count').notNull().default(0),
    definition: jsonb('definition').$type<CohortDefinition>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('cohorts_workspace_idx').on(table.workspaceId),
    index('cohorts_type_idx').on(table.workspaceId, table.type),
    index('cohorts_date_idx').on(table.workspaceId, table.startDate),
  ]
);

// Cohort metrics over time
export const cohortMetrics = pgTable(
  'cohort_metrics',
  {
    id: text('id').primaryKey().notNull(),
    cohortId: text('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    period: integer('period').notNull(), // Period number (0 = cohort month, 1 = month 1, etc.)
    periodLabel: text('period_label'), // Human-readable label
    activeCustomers: integer('active_customers').notNull().default(0),
    retentionRate: real('retention_rate'), // Percentage
    revenue: real('revenue').default(0),
    orders: integer('orders').default(0),
    averageOrderValue: real('average_order_value'),
    cumulativeLtv: real('cumulative_ltv'), // Cumulative LTV up to this period
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('cohort_metrics_cohort_idx').on(table.cohortId),
    index('cohort_metrics_period_idx').on(table.cohortId, table.period),
  ]
);

// ===== CUSTOMER SEGMENTATION (Stage 13.4) =====

// Segment type enum
export const segmentTypeEnum = pgEnum('segment_type', [
  'rfm',           // RFM-based segment
  'behavioral',    // Behavior-based
  'value',         // Value-based (LTV tiers)
  'lifecycle',     // Lifecycle stage
  'custom'         // Custom definition
]);

// Segments table
export const segments = pgTable(
  'segments',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    type: segmentTypeEnum('type').notNull(),
    definition: jsonb('definition').$type<SegmentDefinition>().notNull(),
    customerCount: integer('customer_count').notNull().default(0),
    avgLtv: real('avg_ltv'),
    avgOrderValue: real('avg_order_value'),
    isActive: boolean('is_active').notNull().default(true),
    lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('segments_workspace_idx').on(table.workspaceId),
    index('segments_type_idx').on(table.workspaceId, table.type),
    index('segments_active_idx').on(table.workspaceId, table.isActive),
  ]
);

// Segment memberships (which customers belong to which segments)
export const segmentMemberships = pgTable(
  'segment_memberships',
  {
    id: text('id').primaryKey().notNull(),
    segmentId: text('segment_id')
      .notNull()
      .references(() => segments.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').notNull(), // References ecommerce_customers or saas_customers
    customerType: text('customer_type').notNull(), // 'ecommerce' or 'saas'
    score: real('score'), // Membership score (e.g., RFM score)
    rfmRecency: integer('rfm_recency'), // 1-5
    rfmFrequency: integer('rfm_frequency'), // 1-5
    rfmMonetary: integer('rfm_monetary'), // 1-5
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('segment_memberships_segment_idx').on(table.segmentId),
    index('segment_memberships_customer_idx').on(table.customerId),
    index('segment_memberships_score_idx').on(table.segmentId, table.score),
  ]
);

// ===== ATTRIBUTION MODELING (Stage 13.5) =====

// Attribution model type enum
export const attributionModelEnum = pgEnum('attribution_model', [
  'first_touch',
  'last_touch',
  'linear',
  'time_decay',
  'position_based',
  'data_driven'
]);

// Attribution touchpoints
export const attributionTouchpoints = pgTable(
  'attribution_touchpoints',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').notNull(),
    orderId: text('order_id'), // If attributed to a conversion
    channel: text('channel').notNull(), // direct, organic, paid_search, social, email, referral
    source: text('source'), // Specific source (google, facebook, etc.)
    medium: text('medium'), // Specific medium (cpc, organic, etc.)
    campaign: text('campaign'), // Campaign name
    touchpointOrder: integer('touchpoint_order').notNull(), // Order in the journey
    isFirstTouch: boolean('is_first_touch').notNull().default(false),
    isLastTouch: boolean('is_last_touch').notNull().default(false),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    pageUrl: text('page_url'),
    referrerUrl: text('referrer_url'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('attribution_touchpoints_workspace_idx').on(table.workspaceId),
    index('attribution_touchpoints_customer_idx').on(table.workspaceId, table.customerId),
    index('attribution_touchpoints_order_idx').on(table.orderId),
    index('attribution_touchpoints_channel_idx').on(table.workspaceId, table.channel),
    index('attribution_touchpoints_timestamp_idx').on(table.workspaceId, table.timestamp),
  ]
);

// Attribution results (calculated attribution per model)
export const attributionResults = pgTable(
  'attribution_results',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    model: attributionModelEnum('model').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    channel: text('channel').notNull(),
    source: text('source'),
    conversions: integer('conversions').notNull().default(0),
    revenue: real('revenue').notNull().default(0),
    attributedConversions: real('attributed_conversions').notNull().default(0), // Fractional
    attributedRevenue: real('attributed_revenue').notNull().default(0),
    contribution: real('contribution'), // Percentage contribution
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('attribution_results_workspace_idx').on(table.workspaceId),
    index('attribution_results_model_idx').on(table.workspaceId, table.model),
    index('attribution_results_period_idx').on(table.workspaceId, table.periodStart, table.periodEnd),
    index('attribution_results_channel_idx').on(table.workspaceId, table.channel),
  ]
);

// ===== PREDICTIVE ANALYTICS (Stage 13.6) =====

// Prediction type enum
export const predictionTypeEnum = pgEnum('prediction_type', [
  'churn_risk',
  'ltv_forecast',
  'demand_forecast',
  'revenue_forecast',
  'next_purchase'
]);

// Customer predictions
export const customerPredictions = pgTable(
  'customer_predictions',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').notNull(),
    customerType: text('customer_type').notNull(), // 'ecommerce' or 'saas'
    predictionType: predictionTypeEnum('prediction_type').notNull(),
    predictedValue: real('predicted_value').notNull(),
    confidence: real('confidence'), // 0-1
    riskLevel: text('risk_level'), // low, medium, high (for churn predictions)
    factors: jsonb('factors').$type<PredictionFactor[]>(), // Contributing factors
    validUntil: timestamp('valid_until', { withTimezone: true }),
    actualValue: real('actual_value'), // For model validation
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('customer_predictions_workspace_idx').on(table.workspaceId),
    index('customer_predictions_customer_idx').on(table.workspaceId, table.customerId),
    index('customer_predictions_type_idx').on(table.workspaceId, table.predictionType),
    index('customer_predictions_risk_idx').on(table.workspaceId, table.riskLevel),
  ]
);

// Revenue/demand forecasts
export const forecasts = pgTable(
  'forecasts',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    forecastType: text('forecast_type').notNull(), // revenue, orders, mrr, demand
    entityType: text('entity_type'), // product, category, overall
    entityId: text('entity_id'), // Product ID if applicable
    forecastDate: date('forecast_date').notNull(),
    predictedValue: real('predicted_value').notNull(),
    lowerBound: real('lower_bound'), // Confidence interval
    upperBound: real('upper_bound'),
    confidence: real('confidence'),
    modelVersion: text('model_version'),
    actualValue: real('actual_value'), // For model validation
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('forecasts_workspace_idx').on(table.workspaceId),
    index('forecasts_type_idx').on(table.workspaceId, table.forecastType),
    index('forecasts_date_idx').on(table.workspaceId, table.forecastDate),
    index('forecasts_entity_idx').on(table.workspaceId, table.entityType, table.entityId),
  ]
);

// ===== TYPE DEFINITIONS =====

interface ConversationMetadata {
  lastTopic?: string;
  preferredMetrics?: string[];
  preferredPeriod?: string;
  compressedAt?: string;
}

interface ExtractedEntity {
  type: string; // product, customer, campaign, date, metric
  value: string;
  id?: string;
  confidence?: number;
}

interface ToolCallRecord {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

interface InsightMetrics {
  primaryMetric?: { name: string; value: number; change?: number };
  relatedMetrics?: { name: string; value: number; change?: number }[];
  period?: { start: string; end: string };
}

interface CohortDefinition {
  dateField: string;
  filters?: Record<string, unknown>;
  granularity: 'day' | 'week' | 'month';
}

interface SegmentDefinition {
  type: 'rfm' | 'behavioral' | 'value' | 'lifecycle' | 'custom';
  rules?: SegmentRule[];
  rfmCriteria?: RFMCriteria;
}

interface SegmentRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: unknown;
}

interface RFMCriteria {
  recencyDays?: { min?: number; max?: number };
  frequencyCount?: { min?: number; max?: number };
  monetaryValue?: { min?: number; max?: number };
}

interface PredictionFactor {
  name: string;
  importance: number;
  value?: unknown;
  direction?: 'positive' | 'negative';
}

// ===== EXPORT TYPES =====

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type EntityMemoryRecord = typeof entityMemory.$inferSelect;
export type NewEntityMemoryRecord = typeof entityMemory.$inferInsert;
export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
export type InsightAction = typeof insightActions.$inferSelect;
export type NewInsightAction = typeof insightActions.$inferInsert;
export type Cohort = typeof cohorts.$inferSelect;
export type NewCohort = typeof cohorts.$inferInsert;
export type CohortMetric = typeof cohortMetrics.$inferSelect;
export type NewCohortMetric = typeof cohortMetrics.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;
export type SegmentMembership = typeof segmentMemberships.$inferSelect;
export type NewSegmentMembership = typeof segmentMemberships.$inferInsert;
export type AttributionTouchpoint = typeof attributionTouchpoints.$inferSelect;
export type NewAttributionTouchpoint = typeof attributionTouchpoints.$inferInsert;
export type AttributionResult = typeof attributionResults.$inferSelect;
export type NewAttributionResult = typeof attributionResults.$inferInsert;
export type CustomerPrediction = typeof customerPredictions.$inferSelect;
export type NewCustomerPrediction = typeof customerPredictions.$inferInsert;
export type Forecast = typeof forecasts.$inferSelect;
export type NewForecast = typeof forecasts.$inferInsert;
