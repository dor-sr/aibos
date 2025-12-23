/**
 * Health Score Calculator
 * 
 * Calculates and tracks client health scores based on multiple factors.
 */

import { createLogger } from '@aibos/core';
import type {
  ClientAccount,
  HealthScoreMetrics,
  HealthScoreBreakdown,
  HealthRiskFactor,
} from '../types';

const logger = createLogger('employee:csm:health');

// Weight configuration for health score components
const HEALTH_WEIGHTS = {
  usage: 0.35,
  engagement: 0.25,
  financial: 0.20,
  relationship: 0.20,
};

// Thresholds for risk identification
const RISK_THRESHOLDS = {
  usage: {
    lowDAU: 0.3, // Less than 30% of expected
    lowFeatureAdoption: 0.4,
    inactiveDays: 14,
  },
  engagement: {
    lowEmailOpen: 0.1,
    highTicketCount: 10,
    lowNPS: 20,
  },
  financial: {
    latePayments: 0.8,
    nearRenewal: 30, // days
  },
};

/**
 * Health Score Calculator class
 */
export class HealthScoreCalculator {
  /**
   * Calculate comprehensive health score
   */
  calculate(metrics: HealthScoreMetrics, client: ClientAccount): HealthScoreBreakdown {
    const usageScore = this.calculateUsageScore(metrics.usage);
    const engagementScore = this.calculateEngagementScore(metrics.engagement);
    const financialScore = this.calculateFinancialScore(metrics.financial);
    const relationshipScore = this.calculateRelationshipScore(metrics.relationship);

    // Weighted overall score
    const overall = Math.round(
      usageScore * HEALTH_WEIGHTS.usage +
      engagementScore * HEALTH_WEIGHTS.engagement +
      financialScore * HEALTH_WEIGHTS.financial +
      relationshipScore * HEALTH_WEIGHTS.relationship
    );

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(metrics, client);

    // Calculate trend (would need historical data in production)
    const previousScore = client.healthScore || overall;
    const trendPercentage = previousScore > 0 
      ? ((overall - previousScore) / previousScore) * 100 
      : 0;
    const trend = trendPercentage > 5 ? 'improving' 
      : trendPercentage < -5 ? 'declining' 
      : 'stable';

    logger.info('Health score calculated', {
      clientId: client.id,
      overall,
      trend,
      riskFactorCount: riskFactors.length,
    });

    return {
      overall,
      usageScore,
      engagementScore,
      financialScore,
      relationshipScore,
      trend,
      trendPercentage,
      riskFactors,
      lastCalculatedAt: new Date(),
    };
  }

