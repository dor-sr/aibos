import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  integer,
  real,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { users } from './users';

// ============================================================================
// Stage 18.1 - Dashboard Builder
// ============================================================================

// Dashboard status enum
export const dashboardStatusEnum = pgEnum('dashboard_status', [
  'draft',
  'published',
  'archived',
]);

// Widget type enum
export const widgetTypeEnum = pgEnum('widget_type', [
  'metric',
  'line_chart',
  'bar_chart',
  'area_chart',
  'pie_chart',
  'table',
  'text',
  'question',
  'image',
  'divider',
]);

// Custom dashboards table
export const customDashboards = pgTable(
  'custom_dashboards',
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
    slug: text('slug').notNull(), // URL-friendly identifier
    status: dashboardStatusEnum('status').notNull().default('draft'),
    isDefault: boolean('is_default').notNull().default(false), // Default dashboard for workspace
    isShared: boolean('is_shared').notNull().default(false),
    layout: jsonb('layout').$type<DashboardLayout>().notNull(),
    settings: jsonb('settings').$type<DashboardSettings>(),
    thumbnail: text('thumbnail'), // Preview image URL
    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('custom_dashboards_workspace_idx').on(table.workspaceId),
    creatorIdx: index('custom_dashboards_creator_idx').on(table.createdBy),
    slugIdx: index('custom_dashboards_slug_idx').on(table.workspaceId, table.slug),
    statusIdx: index('custom_dashboards_status_idx').on(table.status),
    defaultIdx: index('custom_dashboards_default_idx').on(table.workspaceId, table.isDefault),
  })
);

// Dashboard widgets table
export const dashboardWidgets = pgTable(
  'dashboard_widgets',
  {
    id: text('id').primaryKey().notNull(),
    dashboardId: text('dashboard_id')
      .notNull()
      .references(() => customDashboards.id, { onDelete: 'cascade' }),
    widgetType: widgetTypeEnum('widget_type').notNull(),
    title: text('title'),
    // Grid position (using CSS Grid or react-grid-layout coordinates)
    gridX: integer('grid_x').notNull().default(0),
    gridY: integer('grid_y').notNull().default(0),
    gridW: integer('grid_w').notNull().default(4), // Width in grid units
    gridH: integer('grid_h').notNull().default(2), // Height in grid units
    // Widget configuration
    config: jsonb('config').$type<WidgetConfig>().notNull(),
    // Styling
    style: jsonb('style').$type<WidgetStyle>(),
    isVisible: boolean('is_visible').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dashboardIdx: index('dashboard_widgets_dashboard_idx').on(table.dashboardId),
    orderIdx: index('dashboard_widgets_order_idx').on(table.dashboardId, table.sortOrder),
  })
);

// ============================================================================
// Stage 18.2 - Custom Metrics
// ============================================================================

// Metric aggregation type
export const metricAggregationEnum = pgEnum('metric_aggregation', [
  'sum',
  'avg',
  'count',
  'min',
  'max',
  'count_distinct',
  'custom',
]);

// Custom metrics table
export const customMetrics = pgTable(
  'custom_metrics',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(), // Used for NLQ and API
    description: text('description'),
    category: text('category'), // For grouping metrics
    // Formula definition
    formula: jsonb('formula').$type<MetricFormula>().notNull(),
    aggregation: metricAggregationEnum('aggregation').notNull().default('sum'),
    // Formatting
    format: text('format').notNull().default('number'), // number, currency, percentage, duration
    decimals: integer('decimals').notNull().default(2),
    prefix: text('prefix'), // e.g., '$'
    suffix: text('suffix'), // e.g., '%'
    // Validation
    isValidated: boolean('is_validated').notNull().default(false),
    validationError: text('validation_error'),
    lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }),
    lastValue: real('last_value'),
    // NLQ support
    nlqKeywords: text('nlq_keywords').array().$type<string[]>(), // Keywords for NLQ matching
    nlqExamples: text('nlq_examples').array().$type<string[]>(), // Example questions
    // Status
    isActive: boolean('is_active').notNull().default(true),
    isShared: boolean('is_shared').notNull().default(false),
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('custom_metrics_workspace_idx').on(table.workspaceId),
    slugIdx: index('custom_metrics_slug_idx').on(table.workspaceId, table.slug),
    categoryIdx: index('custom_metrics_category_idx').on(table.workspaceId, table.category),
    activeIdx: index('custom_metrics_active_idx').on(table.workspaceId, table.isActive),
  })
);

// ============================================================================
// Stage 18.3 - Saved Views and Filter Presets
// ============================================================================

// Filter preset type enum
export const filterPresetTypeEnum = pgEnum('filter_preset_type', [
  'date_range',
  'segment',
  'channel',
  'product',
  'customer',
  'custom',
]);

