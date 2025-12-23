/**
 * Google Analytics 4 Connector Types
 */

// GA4 API Types
export interface GA4Dimension {
  name: string;
}

export interface GA4Metric {
  name: string;
}

export interface GA4DateRange {
  startDate: string;
  endDate: string;
}

export interface GA4FilterExpression {
  filter?: {
    fieldName: string;
    stringFilter?: {
      matchType: 'EXACT' | 'BEGINS_WITH' | 'ENDS_WITH' | 'CONTAINS' | 'FULL_REGEXP' | 'PARTIAL_REGEXP';
      value: string;
      caseSensitive?: boolean;
    };
    inListFilter?: {
      values: string[];
      caseSensitive?: boolean;
    };
    numericFilter?: {
      operation: 'EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
      value: {
        int64Value?: string;
        doubleValue?: number;
      };
    };
    betweenFilter?: {
      fromValue: { int64Value?: string; doubleValue?: number };
      toValue: { int64Value?: string; doubleValue?: number };
    };
  };
  andGroup?: { expressions: GA4FilterExpression[] };
  orGroup?: { expressions: GA4FilterExpression[] };
  notExpression?: GA4FilterExpression;
}

export interface GA4RunReportRequest {
  property: string;
  dimensions: GA4Dimension[];
  metrics: GA4Metric[];
  dateRanges: GA4DateRange[];
  dimensionFilter?: GA4FilterExpression;
  metricFilter?: GA4FilterExpression;
  offset?: number;
  limit?: number;
  orderBys?: Array<{
    dimension?: { dimensionName: string; orderType?: 'ALPHANUMERIC' | 'CASE_INSENSITIVE_ALPHANUMERIC' | 'NUMERIC' };
    metric?: { metricName: string };
    desc?: boolean;
  }>;
  currencyCode?: string;
  keepEmptyRows?: boolean;
  returnPropertyQuota?: boolean;
}

export interface GA4DimensionValue {
  value: string;
  oneValue?: string;
}

export interface GA4MetricValue {
  value: string;
}

export interface GA4Row {
  dimensionValues: GA4DimensionValue[];
  metricValues: GA4MetricValue[];
}

export interface GA4DimensionHeader {
  name: string;
}

export interface GA4MetricHeader {
  name: string;
  type: string;
}

export interface GA4PropertyQuota {
  tokensPerDay?: { remaining: number; consumed: number };
  tokensPerHour?: { remaining: number; consumed: number };
  concurrentRequests?: { remaining: number };
  serverErrorsPerProjectPerHour?: { remaining: number };
  potentiallyThresholdedRequestsPerHour?: { remaining: number };
  tokensPerProjectPerHour?: { remaining: number; consumed: number };
}

export interface GA4RunReportResponse {
  dimensionHeaders: GA4DimensionHeader[];
  metricHeaders: GA4MetricHeader[];
  rows: GA4Row[];
  totals?: GA4Row[];
  maximums?: GA4Row[];
  minimums?: GA4Row[];
  rowCount?: number;
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
  propertyQuota?: GA4PropertyQuota;
  kind?: string;
}

// OAuth Types
export interface GA4OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GA4TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// Client Configuration
export interface GA4ClientConfig {
  accessToken: string;
  refreshToken?: string;
  propertyId: string;
}

// Normalized Data Types
export interface GA4Session {
  id: string;
  workspaceId: string;
  propertyId: string;
  date: Date;
  sessionId?: string;
  userId?: string;
  sessionCount: number;
  engagedSessions: number;
  engagementRate: number;
  averageSessionDuration: number;
  bounceRate: number;
  screenPageViews: number;
  country?: string;
  city?: string;
  deviceCategory?: string;
  browser?: string;
  operatingSystem?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GA4Event {
  id: string;
  workspaceId: string;
  propertyId: string;
  date: Date;
  eventName: string;
  eventCount: number;
  eventCountPerUser: number;
  totalRevenue: number;
  country?: string;
  deviceCategory?: string;
  pagePath?: string;
  pageTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GA4TrafficSource {
  id: string;
  workspaceId: string;
  propertyId: string;
  date: Date;
  sessionSource: string;
  sessionMedium: string;
  sessionCampaign?: string;
  sessions: number;
  newUsers: number;
  totalUsers: number;
  engagedSessions: number;
  bounceRate: number;
  conversions: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GA4Conversion {
  id: string;
  workspaceId: string;
  propertyId: string;
  date: Date;
  eventName: string;
  conversions: number;
  totalConversionValue: number;
  sessionSource?: string;
  sessionMedium?: string;
  landingPage?: string;
  country?: string;
  deviceCategory?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GA4PageView {
  id: string;
  workspaceId: string;
  propertyId: string;
  date: Date;
  pagePath: string;
  pageTitle: string;
  screenPageViews: number;
  uniquePageviews: number;
  averageTimeOnPage: number;
  entrances: number;
  exits: number;
  bounceRate: number;
  createdAt: Date;
  updatedAt: Date;
}

// Sync Options
export interface GA4SyncOptions {
  startDate?: Date;
  endDate?: Date;
  dimensionFilter?: GA4FilterExpression;
}

// Available dimensions and metrics for reference
export const GA4_DIMENSIONS = {
  // Time
  date: 'date',
  dateHour: 'dateHour',
  dateHourMinute: 'dateHourMinute',
  
  // User
  userId: 'userId',
  newVsReturning: 'newVsReturning',
  
  // Session
  sessionSource: 'sessionSource',
  sessionMedium: 'sessionMedium',
  sessionCampaign: 'sessionCampaignName',
  sessionDefaultChannelGroup: 'sessionDefaultChannelGroup',
  
  // Traffic source
  firstUserSource: 'firstUserSource',
  firstUserMedium: 'firstUserMedium',
  firstUserCampaign: 'firstUserCampaignName',
  
  // Page
  pagePath: 'pagePath',
  pageTitle: 'pageTitle',
  landingPage: 'landingPage',
  
  // Geography
  country: 'country',
  city: 'city',
  region: 'region',
  
  // Device
  deviceCategory: 'deviceCategory',
  browser: 'browser',
  operatingSystem: 'operatingSystem',
  
  // Event
  eventName: 'eventName',
} as const;

export const GA4_METRICS = {
  // User metrics
  totalUsers: 'totalUsers',
  newUsers: 'newUsers',
  activeUsers: 'activeUsers',
  
  // Session metrics
  sessions: 'sessions',
  engagedSessions: 'engagedSessions',
  sessionsPerUser: 'sessionsPerUser',
  engagementRate: 'engagementRate',
  bounceRate: 'bounceRate',
  averageSessionDuration: 'averageSessionDuration',
  
  // Page metrics
  screenPageViews: 'screenPageViews',
  screenPageViewsPerSession: 'screenPageViewsPerSession',
  userEngagementDuration: 'userEngagementDuration',
  
  // Event metrics
  eventCount: 'eventCount',
  eventCountPerUser: 'eventCountPerUser',
  conversions: 'conversions',
  
  // Revenue metrics
  totalRevenue: 'totalRevenue',
  purchaseRevenue: 'purchaseRevenue',
  ecommercePurchases: 'ecommercePurchases',
  
  // Advertising metrics
  publisherAdClicks: 'publisherAdClicks',
  publisherAdImpressions: 'publisherAdImpressions',
} as const;

export type GA4DimensionName = typeof GA4_DIMENSIONS[keyof typeof GA4_DIMENSIONS];
export type GA4MetricName = typeof GA4_METRICS[keyof typeof GA4_METRICS];






