/**
 * Upsell Opportunity Detector
 * 
 * Identifies upsell and expansion opportunities based on usage patterns and signals.
 */

import { createLogger } from '@aibos/core';
import type {
  ClientAccount,
  HealthScoreBreakdown,
  UsagePattern,
  UpsellOpportunity,
  UpsellType,
  UpsellSignal,
} from '../types';

const logger = createLogger('employee:csm:upsell');

// Signal detection thresholds
const SIGNAL_THRESHOLDS = {
  highUsage: {
    dauRatio: 0.8, // 80% of seats actively used
    featureAdoption: 0.7,
    sessionDuration: 30, // minutes
  },
  growth: {
    userGrowth: 0.2, // 20% growth
    usageGrowth: 0.3,
  },
  engagement: {
    highNPS: 50,
    referralMade: true,
  },
  financial: {
    currentPayments: true,
    expansionHistory: true,
  },
};

// Plan upgrade paths
const UPGRADE_PATHS: Record<string, { next: string; valueIncrease: number }> = {
  free: { next: 'starter', valueIncrease: 29 },
  starter: { next: 'pro', valueIncrease: 70 },
  pro: { next: 'enterprise', valueIncrease: 200 },
};

/**
 * Upsell Opportunity Detector
 */
export class UpsellOpportunityDetector {
  private opportunities: Map<string, UpsellOpportunity> = new Map();

  /**
   * Detect upsell opportunities for a client
   */
  detectOpportunities(
    client: ClientAccount,
    health: HealthScoreBreakdown,
    usage?: UsagePattern
  ): UpsellOpportunity[] {
    const opportunities: UpsellOpportunity[] = [];

    // Only detect for healthy clients
    if (health.overall < 60) {
      logger.debug('Skipping upsell detection for unhealthy client', {
        clientId: client.id,
        healthScore: health.overall,
      });
      return [];
    }

    // Detect different opportunity types
    const planUpgrade = this.detectPlanUpgrade(client, health, usage);
    if (planUpgrade) opportunities.push(planUpgrade);

    const seatExpansion = this.detectSeatExpansion(client, usage);
    if (seatExpansion) opportunities.push(seatExpansion);

    const featureAddon = this.detectFeatureAddon(client, usage);
    if (featureAddon) opportunities.push(featureAddon);

    const contractExtension = this.detectContractExtension(client, health);
    if (contractExtension) opportunities.push(contractExtension);

    // Store opportunities
    for (const opp of opportunities) {
      this.opportunities.set(opp.id, opp);
    }

    logger.info('Upsell opportunities detected', {
      clientId: client.id,
      count: opportunities.length,
      types: opportunities.map(o => o.type),
    });

    return opportunities;
  }

  /**
   * Detect plan upgrade opportunity
   */
  private detectPlanUpgrade(
    client: ClientAccount,
    health: HealthScoreBreakdown,
    usage?: UsagePattern
  ): UpsellOpportunity | null {
    const upgradePath = UPGRADE_PATHS[client.planTier];
    if (!upgradePath) return null; // Already on highest tier

    const signals: UpsellSignal[] = [];
    let totalConfidence = 0;

    // Signal 1: High health score
    if (health.overall >= 80) {
      signals.push({
        signal: 'Excellent account health',
        strength: 'strong',
        evidence: `Health score of ${health.overall}`,
      });
      totalConfidence += 0.25;
    } else if (health.overall >= 70) {
      signals.push({
        signal: 'Good account health',
        strength: 'moderate',
        evidence: `Health score of ${health.overall}`,
      });
      totalConfidence += 0.15;
    }

    // Signal 2: High usage score
    if (health.usageScore >= 80) {
      signals.push({
        signal: 'Power user engagement',
        strength: 'strong',
        evidence: `Usage score of ${health.usageScore}`,
      });
      totalConfidence += 0.2;
    }

    // Signal 3: Feature adoption at limit
    if (usage) {
      const atLimitFeatures = usage.metrics.topFeatures.filter(f => f.percentage > 90);
      if (atLimitFeatures.length > 0) {
        signals.push({
          signal: 'Features at usage limit',
          strength: 'strong',
          evidence: `${atLimitFeatures.length} features at >90% usage`,
        });
        totalConfidence += 0.25;
      }
    }

    // Signal 4: Growing relationship
    if (health.relationshipScore >= 70) {
      signals.push({
        signal: 'Strong relationship',
        strength: 'moderate',
        evidence: `Relationship score of ${health.relationshipScore}`,
      });
      totalConfidence += 0.1;
    }

    // Signal 5: Positive trend
    if (health.trend === 'improving') {
      signals.push({
        signal: 'Metrics improving',
        strength: 'moderate',
        evidence: `${health.trendPercentage.toFixed(1)}% improvement`,
      });
      totalConfidence += 0.1;
    }

    // Need minimum confidence to create opportunity
    if (totalConfidence < 0.4) return null;

    return {
      id: `opp_upgrade_${Date.now()}_${client.id}`,
      clientId: client.id,
      clientName: client.name,
      type: 'plan_upgrade',
      currentPlan: client.plan,
      recommendedPlan: upgradePath.next,
      estimatedValue: upgradePath.valueIncrease * 12, // Annual value
      confidence: Math.min(0.95, totalConfidence),
      signals,
      status: 'identified',
      priority: totalConfidence >= 0.7 ? 'high' : 'medium',
      createdAt: new Date(),
    };
  }

