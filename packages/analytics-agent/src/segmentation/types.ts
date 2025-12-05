/**
 * Types for Customer Segmentation
 */

// Segment types
export type SegmentType =
  | 'rfm'           // RFM-based segment
  | 'behavioral'    // Behavior-based
  | 'value'         // Value-based (LTV tiers)
  | 'lifecycle'     // Lifecycle stage
  | 'custom';       // Custom definition

// Predefined RFM segments
export type RFMSegmentName =
  | 'champions'          // Best customers
  | 'loyal_customers'    // Loyal with good value
  | 'potential_loyalists'// Recent with good activity
  | 'new_customers'      // Very recent, low frequency
  | 'promising'          // Recent, low frequency, some value
  | 'need_attention'     // Above average but declining
  | 'about_to_sleep'     // Below average, at risk
  | 'at_risk'            // Used to be good, declining
  | 'cant_lose'          // High value but inactive
  | 'hibernating'        // Long time since purchase
  | 'lost';              // Lost customers

// RFM scores (1-5)
export interface RFMScores {
  recency: number;
  frequency: number;
  monetary: number;
  total: number; // Average or combined score
}

// RFM customer data (from RFM calculator)
export interface CustomerRFM {
  customerId: string;
  customerEmail?: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  scores: RFMScores;
  combinedScore: number;
  segment: RFMSegmentName;
}

// Legacy RFM customer data (for compatibility)
export interface RFMCustomer {
  customerId: string;
  email?: string;
  name?: string;
  scores: RFMScores;
  segment: RFMSegmentName;
  lastPurchaseDate: Date;
  purchaseCount: number;
  totalSpent: number;
  averageOrderValue: number;
}

// Segment definition
export interface SegmentDefinition {
  type: SegmentType;
  rules?: SegmentRule[];
  rfmCriteria?: RFMCriteria;
}

// Segment rule
export interface SegmentRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'contains';
  value: unknown;
  and?: SegmentRule[];
  or?: SegmentRule[];
}

// RFM criteria for segments
export interface RFMCriteria {
  recency?: { min?: number; max?: number };
  frequency?: { min?: number; max?: number };
  monetary?: { min?: number; max?: number };
  combined?: { min?: number; max?: number };
}

// Segment metadata
export interface Segment {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  type: SegmentType;
  definition: SegmentDefinition;
  customerCount: number;
  avgLtv?: number;
  avgOrderValue?: number;
  isActive: boolean;
  lastCalculatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Segment membership
export interface SegmentMembership {
  id: string;
  segmentId: string;
  customerId: string;
  customerType: 'ecommerce' | 'saas';
  score?: number;
  rfmScores?: RFMScores;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Segment comparison
export interface SegmentComparison {
  segments: {
    id: string;
    name: string;
    customerCount: number;
    metrics: {
      avgLtv: number;
      avgFrequency: number;
      avgRecency: number;
      totalRevenue: number;
    };
  }[];
  differences: {
    customerCount: number;
    avgLtv: number;
    avgFrequency: number;
    avgRecency: number;
  };
  insights: string[];
}

// RFM analysis result
export interface RFMAnalysisResult {
  customerCount: number;
  averageScores: RFMScores;
  segmentDistribution: {
    segment: RFMSegmentName;
    count: number;
    percentage: number;
    totalRevenue: number;
    avgRevenue: number;
  }[];
  customers: CustomerRFM[];
  insights: string[];
  recommendations: string[];
}

// Segment builder options
export interface SegmentBuilderOptions {
  workspaceId: string;
  type: SegmentType;
  recencyDays?: number;
  quantiles?: number;
}
