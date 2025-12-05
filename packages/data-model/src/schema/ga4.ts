/**
 * Google Analytics 4 Database Schema
 */

import { pgTable, text, timestamp, date, integer, real, jsonb } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { connectors } from './connectors';

/**
 * GA4 Sessions - Aggregated session data by day and dimensions
 */
export const ga4Sessions = pgTable('ga4_sessions', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  country: text('country'),
  city: text('city'),
  deviceCategory: text('device_category'),
  browser: text('browser'),
  operatingSystem: text('operating_system'),
  
  // Metrics
  sessions: integer('sessions').notNull().default(0),
  engagedSessions: integer('engaged_sessions').notNull().default(0),
  engagementRate: real('engagement_rate').default(0),
  averageSessionDuration: real('average_session_duration').default(0),
  bounceRate: real('bounce_rate').default(0),
  screenPageViews: integer('screen_page_views').notNull().default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * GA4 Pageviews - Page-level analytics
 */
export const ga4Pageviews = pgTable('ga4_pageviews', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  pagePath: text('page_path').notNull(),
  pageTitle: text('page_title'),
  
  // Metrics
  screenPageViews: integer('screen_page_views').notNull().default(0),
  activeUsers: integer('active_users').notNull().default(0),
  averageSessionDuration: real('average_session_duration').default(0),
  engagementRate: real('engagement_rate').default(0),
  bounceRate: real('bounce_rate').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * GA4 Events - Event tracking data
 */
export const ga4Events = pgTable('ga4_events', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  eventName: text('event_name').notNull(),
  country: text('country'),
  deviceCategory: text('device_category'),
  pagePath: text('page_path'),
  
  // Metrics
  eventCount: integer('event_count').notNull().default(0),
  eventCountPerUser: real('event_count_per_user').default(0),
  totalRevenue: real('total_revenue').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * GA4 Traffic Sources - Traffic source attribution data
 */
export const ga4TrafficSources = pgTable('ga4_traffic_sources', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  sessionSource: text('session_source').notNull(),
  sessionMedium: text('session_medium').notNull(),
  sessionCampaign: text('session_campaign'),
  
  // Metrics
  sessions: integer('sessions').notNull().default(0),
  newUsers: integer('new_users').notNull().default(0),
  totalUsers: integer('total_users').notNull().default(0),
  engagedSessions: integer('engaged_sessions').notNull().default(0),
  bounceRate: real('bounce_rate').default(0),
  conversions: integer('conversions').notNull().default(0),
  totalRevenue: real('total_revenue').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * GA4 Conversions - Conversion event data
 */
export const ga4Conversions = pgTable('ga4_conversions', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  eventName: text('event_name').notNull(),
  sessionSource: text('session_source'),
  sessionMedium: text('session_medium'),
  landingPage: text('landing_page'),
  country: text('country'),
  deviceCategory: text('device_category'),
  
  // Metrics
  conversions: integer('conversions').notNull().default(0),
  totalRevenue: real('total_revenue').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * GA4 Channels - Channel performance data
 */
export const ga4Channels = pgTable('ga4_channels', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  channelGroup: text('channel_group').notNull(),
  
  // Metrics
  sessions: integer('sessions').notNull().default(0),
  newUsers: integer('new_users').notNull().default(0),
  totalUsers: integer('total_users').notNull().default(0),
  engagementRate: real('engagement_rate').default(0),
  bounceRate: real('bounce_rate').default(0),
  conversions: integer('conversions').notNull().default(0),
  totalRevenue: real('total_revenue').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * GA4 User Acquisition - First-touch attribution
 */
export const ga4UserAcquisition = pgTable('ga4_user_acquisition', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  connectorId: text('connector_id')
    .notNull()
    .references(() => connectors.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull(),
  date: date('date').notNull(),
  
  // Dimensions
  firstUserSource: text('first_user_source').notNull(),
  firstUserMedium: text('first_user_medium').notNull(),
  firstUserCampaign: text('first_user_campaign'),
  
  // Metrics
  newUsers: integer('new_users').notNull().default(0),
  totalUsers: integer('total_users').notNull().default(0),
  sessions: integer('sessions').notNull().default(0),
  engagedSessions: integer('engaged_sessions').notNull().default(0),
  totalRevenue: real('total_revenue').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports
export type GA4Session = typeof ga4Sessions.$inferSelect;
export type NewGA4Session = typeof ga4Sessions.$inferInsert;

export type GA4Pageview = typeof ga4Pageviews.$inferSelect;
export type NewGA4Pageview = typeof ga4Pageviews.$inferInsert;

export type GA4Event = typeof ga4Events.$inferSelect;
export type NewGA4Event = typeof ga4Events.$inferInsert;

export type GA4TrafficSource = typeof ga4TrafficSources.$inferSelect;
export type NewGA4TrafficSource = typeof ga4TrafficSources.$inferInsert;

export type GA4Conversion = typeof ga4Conversions.$inferSelect;
export type NewGA4Conversion = typeof ga4Conversions.$inferInsert;

export type GA4Channel = typeof ga4Channels.$inferSelect;
export type NewGA4Channel = typeof ga4Channels.$inferInsert;

export type GA4UserAcquisition = typeof ga4UserAcquisition.$inferSelect;
export type NewGA4UserAcquisition = typeof ga4UserAcquisition.$inferInsert;