  /**
   * Detect seat expansion opportunity
   */
  private detectSeatExpansion(
    client: ClientAccount,
    usage?: UsagePattern
  ): UpsellOpportunity | null {
    if (!usage) return null;

    const signals: UpsellSignal[] = [];
    let totalConfidence = 0;

    // Signal 1: High DAU/seat ratio
    const totalSeats = 10; // Would come from client data
    const dauRatio = usage.metrics.uniqueUsers / totalSeats;
    
    if (dauRatio >= SIGNAL_THRESHOLDS.highUsage.dauRatio) {
      signals.push({
        signal: 'High seat utilization',
        strength: 'strong',
        evidence: `${Math.round(dauRatio * 100)}% of seats actively used`,
      });
      totalConfidence += 0.3;
    }

    // Signal 2: User growth trend
    const userTrend = usage.trends.find(t => t.metric === 'unique_users');
    if (userTrend && userTrend.direction === 'up' && userTrend.changePercentage > 10) {
      signals.push({
        signal: 'Growing user base',
        strength: userTrend.changePercentage > 20 ? 'strong' : 'moderate',
        evidence: `${userTrend.changePercentage.toFixed(0)}% user growth`,
      });
      totalConfidence += 0.25;
    }

    // Signal 3: Multiple active users per day
    if (usage.metrics.uniqueUsers > totalSeats * 0.9) {
      signals.push({
        signal: 'Near seat limit',
        strength: 'strong',
        evidence: `${usage.metrics.uniqueUsers} active users approaching ${totalSeats} seat limit`,
      });
      totalConfidence += 0.25;
    }

    if (totalConfidence < 0.4) return null;

    const additionalSeats = Math.ceil(usage.metrics.uniqueUsers * 0.2); // 20% more
    const pricePerSeat = client.mrr / totalSeats;

    return {
      id: `opp_seats_${Date.now()}_${client.id}`,
      clientId: client.id,
      clientName: client.name,
      type: 'seat_expansion',
      currentPlan: client.plan,
      product: `${additionalSeats} additional seats`,
      estimatedValue: additionalSeats * pricePerSeat * 12,
      confidence: Math.min(0.9, totalConfidence),
      signals,
      status: 'identified',
      priority: totalConfidence >= 0.6 ? 'high' : 'medium',
      createdAt: new Date(),
    };
  }

  /**
   * Detect feature addon opportunity
   */
  private detectFeatureAddon(
    client: ClientAccount,
    usage?: UsagePattern
  ): UpsellOpportunity | null {
    if (!usage) return null;

    const signals: UpsellSignal[] = [];
    let totalConfidence = 0;

    // Signal 1: High adoption of related features
    const highUsageFeatures = usage.metrics.topFeatures.filter(f => f.percentage > 80);
    if (highUsageFeatures.length >= 3) {
      signals.push({
        signal: 'High feature adoption',
        strength: 'strong',
        evidence: `${highUsageFeatures.length} features heavily used`,
      });
      totalConfidence += 0.25;
    }

    // Signal 2: Usage of adjacent feature areas
    const underutilized = usage.metrics.underutilizedFeatures;
    if (underutilized.length > 0) {
      // If they're using related features but not premium ones
      signals.push({
        signal: 'Feature gaps identified',
        strength: 'moderate',
        evidence: `${underutilized.length} premium features not yet adopted`,
      });
      totalConfidence += 0.2;
    }

    // Signal 3: Requests for features
    // Would come from support ticket analysis

    if (totalConfidence < 0.35) return null;

    return {
      id: `opp_addon_${Date.now()}_${client.id}`,
      clientId: client.id,
      clientName: client.name,
      type: 'feature_addon',
      currentPlan: client.plan,
      product: 'Premium Feature Pack', // Would be determined by analysis
      estimatedValue: client.mrr * 0.3 * 12, // 30% MRR increase
      confidence: Math.min(0.85, totalConfidence),
      signals,
      status: 'identified',
      priority: 'medium',
      createdAt: new Date(),
    };
  }

