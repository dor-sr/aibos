import type { VerticalType } from '@aibos/core';

/**
 * Marketing Agent configuration
 */
export interface MarketingAgentConfig {
  workspaceId: string;
  verticalType: VerticalType;
  connectedChannels: MarketingChannel[];
  currency?: string;
  timezone?: string;
}

/**
 * Supported marketing channels
 */
export type MarketingChannel =
  | 'meta_ads'
  | 'google_ads'
  | 'tiktok_ads'
  | 'linkedin_ads'
  | 'email'
  | 'sms';

/**
 * Channel performance data
 */
export interface ChannelPerformance {
  channel: MarketingChannel;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpa: number;
  period: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Campaign performance data
 */
export interface CampaignPerformance {
  id: string;
  name: string;
  channel: MarketingChannel;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpc: number;
  ctr: number;
  cpa: number;
  period: string;
}

/**
 * Marketing suggestion/recommendation
 */
export interface MarketingSuggestion {
  id: string;
  type: 'budget' | 'creative' | 'targeting' | 'campaign' | 'optimization' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  channel?: MarketingChannel;
  campaignId?: string;
  campaignName?: string;
  action?: string;
  metrics?: {
    currentValue?: number;
    projectedValue?: number;
    changePercent?: number;
  };
  createdAt: Date;
}

/**
 * Creative asset request
 */
export interface CreativeRequest {
  type: 'ad_copy' | 'headline' | 'description' | 'email_subject' | 'cta';
  channel?: MarketingChannel;
  product?: string;
  audience?: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly' | 'playful';
  style?: 'short' | 'medium' | 'long';
  keywords?: string[];
  count?: number;
}

/**
 * Generated creative asset
 */
export interface CreativeAsset {
  id: string;
  type: string;
  content: string;
  channel?: MarketingChannel;
  metadata?: {
    characterCount?: number;
    keywords?: string[];
    tone?: string;
  };
  createdAt: Date;
}

/**
 * Marketing metrics summary
 */
export interface MarketingMetricsSummary {
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  overallRoas: number;
  overallCpc: number;
  overallCpm: number;
  overallCtr: number;
  overallCpa: number;
  spendChange: number;
  revenueChange: number;
  roasChange: number;
  topPerformingChannel?: MarketingChannel;
  worstPerformingChannel?: MarketingChannel;
  period: string;
}

/**
 * Budget allocation recommendation
 */
export interface BudgetAllocation {
  channel: MarketingChannel;
  currentBudget: number;
  recommendedBudget: number;
  changePercent: number;
  reason: string;
  projectedRoas: number;
}

/**
 * Creative fatigue detection
 */
export interface CreativeFatigue {
  adId: string;
  adName: string;
  channel: MarketingChannel;
  campaign: string;
  daysSinceCreation: number;
  ctrDecline: number;
  frequencyIncrease: number;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

/**
 * Marketing NLQ Result
 */
export interface MarketingNLQResult {
  success: boolean;
  intent?: MarketingIntentType;
  answer: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  error?: string;
}

/**
 * Marketing intent types
 */
export type MarketingIntentType =
  | 'performance_overview'
  | 'channel_performance'
  | 'campaign_performance'
  | 'spend_analysis'
  | 'roas_analysis'
  | 'cpc_analysis'
  | 'conversion_analysis'
  | 'budget_recommendation'
  | 'creative_fatigue'
  | 'top_performers'
  | 'underperformers'
  | 'comparison'
  | 'trend_analysis'
  | 'unknown';
