import type { VerticalType } from '@aibos/core';

/**
 * Marketing Agent configuration
 */
export interface MarketingAgentConfig {
  workspaceId: string;
  verticalType: VerticalType;
  connectedChannels: MarketingChannel[];
}

/**
 * Supported marketing channels
 */
export type MarketingChannel = 
  | 'meta_ads'
  | 'google_ads'
  | 'tiktok_ads'
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
  period: string;
}

/**
 * Marketing suggestion
 */
export interface MarketingSuggestion {
  id: string;
  type: 'budget' | 'creative' | 'targeting' | 'campaign';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  channel?: MarketingChannel;
  action?: string;
}

/**
 * Creative asset request
 */
export interface CreativeRequest {
  type: 'ad_copy' | 'headline' | 'description' | 'email_subject';
  channel: MarketingChannel;
  product?: string;
  audience?: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
  count?: number;
}

/**
 * Generated creative asset
 */
export interface CreativeAsset {
  id: string;
  type: string;
  content: string;
  channel: MarketingChannel;
  createdAt: Date;
}

