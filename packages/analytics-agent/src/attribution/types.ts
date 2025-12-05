/**
 * Types for Attribution Modeling
 */

// Attribution model types
export type AttributionModel =
  | 'first_touch'    // 100% to first touchpoint
  | 'last_touch'     // 100% to last touchpoint
  | 'linear'         // Equal credit to all touchpoints
  | 'time_decay'     // More credit to recent touchpoints
  | 'position_based' // 40% first, 40% last, 20% middle
  | 'data_driven';   // ML-based attribution

// Marketing channels
export type MarketingChannel =
  | 'direct'
  | 'organic'
  | 'paid_search'
  | 'paid_social'
  | 'social'
  | 'email'
  | 'referral'
  | 'affiliate'
  | 'display'
  | 'other';

// Touchpoint in customer journey
export interface Touchpoint {
  id: string;
  customerId: string;
  orderId?: string;
  channel: MarketingChannel;
  source?: string; // e.g., google, facebook
  medium?: string; // e.g., cpc, organic
  campaign?: string;
  content?: string; // Ad content identifier
  landingPage?: string;
  touchpointOrder?: number;
  isFirstTouch?: boolean;
  isLastTouch?: boolean;
  timestamp: Date;
  pageUrl?: string;
  referrerUrl?: string;
  metadata?: Record<string, unknown>;
}

// Customer journey
export interface CustomerJourney {
  customerId: string;
  touchpoints: Touchpoint[];
  conversion?: {
    orderId: string;
    revenue: number;
    timestamp: Date;
  };
  converted: boolean;
  conversionValue: number;
  journeyDurationDays: number;
}

// Attribution result per channel
export interface ChannelAttribution {
  channel: MarketingChannel;
  source?: string;
  conversions: number;
  revenue: number;
  attributedConversions: number; // Fractional
  attributedRevenue: number;
  contribution: number; // Percentage
  avgTouchpointsToConversion: number;
}

// Attribution per-customer result
export interface CustomerAttributionResult {
  customerId: string;
  conversionValue: number;
  touchpointCount: number;
  channelAttributions: {
    channel: MarketingChannel;
    touchpointId: string;
    contribution: number;
    revenue: number;
    position: number;
    timestamp: Date;
  }[];
  model: AttributionModel;
}

// Attribution analysis result
export interface AttributionResult {
  model: AttributionModel;
  periodStart: Date;
  periodEnd: Date;
  totalConversions: number;
  totalRevenue: number;
  byChannel: ChannelAttribution[];
  insights: string[];
}

// Extended channel attribution with percentage
export interface ExtendedChannelAttribution extends ChannelAttribution {
  percentageOfTotal: number;
  touchpoints: number;
  avgTouchpointsPerConversion: number;
}

// Multi-model comparison
export interface AttributionComparison {
  models: AttributionModel[];
  results: Map<AttributionModel, AttributionResult>;
  channelVariance: {
    channel: MarketingChannel;
    minAttribution: number;
    maxAttribution: number;
    variance: number;
  }[];
  recommendations: string[];
}

// Model comparison result for calculator
export interface ModelComparison {
  modelResults: {
    model: AttributionModel;
    channelAttribution: ExtendedChannelAttribution[];
  }[];
  channelVariance: { channel: string; variance: number }[];
  insights: string[];
}

// Attribution calculator options
export interface AttributionOptions {
  model?: AttributionModel;
  lookbackDays?: number;
  timeDecayHalfLife?: number; // Days for time decay
  positionWeights?: {
    first: number;
    middle: number;
    last: number;
  };
}
