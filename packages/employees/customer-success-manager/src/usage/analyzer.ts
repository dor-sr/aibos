/**
 * Usage Pattern Analyzer
 * 
 * Analyzes client product usage patterns to identify trends and anomalies.
 */

import { createLogger } from '@aibos/core';
import type {
  ClientAccount,
  UsagePattern,
  UsageMetrics,
  UsageTrend,
  UsageAnomaly,
} from '../types';

const logger = createLogger('employee:csm:usage');

// Feature categories for analysis
const FEATURE_CATEGORIES = {
  core: ['dashboard', 'reports', 'analytics', 'export'],
  collaboration: ['sharing', 'comments', 'team', 'invites'],
  integration: ['api', 'webhooks', 'connectors', 'sync'],
  advanced: ['automation', 'custom_metrics', 'forecasting', 'alerts'],
};

// Anomaly detection thresholds
const ANOMALY_THRESHOLDS = {
  sessionDropPercent: 40, // 40% drop is anomalous
  sessionSpikePercent: 100, // 100% spike is anomalous
  actionDropPercent: 50,
  inactivityDays: 7,
};

/**
 * Usage Pattern Analyzer
 */
export class UsageAnalyzer {
  /**
   * Analyze usage patterns for a client
   */
  analyze(
    clientId: string,
    rawUsageData: RawUsageData,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): UsagePattern {
    const { current, previous } = rawUsageData;

    // Calculate metrics
    const metrics = this.calculateMetrics(current);

    // Detect trends
    const trends = this.detectTrends(current, previous);

    // Detect anomalies
    const anomalies = this.detectAnomalies(current, previous);

    // Generate insights
    const insights = this.generateInsights(metrics, trends, anomalies);

    const pattern: UsagePattern = {
      clientId,
      period,
      startDate: rawUsageData.startDate,
      endDate: rawUsageData.endDate,
      metrics,
      trends,
      anomalies,
      insights,
    };

    logger.info('Usage pattern analyzed', {
      clientId,
      period,
      trendCount: trends.length,
      anomalyCount: anomalies.length,
    });

    return pattern;
  }

