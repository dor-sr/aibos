/**
 * Insight Generator
 * 
 * Generates proactive insights by analyzing business metrics.
 * Combines opportunity detection, risk detection, and prioritization.
 */

import { createLogger } from '@aibos/core';
import type {
  GeneratedInsight,
  InsightPeriod,
  InsightGenerationRequest,
  InsightCategory,
} from './types';
import { OpportunityDetector, createOpportunityDetector } from './opportunity-detector';
import { RiskDetector, createRiskDetector } from './risk-detector';
import { InsightPrioritizer, prioritizeInsights, PrioritizedInsight } from './insight-prioritizer';

const logger = createLogger('insights:generator');

export interface InsightGeneratorOptions {
  maxInsightsPerRun?: number;
  includeOpportunities?: boolean;
  includeRisks?: boolean;
  includeHighlights?: boolean;
  diversifyResults?: boolean;
  minScoreThreshold?: number;
}

const DEFAULT_OPTIONS: InsightGeneratorOptions = {
  maxInsightsPerRun: 10,
  includeOpportunities: true,
  includeRisks: true,
  includeHighlights: true,
  diversifyResults: true,
  minScoreThreshold: 0.3,
};

/**
 * Insight Generator class
 */
export class InsightGenerator {
  private opportunityDetector: OpportunityDetector;
  private riskDetector: RiskDetector;
  private prioritizer: InsightPrioritizer;
  private verticalType: 'ecommerce' | 'saas' | 'generic';
  private options: InsightGeneratorOptions;

  constructor(
    verticalType: 'ecommerce' | 'saas' | 'generic',
    options: InsightGeneratorOptions = {}
  ) {
    this.verticalType = verticalType;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.opportunityDetector = createOpportunityDetector(verticalType);
    this.riskDetector = createRiskDetector(verticalType);
    this.prioritizer = new InsightPrioritizer();
  }

  /**
   * Generate insights from metrics
   */
  generate(
    metrics: Record<string, number>,
    period: InsightPeriod,
    categories?: InsightCategory[]
  ): PrioritizedInsight[] {
    const insights: GeneratedInsight[] = [];

    // Detect opportunities
    if (this.options.includeOpportunities) {
      const opportunities = this.opportunityDetector.detect(metrics, period);
      insights.push(...opportunities);
      logger.debug('Opportunities detected', { count: opportunities.length });
    }

    // Detect risks
    if (this.options.includeRisks) {
      const risks = this.riskDetector.detect(metrics, period);
      insights.push(...risks);
      logger.debug('Risks detected', { count: risks.length });
    }

    // Filter by categories if specified
    let filtered = insights;
    if (categories && categories.length > 0) {
      filtered = insights.filter((i) => categories.includes(i.category));
    }

    // Prioritize insights
    let prioritized = prioritizeInsights(filtered, {
      maxInsights: this.options.maxInsightsPerRun,
    });

    // Diversify if enabled
    if (this.options.diversifyResults) {
      prioritized = this.prioritizer.diversify(prioritized);
    }

    // Filter by minimum score
    if (this.options.minScoreThreshold) {
      prioritized = this.prioritizer.filterByMinScore(
        prioritized,
        this.options.minScoreThreshold
      );
    }

    logger.info('Insights generated', {
      total: insights.length,
      filtered: filtered.length,
      final: prioritized.length,
    });

    return prioritized;
  }

  /**
   * Generate daily digest of insights
   */
  generateDailyDigest(
    metrics: Record<string, number>
  ): {
    summary: string;
    topInsights: PrioritizedInsight[];
    byCategory: Record<InsightCategory, PrioritizedInsight[]>;
  } {
    // Use yesterday as the period
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(yesterday);
    periodEnd.setHours(23, 59, 59, 999);

    const period: InsightPeriod = {
      start: yesterday,
      end: periodEnd,
      label: 'Yesterday',
      comparisonPeriod: {
        start: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
        end: new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000),
        label: 'Day before',
      },
    };

