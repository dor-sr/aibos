/**
 * Progressive Trust System
 * 
 * Manages trust levels and action approval based on confidence and history.
 */

import { createLogger } from '@aibos/core';
import type {
  TrustLevel,
  TrustConfig,
  ActionType,
  ActionRiskLevel,
  EmployeeTrustMetrics,
  EscalationRule,
} from '../types';

const logger = createLogger('employee:trust');

// Default trust configuration
export const DEFAULT_TRUST_CONFIG: TrustConfig = {
  defaultLevel: 'requires_approval',
  actionOverrides: {},
  autoApproveThreshold: 0.85,
  escalationRules: [
    {
      id: 'low_confidence',
      condition: 'low_confidence',
      action: 'require_approval',
    },
    {
      id: 'high_risk',
      condition: 'high_risk',
      action: 'require_approval',
    },
  ],
};

// Risk levels for action types
export const ACTION_RISK_LEVELS: Record<ActionType, ActionRiskLevel> = {
  send_message: 'medium',
  send_email: 'medium',
  create_task: 'low',
  update_task: 'low',
  schedule_meeting: 'medium',
  create_reminder: 'low',
  escalate: 'low',
  update_contact: 'low',
  log_interaction: 'low',
  custom: 'high',
};

// Thresholds for trust level advancement
const TRUST_ADVANCEMENT_THRESHOLDS = {
  requires_approval: {
    minApprovalRate: 0.8,
    minActions: 20,
    nextLevel: 'low_confidence' as TrustLevel,
  },
  low_confidence: {
    minApprovalRate: 0.85,
    minActions: 50,
    nextLevel: 'high_confidence' as TrustLevel,
  },
  high_confidence: {
    minApprovalRate: 0.9,
    minActions: 100,
    nextLevel: 'autonomous' as TrustLevel,
  },
  autonomous: {
    minApprovalRate: 1.0,
    minActions: Infinity,
    nextLevel: 'autonomous' as TrustLevel,
  },
};

export interface TrustDecision {
  requiresApproval: boolean;
  confidenceScore: number;
  trustLevel: TrustLevel;
  reason: string;
  escalationTriggered?: string;
}

export interface ActionContext {
  actionType: ActionType;
  contactId?: string;
  isNewContact?: boolean;
  contentSensitivity?: 'low' | 'medium' | 'high';
  similarActionsCount?: number;
  historicalApprovalRate?: number;
}

/**
 * Trust Manager class
 */
export class TrustManager {
  private config: TrustConfig;
  private metrics: Map<ActionType, EmployeeTrustMetrics> = new Map();
  private employeeId: string;

  constructor(employeeId: string, config: TrustConfig = DEFAULT_TRUST_CONFIG) {
    this.employeeId = employeeId;
    this.config = { ...DEFAULT_TRUST_CONFIG, ...config };
  }

  /**
   * Evaluate if an action requires approval
   */
  evaluate(context: ActionContext): TrustDecision {
    const { actionType } = context;
    const riskLevel = ACTION_RISK_LEVELS[actionType];
    
    // Get trust level for this action type
    const trustLevel = this.getTrustLevel(actionType);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(context);
    
    // Check escalation rules
    const escalation = this.checkEscalationRules(context, confidenceScore, riskLevel);
    if (escalation) {
      return {
        requiresApproval: true,
        confidenceScore,
        trustLevel,
        reason: `Escalation rule triggered: ${escalation.id}`,
        escalationTriggered: escalation.id,
      };
    }

    // Determine if approval is required based on trust level
    let requiresApproval: boolean;
    let reason: string;

    switch (trustLevel) {
      case 'requires_approval':
        requiresApproval = true;
        reason = 'Trust level requires all actions to be approved';
        break;

      case 'low_confidence':
        requiresApproval = confidenceScore < this.config.autoApproveThreshold || riskLevel === 'high';
        reason = requiresApproval 
          ? `Confidence (${confidenceScore.toFixed(2)}) below threshold or high risk action`
          : 'Confidence above threshold';
        break;

      case 'high_confidence':
        requiresApproval = riskLevel === 'critical' || confidenceScore < 0.7;
        reason = requiresApproval
          ? 'Critical risk action or low confidence'
          : 'High confidence allows auto-approval';
        break;

      case 'autonomous':
        requiresApproval = riskLevel === 'critical';
        reason = requiresApproval
          ? 'Critical risk actions always require approval'
          : 'Autonomous mode - auto-approved';
        break;

      default:
        requiresApproval = true;
        reason = 'Unknown trust level';
    }

    return {
      requiresApproval,
      confidenceScore,
      trustLevel,
      reason,
    };
  }

