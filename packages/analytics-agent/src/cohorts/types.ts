/**
 * Types for Cohort Analysis
 */

// Cohort types
export type CohortType =
  | 'acquisition'       // By acquisition date
  | 'first_purchase'    // By first purchase date
  | 'subscription_start' // By subscription start date
  | 'custom';           // Custom cohort definition

// Cohort granularity
export type CohortGranularity = 'day' | 'week' | 'month' | 'quarter';

// Cohort definition
export interface CohortDefinition {
  type: CohortType;
  dateField: string;
  startDate: Date;
  endDate: Date;
  granularity: CohortGranularity;
  filters?: CohortFilter[];
}

// Cohort filter
export interface CohortFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: unknown;
}

// Cohort data
export interface Cohort {
  id: string;
  workspaceId: string;
  name: string;
  type: CohortType;
  startDate: Date;
  endDate: Date;
  customerCount: number;
  definition?: CohortDefinition;
  createdAt: Date;
  updatedAt: Date;
}

// Cohort customer
export interface CohortCustomer {
  customerId: string;
  cohortId: string;
  acquisitionDate: Date;
  firstPurchaseDate?: Date;
  totalRevenue: number;
  orderCount: number;
  isActive: boolean;
  lastActivityDate?: Date;
}

// Retention data for a period
export interface RetentionPeriod {
  period: number; // 0 = cohort period, 1 = first period after, etc.
  periodLabel: string;
  activeCustomers: number;
  totalCustomers: number;
  retentionRate: number;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  cumulativeLtv: number;
}

// Complete retention curve
export interface RetentionCurve {
  cohortId: string;
  cohortName: string;
  cohortStartDate: Date;
  customerCount: number;
  periods: RetentionPeriod[];
}

// Retention matrix (multiple cohorts)
export interface RetentionMatrix {
  cohorts: {
    name: string;
    startDate: Date;
    customerCount: number;
    retentionByPeriod: number[]; // Array of retention rates
  }[];
  periodLabels: string[];
  averageRetention: number[];
}

// LTV calculation result
export interface LTVCalculation {
  cohortId: string;
  cohortName: string;
  customerCount: number;
  averageLtv: number;
  medianLtv: number;
  ltvDistribution: {
    percentile: number;
    value: number;
  }[];
  ltvByPeriod: {
    period: number;
    cumulativeLtv: number;
    incrementalLtv: number;
  }[];
  projectedLtv?: number; // Predicted future LTV
}

// Cohort comparison
export interface CohortComparison {
  cohorts: {
    id: string;
    name: string;
    customerCount: number;
    averageLtv: number;
    retentionAt30Days: number;
    retentionAt60Days: number;
    retentionAt90Days: number;
  }[];
  bestPerforming: string;
  worstPerforming: string;
  insights: string[];
}

// Cohort builder options
export interface CohortBuilderOptions {
  workspaceId: string;
  type: CohortType;
  granularity: CohortGranularity;
  startDate?: Date;
  endDate?: Date;
  lookbackPeriods?: number;
  filters?: CohortFilter[];
}

// Retention calculation options
export interface RetentionCalculationOptions {
  maxPeriods?: number;
  includeRevenue?: boolean;
  activityDefinition?: 'purchase' | 'login' | 'any';
}
