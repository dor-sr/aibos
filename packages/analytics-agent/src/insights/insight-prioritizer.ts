/**
 * Insight Prioritizer
 * 
 * Ranks and prioritizes insights based on importance, urgency,
 * and relevance to the business.
 */

import type { GeneratedInsight, InsightType, InsightCategory } from './types';

// Type weights (risks are prioritized over opportunities)
const TYPE_WEIGHTS: Record<InsightType, number> = {
  risk: 1.3,
  anomaly: 1.2,
  opportunity: 1.0,
  recommendation: 0.9,
  highlight: 0.8,
};

// Category weights (revenue and churn are most important)
const CATEGORY_WEIGHTS: Record<InsightCategory, number> = {
  revenue: 1.2,
  churn: 1.2,
  orders: 1.0,
  customers: 1.0,
  growth: 0.95,
  products: 0.9,
  marketing: 0.85,
  operations: 0.8,
};

// Freshness decay (insights lose priority over time)
const FRESHNESS_DECAY_FACTOR = 0.1; // 10% decay per day

export interface PrioritizationOptions {
  maxInsights?: number;
  typeWeights?: Partial<Record<InsightType, number>>;
  categoryWeights?: Partial<Record<InsightCategory, number>>;
  boostRecentlyActioned?: boolean;
  includeExpired?: boolean;
}

export interface PrioritizedInsight extends GeneratedInsight {
  finalScore: number;
  rank: number;
  scoreBreakdown: {
    baseScore: number;
    typeMultiplier: number;
    categoryMultiplier: number;
    freshnessMultiplier: number;
    bonuses: number;
  };
}

/**
 * Insight Prioritizer class
 */
export class InsightPrioritizer {
  private typeWeights: Record<InsightType, number>;
  private categoryWeights: Record<InsightCategory, number>;

  constructor(options: Partial<PrioritizationOptions> = {}) {
    this.typeWeights = { ...TYPE_WEIGHTS, ...options.typeWeights };
    this.categoryWeights = { ...CATEGORY_WEIGHTS, ...options.categoryWeights };
  }

  /**
   * Prioritize a list of insights
   */
  prioritize(
    insights: GeneratedInsight[],
    options: PrioritizationOptions = {}
  ): PrioritizedInsight[] {
    const { maxInsights = 10 } = options;

    // Score each insight
    const scored = insights.map((insight) => this.scoreInsight(insight));

    // Sort by final score (descending)
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // Assign ranks
    scored.forEach((insight, index) => {
      insight.rank = index + 1;
    });

    // Return top N
    return scored.slice(0, maxInsights);
  }

  /**
   * Score a single insight
   */
  scoreInsight(insight: GeneratedInsight): PrioritizedInsight {
    // Base score from insight priority (1-100) and confidence score (0-1)
    const baseScore = (insight.priority / 100) * (insight.score || 0.5);

    // Type multiplier
    const typeMultiplier = this.typeWeights[insight.type] || 1.0;

    // Category multiplier
    const categoryMultiplier = this.categoryWeights[insight.category] || 1.0;

    // Freshness multiplier (if period end is recent)
    const freshnessMultiplier = this.calculateFreshness(insight.period.end);

    // Calculate bonuses
    const bonuses = this.calculateBonuses(insight);

    // Final score
    const finalScore = baseScore * typeMultiplier * categoryMultiplier * freshnessMultiplier + bonuses;

    return {
      ...insight,
      finalScore,
      rank: 0, // Will be set after sorting
      scoreBreakdown: {
        baseScore,
        typeMultiplier,
        categoryMultiplier,
        freshnessMultiplier,
        bonuses,
      },
    };
  }

  /**
   * Calculate freshness multiplier based on period end date
   */
  private calculateFreshness(periodEnd: Date): number {
    const now = new Date();
    const daysSinceEnd = Math.max(0, (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
    
    // Decay factor: 1.0 for today, decreasing by FRESHNESS_DECAY_FACTOR per day
    return Math.max(0.5, 1 - (daysSinceEnd * FRESHNESS_DECAY_FACTOR));
  }

  /**
   * Calculate bonus points for special conditions
   */
  private calculateBonuses(insight: GeneratedInsight): number {
    let bonus = 0;

    // Bonus for high percentage changes
    const primaryChange = Math.abs(insight.metrics.primaryMetric.changePercent || 0);
    if (primaryChange > 50) {
      bonus += 0.1;
    } else if (primaryChange > 30) {
      bonus += 0.05;
    }

    // Bonus for having recommended action
    if (insight.recommendedAction) {
      bonus += 0.05;
    }

    // Bonus for having related metrics (more context)
    if (insight.metrics.relatedMetrics && insight.metrics.relatedMetrics.length > 0) {
      bonus += 0.02 * insight.metrics.relatedMetrics.length;
    }

    // Bonus for having explanation
    if (insight.explanation) {
      bonus += 0.03;
    }

    return bonus;
  }

  /**
   * Diversify insights to avoid showing too many of the same type/category
   */
  diversify(
    insights: PrioritizedInsight[],
    maxPerType: number = 3,
    maxPerCategory: number = 3
  ): PrioritizedInsight[] {
    const typeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const diversified: PrioritizedInsight[] = [];

    for (const insight of insights) {
      const typeCount = typeCounts[insight.type] || 0;
      const categoryCount = categoryCounts[insight.category] || 0;

      if (typeCount < maxPerType && categoryCount < maxPerCategory) {
        diversified.push(insight);
        typeCounts[insight.type] = typeCount + 1;
        categoryCounts[insight.category] = categoryCount + 1;
      }
    }

    // Re-rank after diversification
    diversified.forEach((insight, index) => {
      insight.rank = index + 1;
    });

    return diversified;
  }

  /**
   * Group insights by category
   */
  groupByCategory(
    insights: PrioritizedInsight[]
  ): Record<InsightCategory, PrioritizedInsight[]> {
    const grouped: Record<InsightCategory, PrioritizedInsight[]> = {
      revenue: [],
      orders: [],
      customers: [],
      products: [],
      marketing: [],
      operations: [],
      churn: [],
      growth: [],
    };

    for (const insight of insights) {
      grouped[insight.category].push(insight);
    }

    return grouped;
  }

  /**
   * Get the top insight for each category
   */
  getTopPerCategory(
    insights: PrioritizedInsight[]
  ): Map<InsightCategory, PrioritizedInsight> {
    const topPerCategory = new Map<InsightCategory, PrioritizedInsight>();

    for (const insight of insights) {
      if (!topPerCategory.has(insight.category)) {
        topPerCategory.set(insight.category, insight);
      }
    }

    return topPerCategory;
  }

  /**
   * Filter insights above a minimum score threshold
   */
  filterByMinScore(
    insights: PrioritizedInsight[],
    minScore: number
  ): PrioritizedInsight[] {
    return insights.filter((i) => i.finalScore >= minScore);
  }
}

// Export singleton instance
export const insightPrioritizer = new InsightPrioritizer();

/**
 * Quick helper to prioritize insights
 */
export function prioritizeInsights(
  insights: GeneratedInsight[],
  options?: PrioritizationOptions
): PrioritizedInsight[] {
  return insightPrioritizer.prioritize(insights, options);
}