// Filter presets table
export const filterPresets = pgTable(
  'filter_presets',
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
    presetType: filterPresetTypeEnum('preset_type').notNull(),
    // Filter configuration
    filters: jsonb('filters').$type<FilterConfig[]>().notNull(),
    // Scope - where this preset can be used
    applicableTo: text('applicable_to').array().$type<string[]>(), // ['dashboard', 'analytics', 'reports']
    isDefault: boolean('is_default').notNull().default(false),
    isShared: boolean('is_shared').notNull().default(false),
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('filter_presets_workspace_idx').on(table.workspaceId),
    typeIdx: index('filter_presets_type_idx').on(table.workspaceId, table.presetType),
    defaultIdx: index('filter_presets_default_idx').on(table.workspaceId, table.isDefault),
  })
);

// Date range presets (quick date selections)
export const dateRangePresets = pgTable(
  'date_range_presets',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'relative' or 'absolute'
    // For relative: 'today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', etc.
    // For absolute: specific date range
    value: jsonb('value').$type<DateRangeValue>().notNull(),
    isSystem: boolean('is_system').notNull().default(false), // System presets cannot be deleted
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('date_range_presets_workspace_idx').on(table.workspaceId),
    orderIdx: index('date_range_presets_order_idx').on(table.workspaceId, table.sortOrder),
  })
);

// User view preferences (default views per user)
export const userViewPreferences = pgTable(
  'user_view_preferences',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    viewType: text('view_type').notNull(), // 'dashboard', 'analytics', 'marketing', 'operations'
    defaultDashboardId: text('default_dashboard_id'),
    defaultFilterPresetId: text('default_filter_preset_id'),
    defaultDateRange: jsonb('default_date_range').$type<DateRangeValue>(),
    preferences: jsonb('preferences').$type<ViewPreferences>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWorkspaceIdx: index('user_view_prefs_user_workspace_idx').on(table.userId, table.workspaceId),
    viewTypeIdx: index('user_view_prefs_view_type_idx').on(
      table.userId,
      table.workspaceId,
      table.viewType
    ),
  })
);

// ============================================================================
// Stage 18.4 - Export and Reporting
// ============================================================================

// Export format enum
export const exportFormatEnum = pgEnum('export_format', [
  'pdf',
  'csv',
  'xlsx',
  'png',
  'json',
]);

// Export status enum
export const exportStatusEnum = pgEnum('export_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

// Schedule frequency enum
export const scheduleFrequencyEnum = pgEnum('schedule_frequency', [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
]);

// Export jobs table (for async exports)
export const exportJobs = pgTable(
  'export_jobs',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    requestedBy: text('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exportType: text('export_type').notNull(), // 'dashboard', 'report', 'data_table', 'metric'
    resourceId: text('resource_id'), // ID of the dashboard/report being exported
    format: exportFormatEnum('format').notNull(),
    status: exportStatusEnum('status').notNull().default('pending'),
    // Export configuration
    config: jsonb('config').$type<ExportConfig>().notNull(),
    // Output
    fileName: text('file_name'),
    fileUrl: text('file_url'),
    fileSize: integer('file_size'), // In bytes
    // Processing
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    error: text('error'),
    // Expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('export_jobs_workspace_idx').on(table.workspaceId),
    statusIdx: index('export_jobs_status_idx').on(table.status),
    userIdx: index('export_jobs_user_idx').on(table.requestedBy),
    expiresIdx: index('export_jobs_expires_idx').on(table.expiresAt),
  })
);

// Scheduled exports table
export const scheduledExports = pgTable(
  'scheduled_exports',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    exportType: text('export_type').notNull(),
    resourceId: text('resource_id'),
    format: exportFormatEnum('format').notNull(),
    // Schedule
    frequency: scheduleFrequencyEnum('frequency').notNull(),
    dayOfWeek: integer('day_of_week'), // 0-6 for weekly
    dayOfMonth: integer('day_of_month'), // 1-31 for monthly
    hour: integer('hour').notNull().default(9), // Hour of day (0-23)
    timezone: text('timezone').notNull().default('UTC'),
    // Delivery
    recipients: text('recipients').array().$type<string[]>().notNull(), // Email addresses
    subject: text('subject'),
    message: text('message'),
    // White-label options
    whiteLabelConfig: jsonb('white_label_config').$type<WhiteLabelConfig>(),
    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    lastStatus: exportStatusEnum('last_status'),
    runCount: integer('run_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('scheduled_exports_workspace_idx').on(table.workspaceId),
    activeIdx: index('scheduled_exports_active_idx').on(table.isActive),
    nextRunIdx: index('scheduled_exports_next_run_idx').on(table.nextRunAt),
  })
);

// Dashboard shares (for sharing dashboards with external users or links)
export const dashboardShares = pgTable(
  'dashboard_shares',
  {
    id: text('id').primaryKey().notNull(),
    dashboardId: text('dashboard_id')
      .notNull()
      .references(() => customDashboards.id, { onDelete: 'cascade' }),
    shareToken: text('share_token').notNull().unique(), // Public link token
    shareType: text('share_type').notNull(), // 'link', 'embed', 'email'
    password: text('password'), // Optional password protection
    // Permissions
    canView: boolean('can_view').notNull().default(true),
    canInteract: boolean('can_interact').notNull().default(false), // Can use filters, date ranges
    canExport: boolean('can_export').notNull().default(false),
    // Restrictions
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    maxViews: integer('max_views'),
    currentViews: integer('current_views').notNull().default(0),
    allowedDomains: text('allowed_domains').array().$type<string[]>(), // For embed restrictions
    // Tracking
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dashboardIdx: index('dashboard_shares_dashboard_idx').on(table.dashboardId),
    tokenIdx: index('dashboard_shares_token_idx').on(table.shareToken),
    expiresIdx: index('dashboard_shares_expires_idx').on(table.expiresAt),
  })
);

