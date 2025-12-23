/**
 * Churn Risk Detector
 * 
 * Analyzes customer data to identify churn risk and generate alerts.
 */

import { createLogger } from '@aibos/core';
import type {
  ClientAccount,
  HealthScoreBreakdown,
  ChurnRiskAssessment,
  ChurnRiskFactor,
  ChurnAlert,
  UsagePattern,
} from '../types';

const logger = createLogger('employee:csm:churn');

// Risk factor weights
const RISK_WEIGHTS = {
  healthScore: 0.30,
  usageTrend: 0.25,
  engagementDecline: 0.20,
  renewalProximity: 0.15,
  supportIssues: 0.10,
};

// Risk thresholds
const RISK_THRESHOLDS = {
  criticalHealthScore: 30,
  highHealthScore: 50,
  usageDeclinePercent: 30,
  engagementDeclinePercent: 40,
  criticalRenewalDays: 30,
  highSupportTickets: 8,
};

/**
 * Churn Risk Detector
 */
export class ChurnRiskDetector {
  private alerts: Map<string, ChurnAlert> = new Map();

  /**
   * Assess churn risk for a client
   */
  assessRisk(
    client: ClientAccount,
    healthBreakdown: HealthScoreBreakdown,
    usagePattern?: UsagePattern
  ): ChurnRiskAssessment {
    const factors: ChurnRiskFactor[] = [];
    let totalRiskScore = 0;

    // Factor 1: Health Score Risk
    const healthRisk = this.calculateHealthRisk(healthBreakdown);
    factors.push(healthRisk.factor);
    totalRiskScore += healthRisk.contribution * RISK_WEIGHTS.healthScore;

    // Factor 2: Usage Trend Risk
    const usageRisk = this.calculateUsageRisk(usagePattern);
    if (usageRisk) {
      factors.push(usageRisk.factor);
      totalRiskScore += usageRisk.contribution * RISK_WEIGHTS.usageTrend;
    }

    // Factor 3: Engagement Decline Risk
    const engagementRisk = this.calculateEngagementRisk(healthBreakdown);
    factors.push(engagementRisk.factor);
    totalRiskScore += engagementRisk.contribution * RISK_WEIGHTS.engagementDecline;

    // Factor 4: Renewal Proximity Risk
    const renewalRisk = this.calculateRenewalRisk(client);
    if (renewalRisk) {
      factors.push(renewalRisk.factor);
      totalRiskScore += renewalRisk.contribution * RISK_WEIGHTS.renewalProximity;
    }

    // Factor 5: Lifecycle Stage Risk
    const lifecycleRisk = this.calculateLifecycleRisk(client);
    factors.push(lifecycleRisk.factor);
    totalRiskScore += lifecycleRisk.contribution * 0.1;

    // Normalize risk score
    const riskScore = Math.min(1, Math.max(0, totalRiskScore));
    const riskLevel = this.determineRiskLevel(riskScore);

    // Calculate predicted churn date
    let predictedChurnDate: Date | undefined;
    if (riskLevel !== 'low') {
      const daysToChurn = Math.round((1 - riskScore) * 90) + 30;
      predictedChurnDate = new Date();
      predictedChurnDate.setDate(predictedChurnDate.getDate() + daysToChurn);
    }

    // Generate mitigation actions
    const mitigationActions = this.generateMitigationActions(factors, riskLevel, client);

    // Calculate confidence based on data completeness
    const confidence = this.calculateConfidence(healthBreakdown, usagePattern);

    logger.info('Churn risk assessed', {
      clientId: client.id,
      riskScore,
      riskLevel,
      factorCount: factors.length,
    });

    return {
      clientId: client.id,
      riskScore,
      riskLevel,
      predictedChurnDate,
      riskFactors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
      mitigationActions,
      confidence,
      assessedAt: new Date(),
    };
  }

  /**
   * Calculate health-based risk
   */
  private calculateHealthRisk(health: HealthScoreBreakdown): { 
    factor: ChurnRiskFactor; 
    contribution: number;
  } {
    let contribution = 0;
    let description = '';
    let mitigation = '';

    if (health.overall < RISK_THRESHOLDS.criticalHealthScore) {
      contribution = 1;
      description = `Critical health score of ${health.overall}`;
      mitigation = 'Immediate intervention required - schedule executive review';
    } else if (health.overall < RISK_THRESHOLDS.highHealthScore) {
      contribution = 0.7;
      description = `Low health score of ${health.overall}`;
      mitigation = 'Proactive outreach to address concerns';
    } else if (health.trend === 'declining') {
      contribution = 0.5;
      description = `Health trending down (${health.trendPercentage.toFixed(1)}% decline)`;
      mitigation = 'Investigate causes of declining metrics';
    } else {
      contribution = (100 - health.overall) / 200; // Max 0.5 for healthy accounts
      description = `Health score: ${health.overall}`;
    }

    return {
      factor: {
        factor: 'Health Score',
        impact: contribution,
        direction: contribution > 0.3 ? 'negative' : 'positive',
        description,
        mitigation,
      },
      contribution,
    };
  }