  /**
   * Calculate usage score (0-100)
   */
  private calculateUsageScore(usage: HealthScoreMetrics['usage']): number {
    let score = 0;

    // Daily active users ratio (assume WAU should have ~50% DAU)
    const dauRatio = usage.weeklyActiveUsers > 0 
      ? usage.dailyActiveUsers / (usage.weeklyActiveUsers * 0.5) 
      : 0;
    score += Math.min(30, dauRatio * 30);

    // Session duration (target: 10+ minutes)
    const durationScore = Math.min(25, (usage.sessionDuration / 10) * 25);
    score += durationScore;

    // Feature adoption rate
    score += usage.featureAdoptionRate * 25;

    // Recency of login
    if (usage.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - new Date(usage.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLogin <= 1) score += 20;
      else if (daysSinceLogin <= 3) score += 15;
      else if (daysSinceLogin <= 7) score += 10;
      else if (daysSinceLogin <= 14) score += 5;
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(engagement: HealthScoreMetrics['engagement']): number {
    let score = 0;

    // Email open rate (target: 30%+)
    score += Math.min(25, (engagement.emailOpenRate / 0.3) * 25);

    // Email click rate (target: 5%+)
    score += Math.min(20, (engagement.emailClickRate / 0.05) * 20);

    // Support ticket inverse (fewer is better, but some engagement is good)
    if (engagement.supportTicketCount === 0) {
      score += 10; // No issues or disengaged
    } else if (engagement.supportTicketCount <= 2) {
      score += 20; // Healthy engagement
    } else if (engagement.supportTicketCount <= 5) {
      score += 15; // Active but manageable
    } else if (engagement.supportTicketCount <= 10) {
      score += 5; // Concerning
    }
    // > 10 tickets = 0 points

    // NPS Score (if available, -100 to 100)
    if (engagement.npsScore !== undefined) {
      // Convert NPS to 0-25 scale
      const normalizedNPS = (engagement.npsScore + 100) / 200;
      score += normalizedNPS * 25;
    } else {
      score += 12.5; // Neutral if no NPS
    }

    // Recency of interaction
    if (engagement.lastInteractionAt) {
      const daysSinceInteraction = Math.floor(
        (Date.now() - new Date(engagement.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceInteraction <= 7) score += 10;
      else if (daysSinceInteraction <= 14) score += 7;
      else if (daysSinceInteraction <= 30) score += 4;
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate financial health score (0-100)
   */
  private calculateFinancialScore(financial: HealthScoreMetrics['financial']): number {
    let score = 0;

    // Payment status
    switch (financial.paymentStatus) {
      case 'current':
        score += 35;
        break;
      case 'late':
        score += 20;
        break;
      case 'overdue':
        score += 10;
        break;
      case 'failed':
        score += 0;
        break;
    }

    // Invoices paid on time
    score += financial.invoicesPaidOnTime * 25;

    // Expansion revenue (positive sign)
    if (financial.expansionRevenue > 0) {
      // Up to 20 points for expansion
      const expansionRatio = financial.contractValue > 0 
        ? financial.expansionRevenue / financial.contractValue 
        : 0;
      score += Math.min(20, expansionRatio * 100);
    }

    // Days until renewal risk
    if (financial.daysUntilRenewal !== undefined) {
      if (financial.daysUntilRenewal > 90) {
        score += 20;
      } else if (financial.daysUntilRenewal > 60) {
        score += 15;
      } else if (financial.daysUntilRenewal > 30) {
        score += 10;
      } else if (financial.daysUntilRenewal > 14) {
        score += 5;
      }
      // < 14 days = 0 additional points (needs attention)
    } else {
      score += 15; // No renewal date = ongoing contract
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate relationship score (0-100)
   */
  private calculateRelationshipScore(relationship: HealthScoreMetrics['relationship']): number {
    let score = 0;

    // Executive sponsor engaged
    if (relationship.executiveSponsorEngaged) {
      score += 25;
    }

    // Champion identified
    if (relationship.championIdentified) {
      score += 25;
    }

    // Recent QBR
    if (relationship.lastQbrDate) {
      const daysSinceQBR = Math.floor(
        (Date.now() - new Date(relationship.lastQbrDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceQBR <= 90) score += 20;
      else if (daysSinceQBR <= 180) score += 10;
    }

    // Success plan defined
    if (relationship.successPlanDefined) {
      score += 20;
    }

    // Referral made (strong advocate signal)
    if (relationship.referralMade) {
      score += 10;
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Identify risk factors from metrics
   */
  private identifyRiskFactors(
    metrics: HealthScoreMetrics, 
    client: ClientAccount
  ): HealthRiskFactor[] {
    const risks: HealthRiskFactor[] = [];

    // Usage risks
    if (metrics.usage.featureAdoptionRate < RISK_THRESHOLDS.usage.lowFeatureAdoption) {
      risks.push({
        category: 'usage',
        factor: 'Low Feature Adoption',
        severity: metrics.usage.featureAdoptionRate < 0.2 ? 'high' : 'medium',
        description: `Only ${Math.round(metrics.usage.featureAdoptionRate * 100)}% feature adoption rate`,
        recommendation: 'Schedule feature training session to increase adoption',
      });
    }

    if (metrics.usage.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - new Date(metrics.usage.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLogin > RISK_THRESHOLDS.usage.inactiveDays) {
        risks.push({
          category: 'usage',
          factor: 'Account Inactivity',
          severity: daysSinceLogin > 30 ? 'critical' : 'high',
          description: `No login activity for ${daysSinceLogin} days`,
          recommendation: 'Immediate outreach to understand if there are blockers',
        });
      }
    }

    // Engagement risks
    if (metrics.engagement.emailOpenRate < RISK_THRESHOLDS.engagement.lowEmailOpen) {
      risks.push({
        category: 'engagement',
        factor: 'Low Email Engagement',
        severity: 'medium',
        description: `Email open rate at ${Math.round(metrics.engagement.emailOpenRate * 100)}%`,
        recommendation: 'Review email content and try alternative communication channels',
      });
    }

    if (metrics.engagement.supportTicketCount > RISK_THRESHOLDS.engagement.highTicketCount) {
      risks.push({
        category: 'engagement',
        factor: 'High Support Volume',
        severity: metrics.engagement.supportTicketCount > 15 ? 'high' : 'medium',
        description: `${metrics.engagement.supportTicketCount} support tickets in period`,
        recommendation: 'Review ticket themes and schedule call to address recurring issues',
      });
    }

    if (metrics.engagement.npsScore !== undefined && 
        metrics.engagement.npsScore < RISK_THRESHOLDS.engagement.lowNPS) {
      risks.push({
        category: 'engagement',
        factor: 'Low NPS Score',
        severity: metrics.engagement.npsScore < 0 ? 'critical' : 'high',
        description: `NPS score is ${metrics.engagement.npsScore}`,
        recommendation: 'Personal outreach to understand concerns and create action plan',
      });
    }

    // Financial risks
    if (metrics.financial.paymentStatus === 'failed') {
      risks.push({
        category: 'financial',
        factor: 'Payment Failed',
        severity: 'critical',
        description: 'Payment method has failed',
        recommendation: 'Urgent: Contact to update payment information',
      });
    } else if (metrics.financial.paymentStatus === 'overdue') {
      risks.push({
        category: 'financial',
        factor: 'Payment Overdue',
        severity: 'high',
        description: 'Account has overdue invoices',
        recommendation: 'Follow up on payment status',
      });
    }

    if (metrics.financial.daysUntilRenewal !== undefined && 
        metrics.financial.daysUntilRenewal <= RISK_THRESHOLDS.financial.nearRenewal) {
      risks.push({
        category: 'financial',
        factor: 'Renewal Approaching',
        severity: metrics.financial.daysUntilRenewal <= 14 ? 'high' : 'medium',
        description: `Contract renewal in ${metrics.financial.daysUntilRenewal} days`,
        recommendation: 'Initiate renewal conversation and review success metrics',
      });
    }

    // Relationship risks
    if (!metrics.relationship.championIdentified) {
      risks.push({
        category: 'relationship',
        factor: 'No Champion Identified',
        severity: 'medium',
        description: 'No internal champion identified at customer organization',
        recommendation: 'Work to identify and nurture an internal champion',
      });
    }

    if (!metrics.relationship.executiveSponsorEngaged && client.planTier === 'enterprise') {
      risks.push({
        category: 'relationship',
        factor: 'No Executive Sponsor',
        severity: 'high',
        description: 'Enterprise account without engaged executive sponsor',
        recommendation: 'Request executive introduction from champion',
      });
    }

    return risks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get health status category
   */
  getHealthStatus(score: number): 'healthy' | 'at_risk' | 'critical' {
    if (score >= 70) return 'healthy';
    if (score >= 40) return 'at_risk';
    return 'critical';
  }

  /**
   * Get recommended actions based on health breakdown
   */
  getRecommendedActions(breakdown: HealthScoreBreakdown): string[] {
    const actions: string[] = [];

    // Prioritize critical risk factors
    for (const risk of breakdown.riskFactors.filter(r => r.severity === 'critical')) {
      actions.push(risk.recommendation);
    }

    // Add score-specific recommendations
    if (breakdown.usageScore < 50) {
      actions.push('Schedule product training to improve feature utilization');
    }

    if (breakdown.engagementScore < 50) {
      actions.push('Increase touchpoint frequency and personalize communications');
    }

    if (breakdown.relationshipScore < 50) {
      actions.push('Conduct stakeholder mapping and expand relationships');
    }

    if (breakdown.trend === 'declining') {
      actions.push('Urgent: Conduct health review call to identify declining factors');
    }

    return actions.slice(0, 5); // Return top 5 actions
  }
}

/**
 * Create health score calculator
 */
export function createHealthScoreCalculator(): HealthScoreCalculator {
  return new HealthScoreCalculator();
}