  /**
   * Calculate usage metrics
   */
  private calculateMetrics(data: PeriodUsageData): UsageMetrics {
    // Calculate feature usage distribution
    const featureUsage = new Map<string, number>();
    let totalActions = 0;

    for (const event of data.events) {
      const count = featureUsage.get(event.feature) || 0;
      featureUsage.set(event.feature, count + event.count);
      totalActions += event.count;
    }

    // Top features
    const topFeatures = Array.from(featureUsage.entries())
      .map(([feature, usageCount]) => ({
        feature,
        usageCount,
        percentage: totalActions > 0 ? (usageCount / totalActions) * 100 : 0,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    // Underutilized features (expected but not used)
    const expectedFeatures = [...FEATURE_CATEGORIES.core, ...FEATURE_CATEGORIES.collaboration];
    const underutilizedFeatures = expectedFeatures
      .filter(f => !featureUsage.has(f) || (featureUsage.get(f) || 0) < 5)
      .map(f => ({
        feature: f,
        expectedUsage: 20, // Expected weekly actions
        actualUsage: featureUsage.get(f) || 0,
      }));

    // Peak usage analysis
    const hourlyUsage = new Map<number, number>();
    const dailyUsage = new Map<number, number>();

    for (const session of data.sessions) {
      const hour = new Date(session.timestamp).getHours();
      const day = new Date(session.timestamp).getDay();
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
      dailyUsage.set(day, (dailyUsage.get(day) || 0) + 1);
    }

    // Find peak hours (top 3)
    const peakUsageHours = Array.from(hourlyUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // Find peak days
    const peakUsageDays = Array.from(dailyUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day);

    return {
      totalSessions: data.sessions.length,
      uniqueUsers: new Set(data.sessions.map(s => s.userId)).size,
      avgSessionDuration: data.sessions.length > 0
        ? data.sessions.reduce((sum, s) => sum + s.duration, 0) / data.sessions.length
        : 0,
      totalActions,
      topFeatures,
      underutilizedFeatures,
      peakUsageHours,
      peakUsageDays,
    };
  }

  /**
   * Detect usage trends
   */
  private detectTrends(
    current: PeriodUsageData,
    previous: PeriodUsageData
  ): UsageTrend[] {
    const trends: UsageTrend[] = [];

    // Session count trend
    const sessionChange = this.calculateChange(
      current.sessions.length,
      previous.sessions.length
    );
    if (Math.abs(sessionChange) >= 10) {
      trends.push({
        metric: 'sessions',
        direction: sessionChange > 0 ? 'up' : 'down',
        changePercentage: sessionChange,
        significance: Math.abs(sessionChange) > 30 ? 'high' : 'medium',
      });
    }

    // Unique users trend
    const currentUsers = new Set(current.sessions.map(s => s.userId)).size;
    const previousUsers = new Set(previous.sessions.map(s => s.userId)).size;
    const userChange = this.calculateChange(currentUsers, previousUsers);
    if (Math.abs(userChange) >= 10) {
      trends.push({
        metric: 'unique_users',
        direction: userChange > 0 ? 'up' : 'down',
        changePercentage: userChange,
        significance: Math.abs(userChange) > 25 ? 'high' : 'medium',
      });
    }

    // Average session duration trend
    const currentDuration = current.sessions.length > 0
      ? current.sessions.reduce((sum, s) => sum + s.duration, 0) / current.sessions.length
      : 0;
    const previousDuration = previous.sessions.length > 0
      ? previous.sessions.reduce((sum, s) => sum + s.duration, 0) / previous.sessions.length
      : 0;
    const durationChange = this.calculateChange(currentDuration, previousDuration);
    if (Math.abs(durationChange) >= 15) {
      trends.push({
        metric: 'session_duration',
        direction: durationChange > 0 ? 'up' : 'down',
        changePercentage: durationChange,
        significance: Math.abs(durationChange) > 30 ? 'high' : 'medium',
      });
    }

    // Total actions trend
    const currentActions = current.events.reduce((sum, e) => sum + e.count, 0);
    const previousActions = previous.events.reduce((sum, e) => sum + e.count, 0);
    const actionsChange = this.calculateChange(currentActions, previousActions);
    if (Math.abs(actionsChange) >= 15) {
      trends.push({
        metric: 'total_actions',
        direction: actionsChange > 0 ? 'up' : 'down',
        changePercentage: actionsChange,
        significance: Math.abs(actionsChange) > 40 ? 'high' : 'medium',
      });
    }

    // Feature adoption trend
    const currentFeatures = new Set(current.events.map(e => e.feature)).size;
    const previousFeatures = new Set(previous.events.map(e => e.feature)).size;
    const featureChange = this.calculateChange(currentFeatures, previousFeatures);
    if (Math.abs(featureChange) >= 20) {
      trends.push({
        metric: 'feature_breadth',
        direction: featureChange > 0 ? 'up' : 'down',
        changePercentage: featureChange,
        significance: 'medium',
      });
    }

    return trends;
  }

  /**
   * Detect usage anomalies
   */
  private detectAnomalies(
    current: PeriodUsageData,
    previous: PeriodUsageData
  ): UsageAnomaly[] {
    const anomalies: UsageAnomaly[] = [];

    // Session count anomaly
    const sessionChange = this.calculateChange(
      current.sessions.length,
      previous.sessions.length
    );
    if (sessionChange <= -ANOMALY_THRESHOLDS.sessionDropPercent) {
      anomalies.push({
        metric: 'sessions',
        expectedValue: previous.sessions.length,
        actualValue: current.sessions.length,
        deviation: Math.abs(sessionChange),
        severity: sessionChange <= -60 ? 'high' : 'medium',
        possibleCause: 'Significant drop in login activity - possible disengagement',
      });
    } else if (sessionChange >= ANOMALY_THRESHOLDS.sessionSpikePercent) {
      anomalies.push({
        metric: 'sessions',
        expectedValue: previous.sessions.length,
        actualValue: current.sessions.length,
        deviation: sessionChange,
        severity: 'low', // Spikes are usually positive
        possibleCause: 'Significant increase in activity - possible team expansion or new use case',
      });
    }

    // Actions anomaly
    const currentActions = current.events.reduce((sum, e) => sum + e.count, 0);
    const previousActions = previous.events.reduce((sum, e) => sum + e.count, 0);
    const actionsChange = this.calculateChange(currentActions, previousActions);
    if (actionsChange <= -ANOMALY_THRESHOLDS.actionDropPercent) {
      anomalies.push({
        metric: 'actions',
        expectedValue: previousActions,
        actualValue: currentActions,
        deviation: Math.abs(actionsChange),
        severity: actionsChange <= -70 ? 'high' : 'medium',
        possibleCause: 'Major drop in feature usage - users may be stuck or disengaged',
      });
    }

    // Inactivity detection
    if (current.sessions.length === 0 && previous.sessions.length > 5) {
      anomalies.push({
        metric: 'activity',
        expectedValue: previous.sessions.length,
        actualValue: 0,
        deviation: 100,
        severity: 'high',
        possibleCause: 'Complete inactivity - urgent attention needed',
      });
    }

    // Feature disappearance (key feature stopped being used)
    const previousFeatures = new Set(previous.events.map(e => e.feature));
    const currentFeatures = new Set(current.events.map(e => e.feature));
    const droppedCoreFeatures = [...FEATURE_CATEGORIES.core].filter(
      f => previousFeatures.has(f) && !currentFeatures.has(f)
    );
    if (droppedCoreFeatures.length > 0) {
      anomalies.push({
        metric: 'core_features',
        expectedValue: droppedCoreFeatures.length,
        actualValue: 0,
        deviation: 100,
        severity: 'medium',
        possibleCause: `Core features no longer used: ${droppedCoreFeatures.join(', ')}`,
      });
    }

    return anomalies;
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(
    metrics: UsageMetrics,
    trends: UsageTrend[],
    anomalies: UsageAnomaly[]
  ): string[] {
    const insights: string[] = [];

    // Usage health insight
    if (metrics.totalSessions === 0) {
      insights.push('ALERT: No activity detected in this period');
    } else if (metrics.avgSessionDuration > 15) {
      insights.push('Users are highly engaged with long session times');
    } else if (metrics.avgSessionDuration < 3) {
      insights.push('Short sessions suggest users may not be finding value');
    }

    // Feature adoption insight
    if (metrics.underutilizedFeatures.length > 3) {
      insights.push(
        `${metrics.underutilizedFeatures.length} features underutilized - training opportunity`
      );
    }
    const topFeature = metrics.topFeatures[0];
    if (metrics.topFeatures.length > 0 && topFeature && topFeature.percentage > 50) {
      insights.push(
        `Heavy reliance on ${topFeature.feature} - consider expanding adoption`
      );
    }

    // Trend insights
    const negativeTrends = trends.filter(
      t => t.direction === 'down' && t.significance === 'high'
    );
    if (negativeTrends.length > 0) {
      insights.push(
        `Declining metrics: ${negativeTrends.map(t => t.metric).join(', ')}`
      );
    }

    const positiveTrends = trends.filter(
      t => t.direction === 'up' && t.significance === 'high'
    );
    if (positiveTrends.length > 0) {
      insights.push(
        `Growing metrics: ${positiveTrends.map(t => t.metric).join(', ')}`
      );
    }

    // Anomaly insights
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
    if (highSeverityAnomalies.length > 0) {
      insights.push(
        `${highSeverityAnomalies.length} critical anomalies require attention`
      );
    }

    // Peak usage insight
    if (metrics.peakUsageHours.length > 0) {
      const formatHour = (h: number) => `${h}:00`;
      insights.push(
        `Peak usage hours: ${metrics.peakUsageHours.map(formatHour).join(', ')}`
      );
    }

    return insights;
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get feature adoption score (0-1)
   */
  calculateFeatureAdoption(metrics: UsageMetrics): number {
    const totalExpectedFeatures = 
      FEATURE_CATEGORIES.core.length + FEATURE_CATEGORIES.collaboration.length;
    const usedFeatures = metrics.topFeatures.length;
    const underutilized = metrics.underutilizedFeatures.length;

    return Math.max(0, Math.min(1, 
      (usedFeatures - underutilized * 0.5) / totalExpectedFeatures
    ));
  }

  /**
   * Compare usage patterns between clients
   */
  compareBenchmarks(
    clientPattern: UsagePattern,
    benchmarkPattern: UsagePattern
  ): {
    metric: string;
    clientValue: number;
    benchmarkValue: number;
    percentile: number;
  }[] {
    const comparisons = [];

    // Sessions comparison
    const benchmarkSessions = benchmarkPattern.metrics?.totalSessions ?? 1;
    const sessionPercentile = Math.min(100, 
      ((clientPattern.metrics?.totalSessions ?? 0) / benchmarkSessions) * 100
    );
    comparisons.push({
      metric: 'sessions',
      clientValue: clientPattern.metrics?.totalSessions ?? 0,
      benchmarkValue: benchmarkPattern.metrics?.totalSessions ?? 0,
      percentile: sessionPercentile,
    });

    // Duration comparison
    const benchmarkDuration = benchmarkPattern.metrics?.avgSessionDuration ?? 1;
    const durationPercentile = Math.min(100,
      ((clientPattern.metrics?.avgSessionDuration ?? 0) / benchmarkDuration) * 100
    );
    comparisons.push({
      metric: 'avg_session_duration',
      clientValue: clientPattern.metrics?.avgSessionDuration ?? 0,
      benchmarkValue: benchmarkPattern.metrics?.avgSessionDuration ?? 0,
      percentile: durationPercentile,
    });

    // Feature breadth comparison
    const clientFeatures = clientPattern.metrics?.topFeatures?.length ?? 0;
    const benchmarkFeatures = benchmarkPattern.metrics?.topFeatures?.length ?? 0;
    comparisons.push({
      metric: 'feature_breadth',
      clientValue: clientFeatures,
      benchmarkValue: benchmarkFeatures,
      percentile: benchmarkFeatures > 0 ? (clientFeatures / benchmarkFeatures) * 100 : 0,
    });

    return comparisons;
  }
}

// Raw usage data types (would come from product analytics)
export interface RawUsageData {
  startDate: Date;
  endDate: Date;
  current: PeriodUsageData;
  previous: PeriodUsageData;
}

export interface PeriodUsageData {
  sessions: Array<{
    userId: string;
    timestamp: Date;
    duration: number; // minutes
  }>;
  events: Array<{
    feature: string;
    count: number;
  }>;
}

/**
 * Create usage analyzer
 */
export function createUsageAnalyzer(): UsageAnalyzer {
  return new UsageAnalyzer();
}