  /**
   * Calculate usage-based risk
   */
  private calculateUsageRisk(usage?: UsagePattern): { 
    factor: ChurnRiskFactor; 
    contribution: number;
  } | null {
    if (!usage) return null;

    const declineTrends = usage.trends.filter(t => 
      t.direction === 'down' && t.significance !== 'low'
    );

    if (declineTrends.length === 0) {
      return {
        factor: {
          factor: 'Usage Trend',
          impact: 0,
          direction: 'positive',
          description: 'Usage patterns stable or improving',
        },
        contribution: 0,
      };
    }

    // Calculate average decline
    const avgDecline = declineTrends.reduce((sum, t) => sum + Math.abs(t.changePercentage), 0) 
      / declineTrends.length;

    const contribution = Math.min(1, avgDecline / 100);

    return {
      factor: {
        factor: 'Usage Decline',
        impact: contribution,
        direction: 'negative',
        description: `${declineTrends.length} metrics declining (avg ${avgDecline.toFixed(0)}%)`,
        mitigation: 'Schedule product usage review to identify adoption barriers',
      },
      contribution,
    };
  }

  /**
   * Calculate engagement risk
   */
  private calculateEngagementRisk(health: HealthScoreBreakdown): { 
    factor: ChurnRiskFactor; 
    contribution: number;
  } {
    const engagementScore = health.engagementScore;
    let contribution = 0;
    let description = '';
    let mitigation = '';

    if (engagementScore < 30) {
      contribution = 0.9;
      description = 'Very low engagement - minimal interaction';
      mitigation = 'Try alternative communication channels, personalize outreach';
    } else if (engagementScore < 50) {
      contribution = 0.6;
      description = 'Low engagement - sporadic interaction';
      mitigation = 'Increase touchpoint frequency with valuable content';
    } else if (engagementScore < 70) {
      contribution = 0.3;
      description = 'Moderate engagement';
      mitigation = 'Continue nurturing relationship';
    } else {
      contribution = 0.1;
      description = 'Strong engagement';
    }

    return {
      factor: {
        factor: 'Engagement Level',
        impact: contribution,
        direction: contribution > 0.4 ? 'negative' : 'positive',
        description,
        mitigation,
      },
      contribution,
    };
  }

