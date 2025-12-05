/**
 * Churn Predictor
 * 
 * Predicts customer churn risk based on behavioral patterns.
 */

import { createLogger } from '@aibos/core';
import type {
  ChurnPrediction,
  ChurnAnalysisResult,
  RiskLevel,
  PredictionFactor,
  PredictorOptions,
} from './types';

const logger = createLogger('predictive:churn');

const DEFAULT_OPTIONS: PredictorOptions = {
  lookbackDays: 365,
  inactivityThresholdDays: 90,
};

// Customer data for churn prediction
export interface CustomerChurnData {
  customerId: string;
  email?: string;
  daysSinceLastPurchase: number;
  daysSinceFirstPurchase: number;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  avgDaysBetweenOrders: number;
  recentOrderTrend: number; // Positive = increasing, negative = decreasing
  supportTickets?: number;
  emailEngagement?: number; // Open rate
}

/**
 * Churn Predictor class
 */
export class ChurnPredictor {
  private options: PredictorOptions;

  constructor(options: PredictorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Analyze churn risk for a list of customers
   */
  analyze(customers: CustomerChurnData[]): ChurnAnalysisResult {
    if (customers.length === 0) {
      return this.emptyResult();
    }

    const predictions: ChurnPrediction[] = [];
    const riskCounts: Record<RiskLevel, { count: number; totalLtv: number }> = {
      low: { count: 0, totalLtv: 0 },
      medium: { count: 0, totalLtv: 0 },
      high: { count: 0, totalLtv: 0 },
      critical: { count: 0, totalLtv: 0 },
    };

    for (const customer of customers) {
      const prediction = this.predictChurn(customer);
      predictions.push(prediction);
      
      riskCounts[prediction.riskLevel].count++;
      riskCounts[prediction.riskLevel].totalLtv += customer.totalSpent;
    }

    // Calculate at-risk metrics
    const atRiskCount = riskCounts.high.count + riskCounts.critical.count;
    const atRiskRevenue = riskCounts.high.totalLtv + riskCounts.critical.totalLtv;

    // Build risk level distribution
    const byRiskLevel = Object.entries(riskCounts).map(([level, data]) => ({
      level: level as RiskLevel,
      count: data.count,
      percentage: (data.count / customers.length) * 100,
      avgLtv: data.count > 0 ? data.totalLtv / data.count : 0,
    }));

    // Sort predictions by risk (highest first)
    predictions.sort((a, b) => b.churnProbability - a.churnProbability);

    // Generate insights and recommendations
    const insights = this.generateInsights(byRiskLevel, atRiskCount, customers.length);
    const recommendations = this.generateRecommendations(predictions);

    logger.info('Churn analysis complete', {
      totalCustomers: customers.length,
      atRiskCount,
    });

    return {
      totalCustomers: customers.length,
      atRiskCount,
      atRiskPercentage: (atRiskCount / customers.length) * 100,
      atRiskRevenue,
      byRiskLevel,
      predictions,
      insights,
      recommendations,
    };
  }

  /**
   * Predict churn for a single customer
   */
  predictChurn(customer: CustomerChurnData): ChurnPrediction {
    const factors = this.calculateFactors(customer);
    const churnProbability = this.calculateChurnProbability(factors);
    const riskLevel = this.determineRiskLevel(churnProbability);
    const recommendedActions = this.getRecommendedActions(riskLevel, factors);

    // Estimate churn date
    let predictedChurnDate: Date | undefined;
    if (riskLevel !== 'low') {
      const daysToChurn = Math.max(30, Math.round((1 - churnProbability) * 90));
      predictedChurnDate = new Date();
      predictedChurnDate.setDate(predictedChurnDate.getDate() + daysToChurn);
    }

    return {
      customerId: customer.customerId,
      customerEmail: customer.email,
      churnProbability,
      riskLevel,
      predictedChurnDate,
      daysSinceLastActivity: customer.daysSinceLastPurchase,
      lifetimeValue: customer.totalSpent,
      factors,
      recommendedActions,
    };
  }

  /**
   * Calculate prediction factors
   */
  private calculateFactors(customer: CustomerChurnData): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const inactivityThreshold = this.options.inactivityThresholdDays || 90;

    // Recency factor
    const recencyScore = Math.min(1, customer.daysSinceLastPurchase / (inactivityThreshold * 2));
    factors.push({
      name: 'recency',
      importance: 0.35,
      value: customer.daysSinceLastPurchase,
      direction: customer.daysSinceLastPurchase > inactivityThreshold ? 'negative' : 'positive',
    });

    // Frequency factor
    const expectedOrders = customer.daysSinceFirstPurchase / 30; // Expected monthly
    const frequencyRatio = customer.totalOrders / Math.max(1, expectedOrders);
    factors.push({
      name: 'frequency',
      importance: 0.25,
      value: frequencyRatio,
      direction: frequencyRatio < 0.5 ? 'negative' : 'positive',
    });

    // Order trend factor
    factors.push({
      name: 'order_trend',
      importance: 0.2,
      value: customer.recentOrderTrend,
      direction: customer.recentOrderTrend < 0 ? 'negative' : 'positive',
    });

    // Engagement factor (if available)
    if (customer.emailEngagement !== undefined) {
      factors.push({
        name: 'email_engagement',
        importance: 0.1,
        value: customer.emailEngagement,
        direction: customer.emailEngagement < 0.2 ? 'negative' : 'positive',
      });
    }

    // Support interaction factor
    if (customer.supportTickets !== undefined && customer.supportTickets > 3) {
      factors.push({
        name: 'support_issues',
        importance: 0.1,
        value: customer.supportTickets,
        direction: 'negative',
      });
    }

    return factors;
  }

