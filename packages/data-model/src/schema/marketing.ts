/**
 * Marketing Data Schema
 * Tables for ad platforms, campaigns, ad sets, ads, and performance tracking
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  integer,
  numeric,
  date,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Enums
export const adPlatformEnum = pgEnum('ad_platform', [
  'meta_ads',
  'google_ads',
  'tiktok_ads',
  'linkedin_ads',
  'twitter_ads',
  'pinterest_ads',
]);

export const adAccountStatusEnum = pgEnum('ad_account_status', [
  'active',
  'disabled',
  'pending_review',
  'suspended',
]);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'active',
  'paused',
  'deleted',
  'archived',
  'draft',
]);

export const campaignObjectiveEnum = pgEnum('campaign_objective', [
  'awareness',
  'traffic',
  'engagement',
  'leads',
  'app_promotion',
  'sales',
  'conversions',
  'video_views',
  'reach',
  'brand_awareness',
  'store_traffic',
]);

export const adSetStatusEnum = pgEnum('ad_set_status', [
  'active',
  'paused',
  'deleted',
  'archived',
  'draft',
]);

export const adStatusEnum = pgEnum('ad_status', [
  'active',
  'paused',
  'deleted',
  'archived',
  'draft',
  'pending_review',
  'rejected',
]);

export const creativeTypeEnum = pgEnum('creative_type', [
  'image',
  'video',
  'carousel',
  'collection',
  'responsive_search',
  'responsive_display',
  'text',
]);

// Ad Accounts
export const adAccounts = pgTable('ad_accounts', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  platform: adPlatformEnum('platform').notNull(),
  platformAccountId: text('platform_account_id').notNull(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('USD'),
  timezone: text('timezone').notNull().default('UTC'),
  status: adAccountStatusEnum('status').notNull().default('active'),
  credentials: jsonb('credentials').$type<AdAccountCredentials>(),
  settings: jsonb('settings').$type<AdAccountSettings>(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Campaigns
export const adCampaigns = pgTable('ad_campaigns', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  adAccountId: text('ad_account_id')
    .notNull()
    .references(() => adAccounts.id, { onDelete: 'cascade' }),
  platform: adPlatformEnum('platform').notNull(),
  platformCampaignId: text('platform_campaign_id').notNull(),
  name: text('name').notNull(),
  status: campaignStatusEnum('status').notNull().default('active'),
  objective: campaignObjectiveEnum('objective'),
  budgetType: text('budget_type'), // 'daily' or 'lifetime'
  budget: numeric('budget', { precision: 12, scale: 2 }),
  budgetRemaining: numeric('budget_remaining', { precision: 12, scale: 2 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  settings: jsonb('settings').$type<CampaignSettings>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Ad Sets (Ad Groups for Google Ads)
export const adSets = pgTable('ad_sets', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => adCampaigns.id, { onDelete: 'cascade' }),
  platform: adPlatformEnum('platform').notNull(),
  platformAdSetId: text('platform_ad_set_id').notNull(),
  name: text('name').notNull(),
  status: adSetStatusEnum('status').notNull().default('active'),
  budgetType: text('budget_type'),
  budget: numeric('budget', { precision: 12, scale: 2 }),
  bidStrategy: text('bid_strategy'),
  bidAmount: numeric('bid_amount', { precision: 12, scale: 4 }),
  targeting: jsonb('targeting').$type<AdSetTargeting>(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Ads
export const ads = pgTable('ads', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  adSetId: text('ad_set_id')
    .notNull()
    .references(() => adSets.id, { onDelete: 'cascade' }),
  platform: adPlatformEnum('platform').notNull(),
  platformAdId: text('platform_ad_id').notNull(),
  name: text('name').notNull(),
  status: adStatusEnum('status').notNull().default('active'),
  creativeType: creativeTypeEnum('creative_type'),
  headline: text('headline'),
  description: text('description'),
  callToAction: text('call_to_action'),
  destinationUrl: text('destination_url'),
  displayUrl: text('display_url'),
  creative: jsonb('creative').$type<AdCreative>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Ad Performance (daily metrics)
export const adPerformance = pgTable('ad_performance', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  adAccountId: text('ad_account_id')
    .notNull()
    .references(() => adAccounts.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id').references(() => adCampaigns.id, { onDelete: 'set null' }),
  adSetId: text('ad_set_id').references(() => adSets.id, { onDelete: 'set null' }),
  adId: text('ad_id').references(() => ads.id, { onDelete: 'set null' }),
  platform: adPlatformEnum('platform').notNull(),
  date: date('date').notNull(),
  // Core metrics
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  spend: numeric('spend', { precision: 12, scale: 2 }).notNull().default('0'),
  // Engagement metrics
  reach: integer('reach').default(0),
  frequency: numeric('frequency', { precision: 8, scale: 4 }),
  engagements: integer('engagements').default(0),
  videoViews: integer('video_views').default(0),
  videoViews25: integer('video_views_25').default(0),
  videoViews50: integer('video_views_50').default(0),
  videoViews75: integer('video_views_75').default(0),
  videoViews100: integer('video_views_100').default(0),
  // Conversion metrics
  conversions: integer('conversions').default(0),
  conversionValue: numeric('conversion_value', { precision: 12, scale: 2 }).default('0'),
  addToCart: integer('add_to_cart').default(0),
  purchases: integer('purchases').default(0),
  purchaseValue: numeric('purchase_value', { precision: 12, scale: 2 }).default('0'),
  leads: integer('leads').default(0),
  // Calculated metrics (stored for performance)
  ctr: numeric('ctr', { precision: 8, scale: 4 }), // Click-through rate
  cpc: numeric('cpc', { precision: 8, scale: 4 }), // Cost per click
  cpm: numeric('cpm', { precision: 8, scale: 4 }), // Cost per 1000 impressions
  cpa: numeric('cpa', { precision: 12, scale: 4 }), // Cost per acquisition
  roas: numeric('roas', { precision: 8, scale: 4 }), // Return on ad spend
  // Attribution
  attributionWindow: text('attribution_window'),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Keyword Performance (Google Ads specific)
export const keywordPerformance = pgTable('keyword_performance', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  adAccountId: text('ad_account_id')
    .notNull()
    .references(() => adAccounts.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id').references(() => adCampaigns.id, { onDelete: 'set null' }),
  adSetId: text('ad_set_id').references(() => adSets.id, { onDelete: 'set null' }),
  keyword: text('keyword').notNull(),
  matchType: text('match_type'), // 'exact', 'phrase', 'broad'
  date: date('date').notNull(),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  spend: numeric('spend', { precision: 12, scale: 2 }).notNull().default('0'),
  conversions: integer('conversions').default(0),
  conversionValue: numeric('conversion_value', { precision: 12, scale: 2 }).default('0'),
  qualityScore: integer('quality_score'),
  expectedCtr: text('expected_ctr'),
  adRelevance: text('ad_relevance'),
  landingPageExperience: text('landing_page_experience'),
  averagePosition: numeric('average_position', { precision: 4, scale: 2 }),
  ctr: numeric('ctr', { precision: 8, scale: 4 }),
  cpc: numeric('cpc', { precision: 8, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Generated Creatives
export const generatedCreatives = pgTable('generated_creatives', {
  id: text('id').primaryKey().notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'headline', 'description', 'ad_copy', 'email_subject'
  platform: adPlatformEnum('platform'),
  content: text('content').notNull(),
  prompt: text('prompt'),
  metadata: jsonb('metadata').$type<GeneratedCreativeMetadata>(),
  rating: integer('rating'), // User feedback 1-5
  isUsed: boolean('is_used').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type definitions for JSONB columns
export interface AdAccountCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  apiKey?: string;
  developerToken?: string;
  clientId?: string;
  clientCustomerId?: string;
  managerId?: string;
  [key: string]: unknown;
}

export interface AdAccountSettings {
  syncInterval?: number;
  syncHistory?: boolean;
  attributionWindow?: string;
  [key: string]: unknown;
}

export interface CampaignSettings {
  targetCpa?: number;
  targetRoas?: number;
  optimizationGoal?: string;
  [key: string]: unknown;
}

export interface AdSetTargeting {
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  lookalikes?: string[];
  placements?: string[];
  devices?: string[];
  keywords?: string[];
  [key: string]: unknown;
}

export interface AdCreative {
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  images?: Array<{ url: string; hash?: string }>;
  headlines?: string[];
  descriptions?: string[];
  [key: string]: unknown;
}

export interface GeneratedCreativeMetadata {
  product?: string;
  audience?: string;
  tone?: string;
  originalPrompt?: string;
  model?: string;
  [key: string]: unknown;
}

// Infer types from schema
export type AdAccount = typeof adAccounts.$inferSelect;
export type NewAdAccount = typeof adAccounts.$inferInsert;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type NewAdCampaign = typeof adCampaigns.$inferInsert;
export type AdSet = typeof adSets.$inferSelect;
export type NewAdSet = typeof adSets.$inferInsert;
export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;
export type AdPerformanceRecord = typeof adPerformance.$inferSelect;
export type NewAdPerformanceRecord = typeof adPerformance.$inferInsert;
export type KeywordPerformanceRecord = typeof keywordPerformance.$inferSelect;
export type NewKeywordPerformanceRecord = typeof keywordPerformance.$inferInsert;
export type GeneratedCreative = typeof generatedCreatives.$inferSelect;
export type NewGeneratedCreative = typeof generatedCreatives.$inferInsert;