  /**
   * Calculate renewal proximity risk
   */
  private calculateRenewalRisk(client: ClientAccount): { 
    factor: ChurnRiskFactor; 
    contribution: number;
  } | null {
    if (!client.renewalDate) return null;

    const daysUntilRenewal = Math.floor(
      (new Date(client.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let contribution = 0;
    let description = '';
    let mitigation = '';

    if (daysUntilRenewal < 0) {
      contribution = 0.9;
      description = 'Contract expired - renewal overdue';
      mitigation = 'Urgent: Finalize renewal discussions';
    } else if (daysUntilRenewal <= RISK_THRESHOLDS.criticalRenewalDays) {
      contribution = 0.7;
      description = `Renewal in ${daysUntilRenewal} days`;
      mitigation = 'Accelerate renewal conversation, address any concerns';
    } else if (daysUntilRenewal <= 60) {
      contribution = 0.4;
      description = `Renewal approaching in ${daysUntilRenewal} days`;
      mitigation = 'Begin renewal preparation, conduct success review';
    } else if (daysUntilRenewal <= 90) {
      contribution = 0.2;
      description = `Renewal in ${daysUntilRenewal} days`;
      mitigation = 'Standard renewal process initiation';
    } else {
      contribution = 0;
      description = 'Renewal > 90 days away';
    }

    return {
      factor: {
        factor: 'Renewal Timeline',
        impact: contribution,
        direction: contribution > 0.3 ? 'negative' : 'positive',
        description,
        mitigation,
      },
      contribution,
    };
  }

  /**
   * Calculate lifecycle stage risk
   */
  private calculateLifecycleRisk(client: ClientAccount): { 
    factor: ChurnRiskFactor; 
    contribution: number;
  } {
    const riskByStage: Record<typeof client.lifecycleStage, number> = {
      onboarding: 0.3, // High risk during initial period
      adoption: 0.4, // Critical period
      growth: 0.1,
      mature: 0.15,
      renewal: 0.5,
      at_risk: 0.8,
      churned: 1,
    };

    const contribution = riskByStage[client.lifecycleStage] || 0.2;

    return {
      factor: {
        factor: 'Lifecycle Stage',
        impact: contribution,
        direction: contribution > 0.4 ? 'negative' : 'positive',
        description: `Client in ${client.lifecycleStage} stage`,
        mitigation: client.lifecycleStage === 'at_risk' 
          ? 'Activate save playbook' 
          : undefined,
      },
      contribution,
    };
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): ChurnRiskAssessment['riskLevel'] {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Generate mitigation actions
   */
  private generateMitigationActions(
    factors: ChurnRiskFactor[],
    riskLevel: ChurnRiskAssessment['riskLevel'],
    client: ClientAccount
  ): string[] {
    const actions: string[] = [];

    // Risk-level based actions
    switch (riskLevel) {
      case 'critical':
        actions.push('URGENT: Schedule executive-to-executive call within 48 hours');
        actions.push('Prepare detailed value demonstration and ROI analysis');
        actions.push('Identify internal champions and engage them');
        break;
      case 'high':
        actions.push('Schedule strategic review call within 1 week');
        actions.push('Send personalized outreach from CSM leadership');
        actions.push('Offer dedicated support session for outstanding issues');
        break;
      case 'medium':
        actions.push('Increase check-in frequency');
        actions.push('Share relevant success stories and best practices');
        actions.push('Proactively address any open support tickets');
        break;
      case 'low':
        actions.push('Continue standard engagement cadence');
        actions.push('Look for expansion opportunities');
        break;
    }

    // Factor-specific actions
    for (const factor of factors) {
      if (factor.mitigation && !actions.includes(factor.mitigation)) {
        actions.push(factor.mitigation);
      }
    }

    // Client-specific actions
    if (client.mrr > 10000 && riskLevel !== 'low') {
      actions.push('Flag for executive review - high-value account at risk');
    }

    if (client.planTier === 'enterprise') {
      actions.push('Review SLA compliance and dedicated support utilization');
    }

    return actions.slice(0, 6); // Max 6 actions
  }

  /**
   * Calculate confidence in assessment
   */
  private calculateConfidence(
    health: HealthScoreBreakdown,
    usage?: UsagePattern
  ): number {
    let confidence = 0.5; // Base confidence

    // Health data completeness
    if (health.riskFactors.length > 0) confidence += 0.15;
    if (health.trend !== 'stable') confidence += 0.05;

    // Usage data availability
    if (usage) {
      confidence += 0.15;
      if (usage.trends.length > 0) confidence += 0.1;
      if (usage.anomalies.length > 0) confidence += 0.05;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Create churn alert
   */
  createAlert(
    assessment: ChurnRiskAssessment,
    client: ClientAccount,
    triggerReason: string
  ): ChurnAlert {
    const alertId = `alert_${Date.now()}_${client.id}`;

    const alert: ChurnAlert = {
      id: alertId,
      clientId: client.id,
      clientName: client.name,
      riskLevel: assessment.riskLevel,
      riskScore: assessment.riskScore,
      triggerReason,
      topRiskFactors: assessment.riskFactors.slice(0, 3),
      recommendedActions: assessment.mitigationActions,
      status: 'new',
      createdAt: new Date(),
    };

    this.alerts.set(alertId, alert);

    logger.info('Churn alert created', {
      alertId,
      clientId: client.id,
      riskLevel: assessment.riskLevel,
    });

    return alert;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string): ChurnAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.assignedTo = userId;
    alert.acknowledgedAt = new Date();

    return alert;
  }

  /**
   * Update alert status
   */
  updateAlertStatus(
    alertId: string, 
    status: ChurnAlert['status']
  ): ChurnAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = status;
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
    }

    return alert;
  }

  /**
   * Get open alerts
   */
  getOpenAlerts(): ChurnAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.status !== 'resolved')
      .sort((a, b) => {
        const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return levelOrder[a.riskLevel] - levelOrder[b.riskLevel];
      });
  }

  /**
   * Get alerts by client
   */
  getClientAlerts(clientId: string): ChurnAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Should create alert for assessment
   */
  shouldAlert(
    assessment: ChurnRiskAssessment,
    existingAlerts: ChurnAlert[]
  ): boolean {
    // Always alert for critical
    if (assessment.riskLevel === 'critical') return true;

    // Don't create duplicate alerts
    const hasOpenAlert = existingAlerts.some(a => 
      a.status !== 'resolved' && a.riskLevel === assessment.riskLevel
    );
    if (hasOpenAlert) return false;

    // Alert for high risk if no existing alerts
    if (assessment.riskLevel === 'high') return true;

    // Alert for medium if score increased significantly
    // (would need historical comparison in production)

    return false;
  }
}

/**
 * Create churn risk detector
 */
export function createChurnDetector(): ChurnRiskDetector {
  return new ChurnRiskDetector();
}