// ============================================================================
// Type Definitions
// ============================================================================

export interface DashboardLayout {
  columns: number; // Number of grid columns (default: 12)
  rowHeight: number; // Height of each grid row in pixels
  margin: [number, number]; // [horizontal, vertical] margins
  containerPadding: [number, number];
}

export interface DashboardSettings {
  theme?: 'light' | 'dark' | 'system';
  backgroundColor?: string;
  refreshInterval?: number; // Auto-refresh in seconds
  showFilters?: boolean;
  showDateRange?: boolean;
  defaultDateRange?: DateRangeValue;
  defaultFilters?: FilterConfig[];
  presentationMode?: {
    enabled: boolean;
    autoAdvance?: boolean;
    advanceInterval?: number;
  };
}

export interface WidgetConfig {
  // Common properties
  dataSource?: string; // Which data source to use
  metricId?: string; // Custom metric ID
  metricName?: string; // Built-in metric name
  // Chart-specific
  chartConfig?: {
    xAxis?: string;
    yAxis?: string | string[];
    groupBy?: string;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    curved?: boolean;
    stacked?: boolean;
  };
  // Table-specific
  tableConfig?: {
    columns: Array<{
      key: string;
      label: string;
      format?: string;
      sortable?: boolean;
    }>;
    pagination?: boolean;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  };
  // Text/Question widget
  content?: string;
  question?: string;
  // Metric widget
  comparison?: {
    type: 'previous_period' | 'previous_year' | 'target';
    targetValue?: number;
  };
  // Filters applied to this widget
  filters?: FilterConfig[];
  dateRange?: DateRangeValue;
}

export interface WidgetStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  textColor?: string;
  titleSize?: string;
  valueSize?: string;
}

export interface MetricFormula {
  type: 'simple' | 'calculated' | 'sql';
  // Simple: just reference a column
  column?: string;
  table?: string;
  // Calculated: formula with other metrics
  expression?: string; // e.g., "revenue / orders"
  variables?: Record<string, string>; // Variable definitions
  // SQL: raw SQL expression (advanced)
  sql?: string;
}

export interface FilterConfig {
  id: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between' | 'is_null' | 'not_null';
  value: unknown;
  label?: string;
}

export interface DateRangeValue {
  type: 'relative' | 'absolute';
  // Relative
  relative?: {
    value: number;
    unit: 'days' | 'weeks' | 'months' | 'quarters' | 'years';
    anchor?: 'today' | 'start_of_week' | 'start_of_month' | 'start_of_quarter' | 'start_of_year';
  };
  // Or preset name
  preset?: string; // 'today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', etc.
  // Absolute
  startDate?: string; // ISO date string
  endDate?: string;
  // Comparison period
  compareWith?: 'previous_period' | 'previous_year' | 'none';
}

export interface ViewPreferences {
  showMetricCards?: boolean;
  showCharts?: boolean;
  chartHeight?: number;
  compactMode?: boolean;
  colorScheme?: string;
  currency?: string;
  numberFormat?: string;
}

export interface ExportConfig {
  title?: string;
  description?: string;
  dateRange?: DateRangeValue;
  filters?: FilterConfig[];
  // PDF specific
  pageSize?: 'A4' | 'Letter' | 'A3';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeFooter?: boolean;
  // CSV/Excel specific
  columns?: string[];
  includeHeaders?: boolean;
  delimiter?: string;
  // White-label
  customLogo?: string;
  customColors?: Record<string, string>;
  hideWatermark?: boolean;
}

export interface WhiteLabelConfig {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  hideAIBOSBranding?: boolean;
}

// ============================================================================
// Type Exports
// ============================================================================

export type CustomDashboard = typeof customDashboards.$inferSelect;
export type NewCustomDashboard = typeof customDashboards.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
export type CustomMetric = typeof customMetrics.$inferSelect;
export type NewCustomMetric = typeof customMetrics.$inferInsert;
export type FilterPreset = typeof filterPresets.$inferSelect;
export type NewFilterPreset = typeof filterPresets.$inferInsert;
export type DateRangePresetRecord = typeof dateRangePresets.$inferSelect;
export type NewDateRangePreset = typeof dateRangePresets.$inferInsert;
export type UserViewPreference = typeof userViewPreferences.$inferSelect;
export type NewUserViewPreference = typeof userViewPreferences.$inferInsert;
export type ExportJob = typeof exportJobs.$inferSelect;
export type NewExportJob = typeof exportJobs.$inferInsert;
export type ScheduledExport = typeof scheduledExports.$inferSelect;
export type NewScheduledExport = typeof scheduledExports.$inferInsert;
export type DashboardShare = typeof dashboardShares.$inferSelect;
export type NewDashboardShare = typeof dashboardShares.$inferInsert;