  /**
   * Calculate churn probability from factors
   */
  private calculateChurnProbability(factors: PredictionFactor[]): number {
    let score = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      totalWeight += factor.importance;
      
      // Convert factor to churn contribution
      let contribution = 0;
      if (factor.direction === 'negative') {
        // Negative factors increase churn probability
        if (typeof factor.value === 'number') {
          // Normalize based on factor
          if (factor.name === 'recency') {
            contribution = Math.min(1, factor.value / 180); // Max at 180 days
          } else if (factor.name === 'frequency') {
            contribution = Math.max(0, 1 - factor.value); // Low frequency = high churn
          } else if (factor.name === 'order_trend') {
            contribution = Math.min(1, Math.abs(factor.value)); // Negative trend
          } else {
            contribution = 0.5;
          }
        } else {
          contribution = 0.5;
        }
      } else {
        // Positive factors decrease churn probability
        contribution = 0;
      }

      score += contribution * factor.importance;
    }

    // Normalize score
    const normalizedScore = totalWeight > 0 ? score / totalWeight : 0.5;
    
    // Apply sigmoid-like transformation for more realistic probabilities
    return Math.min(0.99, Math.max(0.01, normalizedScore));
  }

  /**
   * Determine risk level from probability
   */
  private determineRiskLevel(probability: number): RiskLevel {
    if (probability >= 0.8) return 'critical';
    if (probability >= 0.6) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Get recommended actions for customer
   */
  private getRecommendedActions(riskLevel: RiskLevel, factors: PredictionFactor[]): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('Immediate personal outreach recommended');
        actions.push('Offer significant incentive or discount');
        actions.push('Schedule customer success call');
        break;
      case 'high':
        actions.push('Send win-back campaign');
        actions.push('Offer loyalty discount');
        actions.push('Request feedback survey');
        break;
      case 'medium':
        actions.push('Include in re-engagement email sequence');
        actions.push('Highlight new products or features');
        break;
      case 'low':
        actions.push('Continue standard engagement');
        actions.push('Consider for loyalty program if eligible');
        break;
    }

    // Add factor-specific recommendations
    const recencyFactor = factors.find((f) => f.name === 'recency');
    if (recencyFactor?.direction === 'negative') {
      actions.push('Send "We miss you" campaign');
    }

    const trendFactor = factors.find((f) => f.name === 'order_trend');
    if (trendFactor?.direction === 'negative') {
      actions.push('Review recent product/service changes');
    }

    return actions.slice(0, 4); // Max 4 actions
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(
    byRiskLevel: ChurnAnalysisResult['byRiskLevel'],
    atRiskCount: number,
    totalCustomers: number
  ): string[] {
    const insights: string[] = [];

    const atRiskPercentage = (atRiskCount / totalCustomers) * 100;
    
    if (atRiskPercentage > 20) {
      insights.push(`${atRiskPercentage.toFixed(1)}% of customers are at high churn risk. Immediate action recommended.`);
    } else if (atRiskPercentage > 10) {
      insights.push(`${atRiskPercentage.toFixed(1)}% of customers show elevated churn risk.`);
    } else {
      insights.push(`Customer base is relatively healthy with ${atRiskPercentage.toFixed(1)}% at risk.`);
    }

    const criticalLevel = byRiskLevel.find((r) => r.level === 'critical');
    if (criticalLevel && criticalLevel.avgLtv > 0) {
      insights.push(
        `Critical risk customers have avg LTV of $${criticalLevel.avgLtv.toFixed(2)}. High-value save opportunities.`
      );
    }

    return insights;
  }

  /**
   * Generate recommendations from predictions
   */
  private generateRecommendations(predictions: ChurnPrediction[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = predictions.filter((p) => p.riskLevel === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Priority: Contact ${criticalCount} critical-risk customers within 48 hours.`);
    }

    const highCount = predictions.filter((p) => p.riskLevel === 'high').length;
    if (highCount > 0) {
      recommendations.push(`Launch win-back campaign for ${highCount} high-risk customers.`);
    }

    recommendations.push('Consider implementing automated churn prevention triggers.');
    recommendations.push('Review product/service issues flagged in support interactions.');

    return recommendations.slice(0, 4);
  }

  /**
   * Empty result
   */
  private emptyResult(): ChurnAnalysisResult {
    return {
      totalCustomers: 0,
      atRiskCount: 0,
      atRiskPercentage: 0,
      atRiskRevenue: 0,
      byRiskLevel: [],
      predictions: [],
      insights: ['No customer data available for churn analysis.'],
      recommendations: [],
    };
  }
}

// Export factory function
export function createChurnPredictor(options?: PredictorOptions): ChurnPredictor {
  return new ChurnPredictor(options);
}
