/**
 * RFM Calculator
 * 
 * Calculates Recency, Frequency, Monetary (RFM) scores for customer segmentation.
 */

import { createLogger } from '@aibos/core';
import type {
  RFMScores,
  RFMSegmentName,
  RFMAnalysisResult,
  CustomerRFM,
} from './types';

const logger = createLogger('segmentation:rfm');

// RFM Segment definitions based on score combinations
const RFM_SEGMENT_RULES: { name: RFMSegmentName; condition: (r: number, f: number, m: number) => boolean }[] = [
  { name: 'champions', condition: (r, f, m) => r >= 4 && f >= 4 && m >= 4 },
  { name: 'loyal_customers', condition: (r, f, m) => r >= 3 && f >= 4 && m >= 3 },
  { name: 'potential_loyalists', condition: (r, f, _m) => r >= 4 && f >= 2 && f <= 4 },
  { name: 'new_customers', condition: (r, f, _m) => r >= 4 && f <= 2 },
  { name: 'promising', condition: (r, f, m) => r >= 3 && r <= 4 && f <= 2 && m <= 3 },
  { name: 'need_attention', condition: (r, f, m) => r >= 2 && r <= 3 && f >= 2 && m >= 2 },
  { name: 'about_to_sleep', condition: (r, f, _m) => r >= 2 && r <= 3 && f <= 2 },
  { name: 'at_risk', condition: (r, f, m) => r <= 2 && f >= 3 && m >= 3 },
  { name: 'cant_lose', condition: (r, f, m) => r <= 2 && f >= 4 && m >= 4 },
  { name: 'hibernating', condition: (r, f, _m) => r <= 2 && f <= 2 },
  { name: 'lost', condition: (r, _f, _m) => r <= 1 },
];

export interface RFMCalculatorOptions {
  recencyDays?: number;
  scoreBins?: number;
}

const DEFAULT_OPTIONS: RFMCalculatorOptions = {
  recencyDays: 365,
  scoreBins: 5,
};

// Customer data for RFM calculation
export interface CustomerData {
  id: string;
  email?: string;
  lastOrderAt?: Date;
  totalOrders: number;
  totalSpent: number;
}

/**
 * RFM Calculator class
 */
export class RFMCalculator {
  private options: RFMCalculatorOptions;