  /**
   * Detect contract extension opportunity
   */
  private detectContractExtension(
    client: ClientAccount,
    health: HealthScoreBreakdown
  ): UpsellOpportunity | null {
    // Only for clients with upcoming renewals
    if (!client.renewalDate) return null;

    const daysUntilRenewal = Math.floor(
      (new Date(client.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Check if in renewal window (60-90 days out)
    if (daysUntilRenewal < 60 || daysUntilRenewal > 90) return null;

    const signals: UpsellSignal[] = [];
    let totalConfidence = 0;

    // Signal 1: Strong health
    if (health.overall >= 75) {
      signals.push({
        signal: 'Strong account health',
        strength: 'strong',
        evidence: `Health score of ${health.overall}`,
      });
      totalConfidence += 0.3;
    }

    // Signal 2: Good relationship
    if (health.relationshipScore >= 70) {
      signals.push({
        signal: 'Positive relationship',
        strength: 'moderate',
        evidence: `Relationship score of ${health.relationshipScore}`,
      });
      totalConfidence += 0.2;
    }

    // Signal 3: Improving metrics
    if (health.trend === 'improving') {
      signals.push({
        signal: 'Growing success',
        strength: 'strong',
        evidence: 'Metrics trending positively',
      });
      totalConfidence += 0.2;
    }

    // Signal 4: Financial health
    if (health.financialScore >= 80) {
      signals.push({
        signal: 'Reliable payment history',
        strength: 'moderate',
        evidence: `Financial score of ${health.financialScore}`,
      });
      totalConfidence += 0.15;
    }

    if (totalConfidence < 0.5) return null;

    // Multi-year discount value
    const annualDiscount = 0.15; // 15% discount for 2+ year commit
    const estimatedValue = client.arr * annualDiscount * 2; // Extra year value

    return {
      id: `opp_extend_${Date.now()}_${client.id}`,
      clientId: client.id,
      clientName: client.name,
      type: 'contract_extension',
      currentPlan: client.plan,
      product: '2-year contract with discount',
      estimatedValue,
      confidence: Math.min(0.85, totalConfidence),
      signals,
      status: 'identified',
      priority: 'high',
      recommendedTiming: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
    };
  }

  /**
   * Get opportunity by ID
   */
  getOpportunity(opportunityId: string): UpsellOpportunity | undefined {
    return this.opportunities.get(opportunityId);
  }

  /**
   * Get client opportunities
   */
  getClientOpportunities(clientId: string): UpsellOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.clientId === clientId)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get all active opportunities
   */
  getActiveOpportunities(): UpsellOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.status !== 'won' && o.status !== 'lost')
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * Update opportunity status
   */
  updateOpportunityStatus(
    opportunityId: string,
    status: UpsellOpportunity['status'],
    notes?: string
  ): UpsellOpportunity | null {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return null;

    opp.status = status;
    if (notes) opp.notes = notes;

    if (status === 'proposed') {
      opp.proposedAt = new Date();
    } else if (status === 'won' || status === 'lost') {
      opp.closedAt = new Date();
    }

    logger.info('Opportunity status updated', {
      opportunityId,
      status,
      clientId: opp.clientId,
    });

    return opp;
  }

  /**
   * Get opportunity summary for portfolio
   */
  getPortfolioSummary(): {
    totalOpportunities: number;
    totalPipelineValue: number;
    byType: Record<UpsellType, number>;
    byPriority: Record<string, number>;
  } {
    const active = this.getActiveOpportunities();

    const byType: Record<UpsellType, number> = {
      plan_upgrade: 0,
      seat_expansion: 0,
      feature_addon: 0,
      contract_extension: 0,
      cross_sell: 0,
      usage_based: 0,
    };

    const byPriority: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalPipelineValue = 0;

    for (const opp of active) {
      const currentTypeCount = byType[opp.type];
      if (currentTypeCount !== undefined) {
        byType[opp.type] = currentTypeCount + 1;
      }
      const currentPriorityCount = byPriority[opp.priority];
      if (currentPriorityCount !== undefined) {
        byPriority[opp.priority] = currentPriorityCount + 1;
      }
      totalPipelineValue += opp.estimatedValue;
    }

    return {
      totalOpportunities: active.length,
      totalPipelineValue,
      byType,
      byPriority,
    };
  }

  /**
   * Get recommended talking points for opportunity
   */
  getTalkingPoints(opportunity: UpsellOpportunity): string[] {
    const points: string[] = [];

    switch (opportunity.type) {
      case 'plan_upgrade':
        points.push('Review current usage patterns and limitations');
        points.push(`Highlight ${opportunity.recommendedPlan} features that address their needs`);
        points.push('Share ROI case studies from similar customers');
        points.push('Discuss implementation timeline and support');
        break;

      case 'seat_expansion':
        points.push('Discuss team growth and additional use cases');
        points.push('Offer volume discount for larger commitment');
        points.push('Explain onboarding support for new users');
        break;

      case 'feature_addon':
        points.push('Demonstrate value of premium features');
        points.push('Connect features to their specific workflow');
        points.push('Offer trial period for evaluation');
        break;

      case 'contract_extension':
        points.push('Review achievements and ROI from current term');
        points.push('Present multi-year discount and locked pricing');
        points.push('Outline roadmap features they will benefit from');
        points.push('Discuss enhanced support options');
        break;
    }

    // Add signal-based points
    for (const signal of opportunity.signals?.filter(s => s.strength === 'strong') ?? []) {
      points.push(`Leverage: ${signal.signal}`);
    }

    return points;
  }
}

/**
 * Create upsell opportunity detector
 */
export function createUpsellDetector(): UpsellOpportunityDetector {
  return new UpsellOpportunityDetector();
}

