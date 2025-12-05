/**
 * Types for Predictive Analytics
 */

// Prediction types
export type PredictionType =
  | 'churn_risk'
  | 'ltv_forecast'
  | 'demand_forecast'
  | 'revenue_forecast'
  | 'next_purchase';

// Risk levels
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Prediction factor
export interface PredictionFactor {
  name: string;
  importance: number; // 0-1
  value?: unknown;
  direction?: 'positive' | 'negative';
}

// Customer churn prediction
export interface ChurnPrediction {
  customerId: string;
  customerEmail?: string;
  churnProbability: number; // 0-1
  riskLevel: RiskLevel;
  predictedChurnDate?: Date;
  daysSinceLastActivity: number;
  lifetimeValue: number;
  factors: PredictionFactor[];
  recommendedActions: string[];
}

// Churn analysis result
export interface ChurnAnalysisResult {
  totalCustomers: number;
  atRiskCount: number;
  atRiskPercentage: number;
  atRiskRevenue: number;
  byRiskLevel: {
    level: RiskLevel;
    count: number;
    percentage: number;
    avgLtv: number;
  }[];
  predictions: ChurnPrediction[];
  insights: string[];
  recommendations: string[];
}

// LTV prediction
export interface LTVPrediction {
  customerId: string;
  currentLtv: number;
  predictedLtv: number;
  confidence: number;
  predictionPeriodMonths: number;
  growthPotential: number;
  factors: PredictionFactor[];
}

// Forecast data point
export interface ForecastDataPoint {
  date: Date;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

// Revenue forecast
export interface RevenueForecast {
  periodStart: Date;
  periodEnd: Date;
  currentRevenue: number;
  predictedRevenue: number;
  growthRate: number;
  confidence: number;
  dataPoints: ForecastDataPoint[];
  factors: PredictionFactor[];
  risks: string[];
  opportunities: string[];
}

// Demand forecast
export interface DemandForecast {
  productId?: string;
  productName?: string;
  periodStart: Date;
  periodEnd: Date;
  currentDemand: number;
  predictedDemand: number;
  confidence: number;
  dataPoints: ForecastDataPoint[];
  seasonalityFactor: number;
  trendDirection: 'up' | 'down' | 'stable';
}

// Predictor options
export interface PredictorOptions {
  lookbackDays?: number;
  forecastDays?: number;
  confidenceLevel?: number;
  inactivityThresholdDays?: number;
}