  constructor(options: RFMCalculatorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Calculate RFM analysis for customers
   */
  analyze(customers: CustomerData[]): RFMAnalysisResult {
    if (customers.length === 0) {
      return this.emptyResult();
    }

    // Calculate raw RFM values
    const now = new Date();
    const customersWithRaw = customers.map((c) => ({
      ...c,
      recencyDays: c.lastOrderAt
        ? Math.floor((now.getTime() - c.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
        : (this.options.recencyDays || 365) + 1,
    }));

    // Calculate score boundaries using quintiles
    const recencyBoundaries = this.calculateQuintiles(
      customersWithRaw.map((c) => c.recencyDays),
      true // Reverse - lower is better for recency
    );
    const frequencyBoundaries = this.calculateQuintiles(
      customersWithRaw.map((c) => c.totalOrders)
    );
    const monetaryBoundaries = this.calculateQuintiles(
      customersWithRaw.map((c) => c.totalSpent)
    );

    // Calculate RFM scores for each customer
    const customerRFMs: CustomerRFM[] = customersWithRaw.map((c) => {
      const scores = this.calculateScores(
        c.recencyDays,
        c.totalOrders,
        c.totalSpent,
        recencyBoundaries,
        frequencyBoundaries,
        monetaryBoundaries
      );

      const segment = this.assignSegment(scores);

      return {
        customerId: c.id,
        customerEmail: c.email,
        recencyDays: c.recencyDays,
        frequency: c.totalOrders,
        monetary: c.totalSpent,
        scores,
        combinedScore: scores.total,
        segment,
      };
    });

    // Calculate segment distribution
    const segmentDistribution = this.calculateSegmentDistribution(customerRFMs);

    // Generate insights
    const insights = this.generateInsights(customerRFMs, segmentDistribution);

    // Generate recommendations
    const recommendations = this.generateRecommendations(segmentDistribution);

    logger.info('RFM analysis complete', {
      customerCount: customers.length,
      segmentCount: segmentDistribution.length,
    });

    return {
      customerCount: customers.length,
      averageScores: this.calculateAverageScores(customerRFMs),
      segmentDistribution,
      customers: customerRFMs,
      insights,
      recommendations,
    };
  }

  /**
   * Calculate RFM scores
   */
  private calculateScores(
    recencyDays: number,
    frequency: number,
    monetary: number,
    recencyBoundaries: number[],
    frequencyBoundaries: number[],
    monetaryBoundaries: number[]
  ): RFMScores {
    const r = this.assignScore(recencyDays, recencyBoundaries, true);
    const f = this.assignScore(frequency, frequencyBoundaries);
    const m = this.assignScore(monetary, monetaryBoundaries);

    return {
      recency: r,
      frequency: f,
      monetary: m,
      total: (r + f + m) / 3,
    };
  }

  /**
   * Assign score based on value and boundaries
   */
  private assignScore(value: number, boundaries: number[], reverse = false): number {
    const bins = this.options.scoreBins || 5;
    
    for (let i = 0; i < boundaries.length; i++) {
      if (value <= (boundaries[i] || Infinity)) {
        return reverse ? bins - i : i + 1;
      }
    }
    
    return reverse ? 1 : bins;
  }

  /**
   * Calculate quintile boundaries
   */
  private calculateQuintiles(values: number[], _reverse = false): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const bins = this.options.scoreBins || 5;
    const boundaries: number[] = [];

    for (let i = 1; i < bins; i++) {
      const index = Math.floor((i / bins) * sorted.length);
      boundaries.push(sorted[index] || 0);
    }

    return boundaries;
  }

  /**
   * Assign customer to RFM segment
   */
  private assignSegment(scores: RFMScores): RFMSegmentName {
    for (const rule of RFM_SEGMENT_RULES) {
      if (rule.condition(scores.recency, scores.frequency, scores.monetary)) {
        return rule.name;
      }
    }
    return 'need_attention'; // Default
  }

  /**
   * Calculate segment distribution
   */
  private calculateSegmentDistribution(
    customers: CustomerRFM[]
  ): RFMAnalysisResult['segmentDistribution'] {
    const segmentCounts = new Map<RFMSegmentName, { count: number; revenue: number }>();

    for (const customer of customers) {
      const existing = segmentCounts.get(customer.segment) || { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += customer.monetary;
      segmentCounts.set(customer.segment, existing);
    }

    const total = customers.length;
    const distribution: RFMAnalysisResult['segmentDistribution'] = [];

    for (const [segment, data] of segmentCounts) {
      distribution.push({
        segment,
        count: data.count,
        percentage: (data.count / total) * 100,
        totalRevenue: data.revenue,
        avgRevenue: data.revenue / data.count,
      });
    }

    return distribution.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate average scores
   */
  private calculateAverageScores(customers: CustomerRFM[]): RFMScores {
    if (customers.length === 0) {
      return { recency: 0, frequency: 0, monetary: 0, total: 0 };
    }

    const sum = customers.reduce(
      (acc, c) => ({
        recency: acc.recency + c.scores.recency,
        frequency: acc.frequency + c.scores.frequency,
        monetary: acc.monetary + c.scores.monetary,
        total: acc.total + c.scores.total,
      }),
      { recency: 0, frequency: 0, monetary: 0, total: 0 }
    );

    const count = customers.length;
    return {
      recency: sum.recency / count,
      frequency: sum.frequency / count,
      monetary: sum.monetary / count,
      total: sum.total / count,
    };
  }

  /**
   * Generate insights from RFM analysis
   */
  private generateInsights(
    customers: CustomerRFM[],
    distribution: RFMAnalysisResult['segmentDistribution']
  ): string[] {
    const insights: string[] = [];

    const champions = distribution.find((d) => d.segment === 'champions');
    if (champions && champions.percentage >= 10) {
      insights.push(
        `${champions.percentage.toFixed(1)}% of customers are Champions - your most valuable segment.`
      );
    }

    const atRisk = distribution.filter((d) => 
      ['at_risk', 'cant_lose_them', 'hibernating', 'lost'].includes(d.segment)
    );
    const atRiskCount = atRisk.reduce((sum, d) => sum + d.count, 0);
    const atRiskPercentage = (atRiskCount / customers.length) * 100;

    if (atRiskPercentage > 30) {
      insights.push(
        `Warning: ${atRiskPercentage.toFixed(1)}% of customers are at risk of churning.`
      );
    }

    const newCustomers = distribution.find((d) => d.segment === 'new_customers');
    if (newCustomers && newCustomers.percentage >= 15) {
      insights.push(
        `${newCustomers.percentage.toFixed(1)}% new customers - focus on converting them to loyal customers.`
      );
    }

    return insights.length > 0 ? insights : ['RFM analysis complete. Review segments for opportunities.'];
  }

  /**
   * Generate recommendations based on segment distribution
   */
  private generateRecommendations(
    distribution: RFMAnalysisResult['segmentDistribution']
  ): string[] {
    const recommendations: string[] = [];

    const atRisk = distribution.find((d) => d.segment === 'at_risk');
    if (atRisk && atRisk.count > 0) {
      recommendations.push(`Launch win-back campaign for ${atRisk.count} at-risk customers.`);
    }

    const cantLose = distribution.find((d) => d.segment === 'cant_lose');
    if (cantLose && cantLose.count > 0) {
      recommendations.push(`Priority outreach needed for ${cantLose.count} high-value churning customers.`);
    }

    const potentialLoyalists = distribution.find((d) => d.segment === 'potential_loyalists');
    if (potentialLoyalists && potentialLoyalists.count > 0) {
      recommendations.push(`Nurture ${potentialLoyalists.count} potential loyalists with loyalty programs.`);
    }

    const champions = distribution.find((d) => d.segment === 'champions');
    if (champions && champions.count > 0) {
      recommendations.push(`Engage ${champions.count} champions as brand advocates and referrers.`);
    }

    return recommendations.length > 0 ? recommendations : ['Continue monitoring customer segments.'];
  }

  /**
   * Empty result
   */
  private emptyResult(): RFMAnalysisResult {
    return {
      customerCount: 0,
      averageScores: { recency: 0, frequency: 0, monetary: 0, total: 0 },
      segmentDistribution: [],
      customers: [],
      insights: ['No customer data available for RFM analysis.'],
      recommendations: [],
    };
  }
}

// Export factory function
export function createRFMCalculator(options?: RFMCalculatorOptions): RFMCalculator {
  return new RFMCalculator(options);
}
