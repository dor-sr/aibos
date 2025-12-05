/**
 * Types for Proactive Insights Engine
 */

// Insight types
export type InsightType = 
  | 'opportunity'    // Growth opportunity detected
  | 'risk'          // Potential issue detected
  | 'highlight'     // Positive trend
  | 'anomaly'       // Statistical anomaly
  | 'recommendation'; // Action recommendation

// Insight categories
export type InsightCategory =
  | 'revenue'
  | 'orders'
  | 'customers'
  | 'products'
  | 'marketing'
  | 'operations'
  | 'churn'
  | 'growth';

// Insight status
export type InsightStatus =
  | 'new'
  | 'viewed'
  | 'acknowledged'
  | 'actioned'
  | 'dismissed'
  | 'expired';

// Insight priority levels
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

// Insight metric data
export interface InsightMetric {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  unit?: string;
}

// Period information
export interface InsightPeriod {
  start: Date;
  end: Date;
  label: string;
  comparisonPeriod?: {
    start: Date;
    end: Date;
    label: string;
  };
}

// Generated insight
export interface GeneratedInsight {
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  explanation?: string;
  impact?: 'high' | 'medium' | 'low';
  recommendedAction?: string;
  recommendations?: string[];
  priority: number; // 1-100
  score: number; // Confidence/importance score
  metrics: {
    primaryMetric: InsightMetric;
    relatedMetrics?: InsightMetric[];
  };
  period: InsightPeriod;
  expiresAt?: Date;
  data?: Record<string, unknown>;
}

// Insight with ID and status
export interface Insight extends GeneratedInsight {
  id: string;
  workspaceId: string;
  status: InsightStatus;
  viewedAt?: Date;
  viewedBy?: string;
  actionedAt?: Date;
  actionedBy?: string;
  expiresAt?: Date;
  deliveredVia?: string[];
  createdAt: Date;
}

// Insight generation request
export interface InsightGenerationRequest {
  workspaceId: string;
  verticalType: 'ecommerce' | 'saas' | 'generic';
  period?: InsightPeriod;
  categories?: InsightCategory[];
  maxInsights?: number;
}

// Insight delivery options
export interface InsightDeliveryOptions {
  email?: boolean;
  slack?: boolean;
  inApp?: boolean;
  push?: boolean;
}

// Opportunity pattern
export interface OpportunityPattern {
  name: string;
  category: InsightCategory;
  condition: (metrics: Record<string, number>) => boolean;
  generateInsight: (metrics: Record<string, number>, period: InsightPeriod) => GeneratedInsight | null;
}

// Risk pattern
export interface RiskPattern {
  name: string;
  category: InsightCategory;
  severity: InsightPriority;
  condition: (metrics: Record<string, number>) => boolean;
  generateInsight: (metrics: Record<string, number>, period: InsightPeriod) => GeneratedInsight | null;
}

// Metric thresholds for detection
export interface MetricThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  direction: 'above' | 'below';
}