  /**
   * Get trust level for an action type
   */
  getTrustLevel(actionType: ActionType): TrustLevel {
    // Check for action-specific override
    if (this.config.actionOverrides[actionType]) {
      return this.config.actionOverrides[actionType];
    }
    
    // Check metrics for earned trust level
    const metrics = this.metrics.get(actionType);
    if (metrics) {
      return metrics.currentTrustLevel;
    }

    return this.config.defaultLevel;
  }

  /**
   * Calculate confidence score for an action
   */
  private calculateConfidence(context: ActionContext): number {
    let confidence = 0.5; // Base confidence

    // Factor in historical approval rate
    if (context.historicalApprovalRate !== undefined) {
      confidence += (context.historicalApprovalRate - 0.5) * 0.3;
    }

    // Factor in similar actions count (familiarity)
    if (context.similarActionsCount !== undefined) {
      const familiarityBoost = Math.min(context.similarActionsCount / 100, 0.2);
      confidence += familiarityBoost;
    }

    // Reduce for new contacts
    if (context.isNewContact) {
      confidence -= 0.15;
    }

    // Reduce for sensitive content
    if (context.contentSensitivity === 'high') {
      confidence -= 0.2;
    } else if (context.contentSensitivity === 'medium') {
      confidence -= 0.1;
    }

    // Factor in action type risk
    const riskLevel = ACTION_RISK_LEVELS[context.actionType];
    switch (riskLevel) {
      case 'low':
        confidence += 0.1;
        break;
      case 'medium':
        break;
      case 'high':
        confidence -= 0.15;
        break;
      case 'critical':
        confidence -= 0.3;
        break;
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Check escalation rules
   */
  private checkEscalationRules(
    context: ActionContext,
    confidence: number,
    riskLevel: ActionRiskLevel
  ): EscalationRule | null {
    for (const rule of this.config.escalationRules) {
      let triggered = false;

      switch (rule.condition) {
        case 'low_confidence':
          triggered = confidence < 0.3;
          break;
        case 'high_risk':
          triggered = riskLevel === 'high' || riskLevel === 'critical';
          break;
        case 'unknown_contact':
          triggered = context.isNewContact === true;
          break;
        case 'sensitive_topic':
          triggered = context.contentSensitivity === 'high';
          break;
      }

      if (triggered) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Record action outcome for trust learning
   */
  recordOutcome(
    actionType: ActionType,
    approved: boolean,
    wasAutoApproved: boolean
  ): void {
    let metrics = this.metrics.get(actionType);

    if (!metrics) {
      metrics = {
        id: `trust_${this.employeeId}_${actionType}`,
        employeeId: this.employeeId,
        actionType,
        totalActions: 0,
        approvedCount: 0,
        rejectedCount: 0,
        autoApprovedCount: 0,
        averageConfidence: 0.5,
        currentTrustLevel: this.config.defaultLevel,
        updatedAt: new Date(),
      };
    }

    // Update counts
    metrics.totalActions++;
    if (approved) {
      metrics.approvedCount++;
      if (wasAutoApproved) {
        metrics.autoApprovedCount++;
      }
    } else {
      metrics.rejectedCount++;
    }

    // Check for trust level advancement
    metrics.currentTrustLevel = this.calculateNewTrustLevel(metrics);
    metrics.updatedAt = new Date();

    this.metrics.set(actionType, metrics);

    logger.debug('Trust outcome recorded', {
      actionType,
      approved,
      wasAutoApproved,
      newTrustLevel: metrics.currentTrustLevel,
    });
  }

  /**
   * Calculate if trust level should advance
   */
  private calculateNewTrustLevel(metrics: EmployeeTrustMetrics): TrustLevel {
    const currentLevel = metrics.currentTrustLevel;
    const thresholds = TRUST_ADVANCEMENT_THRESHOLDS[currentLevel];

    if (!thresholds) {
      return currentLevel;
    }

    const approvalRate = metrics.approvedCount / metrics.totalActions;

    // Check if eligible for advancement
    if (
      metrics.totalActions >= thresholds.minActions &&
      approvalRate >= thresholds.minApprovalRate
    ) {
      logger.info('Trust level advanced', {
        employeeId: this.employeeId,
        actionType: metrics.actionType,
        from: currentLevel,
        to: thresholds.nextLevel,
      });
      return thresholds.nextLevel;
    }

    // Check for demotion (too many rejections)
    if (metrics.rejectedCount > 5 && approvalRate < 0.6) {
      const previousLevel = this.getPreviousTrustLevel(currentLevel);
      if (previousLevel !== currentLevel) {
        logger.warn('Trust level demoted', {
          employeeId: this.employeeId,
          actionType: metrics.actionType,
          from: currentLevel,
          to: previousLevel,
        });
        return previousLevel;
      }
    }

    return currentLevel;
  }

  /**
   * Get previous trust level for demotion
   */
  private getPreviousTrustLevel(current: TrustLevel): TrustLevel {
    switch (current) {
      case 'autonomous':
        return 'high_confidence';
      case 'high_confidence':
        return 'low_confidence';
      case 'low_confidence':
        return 'requires_approval';
      default:
        return 'requires_approval';
    }
  }

  /**
   * Get metrics for an action type
   */
  getMetrics(actionType: ActionType): EmployeeTrustMetrics | undefined {
    return this.metrics.get(actionType);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): EmployeeTrustMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get overall trust summary
   */
  getSummary(): {
    overallTrustLevel: TrustLevel;
    actionCount: number;
    approvalRate: number;
    autonomousActions: number;
  } {
    let totalActions = 0;
    let totalApproved = 0;
    let autonomousActions = 0;
    let lowestTrustLevel: TrustLevel = 'autonomous';

    const trustOrder: TrustLevel[] = ['requires_approval', 'low_confidence', 'high_confidence', 'autonomous'];

    for (const metrics of this.metrics.values()) {
      totalActions += metrics.totalActions;
      totalApproved += metrics.approvedCount;
      autonomousActions += metrics.autoApprovedCount;

      const currentIndex = trustOrder.indexOf(metrics.currentTrustLevel);
      const lowestIndex = trustOrder.indexOf(lowestTrustLevel);
      if (currentIndex < lowestIndex) {
        lowestTrustLevel = metrics.currentTrustLevel;
      }
    }

    return {
      overallTrustLevel: lowestTrustLevel,
      actionCount: totalActions,
      approvalRate: totalActions > 0 ? totalApproved / totalActions : 0,
      autonomousActions,
    };
  }

  /**
   * Update trust configuration
   */
  updateConfig(updates: Partial<TrustConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      escalationRules: updates.escalationRules || this.config.escalationRules,
    };

    logger.info('Trust config updated', { employeeId: this.employeeId });
  }

  /**
   * Reset trust for an action type
   */
  resetTrust(actionType: ActionType): void {
    this.metrics.delete(actionType);
    logger.info('Trust reset', { employeeId: this.employeeId, actionType });
  }

  /**
   * Export configuration
   */
  exportConfig(): TrustConfig {
    return { ...this.config };
  }

  /**
   * Export metrics
   */
  exportMetrics(): EmployeeTrustMetrics[] {
    return this.getAllMetrics();
  }

  /**
   * Import metrics
   */
  importMetrics(metrics: EmployeeTrustMetrics[]): void {
    for (const m of metrics) {
      this.metrics.set(m.actionType, m);
    }
  }
}

/**
 * Create a trust manager instance
 */
export function createTrustManager(
  employeeId: string,
  config?: TrustConfig
): TrustManager {
  return new TrustManager(employeeId, config);
}