    // Generate insights
    const topInsights = this.generate(metrics, period);

    // Group by category
    const byCategory = this.prioritizer.groupByCategory(topInsights);

    // Generate summary
    const summary = this.generateSummary(topInsights);

    return {
      summary,
      topInsights,
      byCategory,
    };
  }

  /**
   * Generate weekly digest of insights
   */
  generateWeeklyDigest(
    metrics: Record<string, number>
  ): {
    summary: string;
    topInsights: PrioritizedInsight[];
    byCategory: Record<InsightCategory, PrioritizedInsight[]>;
    weekOverWeekChanges: Record<string, number>;
  } {
    // Use last week as the period
    const now = new Date();
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay()); // Last Sunday
    lastWeekEnd.setHours(23, 59, 59, 999);

    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    lastWeekStart.setHours(0, 0, 0, 0);

    const period: InsightPeriod = {
      start: lastWeekStart,
      end: lastWeekEnd,
      label: 'Last Week',
      comparisonPeriod: {
        start: new Date(lastWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
        label: 'Previous Week',
      },
    };

    // Generate insights with higher limit for weekly
    const topInsights = this.generate(metrics, period);

    // Group by category
    const byCategory = this.prioritizer.groupByCategory(topInsights);

    // Extract week-over-week changes
    const weekOverWeekChanges: Record<string, number> = {};
    for (const [key, value] of Object.entries(metrics)) {
      if (key.endsWith('_change_percent')) {
        const metricName = key.replace('_change_percent', '');
        weekOverWeekChanges[metricName] = value;
      }
    }

    // Generate summary
    const summary = this.generateSummary(topInsights, true);

    return {
      summary,
      topInsights,
      byCategory,
      weekOverWeekChanges,
    };
  }

  /**
   * Generate a text summary of insights
   */
  private generateSummary(
    insights: PrioritizedInsight[],
    isWeekly: boolean = false
  ): string {
    if (insights.length === 0) {
      return isWeekly
        ? 'No significant changes detected this week.'
        : 'No significant changes detected today.';
    }

    const risks = insights.filter((i) => i.type === 'risk');
    const opportunities = insights.filter((i) => i.type === 'opportunity');
    const highlights = insights.filter((i) => i.type === 'highlight');

    const parts: string[] = [];

    if (risks.length > 0) {
      parts.push(`${risks.length} area${risks.length > 1 ? 's' : ''} requiring attention`);
    }
    if (opportunities.length > 0) {
      parts.push(`${opportunities.length} growth opportunit${opportunities.length > 1 ? 'ies' : 'y'}`);
    }
    if (highlights.length > 0) {
      parts.push(`${highlights.length} positive trend${highlights.length > 1 ? 's' : ''}`);
    }

    const period = isWeekly ? 'this week' : 'today';
    let summary = `Found ${parts.join(', ')} ${period}.`;

    // Add top insight to summary
    if (insights[0]) {
      summary += ` Top priority: ${insights[0].title}`;
    }

    return summary;
  }

  /**
   * Get insight recommendations for a specific metric
   */
  getMetricRecommendations(
    metricName: string,
    currentValue: number,
    previousValue: number,
    period: InsightPeriod
  ): PrioritizedInsight[] {
    const changePercent = previousValue === 0
      ? 0
      : ((currentValue - previousValue) / previousValue) * 100;

    const metrics: Record<string, number> = {
      [metricName]: currentValue,
      [`${metricName}_previous`]: previousValue,
      [`${metricName}_change_percent`]: changePercent,
    };

    return this.generate(metrics, period);
  }
}

// Export factory function
export function createInsightGenerator(
  verticalType: 'ecommerce' | 'saas' | 'generic',
  options?: InsightGeneratorOptions
): InsightGenerator {
  return new InsightGenerator(verticalType, options);
}
