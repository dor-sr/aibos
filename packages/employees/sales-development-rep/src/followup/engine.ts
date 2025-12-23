/**
 * Follow-up Automation Engine
 * 
 * Manages automated follow-ups based on triggers and rules.
 */

import { createLogger } from '@aibos/core';
import type { CommunicationChannel } from '@aibos/employee-core';
import type {
  Lead,
  FollowUp,
  FollowUpType,
  FollowUpRule,
  FollowUpTrigger,
  FollowUpCondition,
  FollowUpAction,
  FollowUpOutcome,
} from '../types';

const logger = createLogger('sdr:followup-engine');

// ============================================
// DEFAULT FOLLOW-UP RULES
// ============================================

const DEFAULT_FOLLOWUP_RULES: FollowUpRule[] = [
  {
    id: 'email_opened_no_reply',
    name: 'Follow up after email opened',
    trigger: {
      type: 'email_opened',
      delayMinutes: 60 * 24, // 24 hours
    },
    conditions: [
      { field: 'totalReplies', operator: 'equals', value: 0 },
    ],
    action: {
      type: 'send_email',
      templateId: 'followup_after_open',
    },
    isActive: true,
    priority: 2,
  },
  {
    id: 'email_clicked_hot_lead',
    name: 'Immediate follow-up on click',
    trigger: {
      type: 'email_clicked',
      delayMinutes: 30,
    },
    conditions: [],
    action: {
      type: 'notify_sdr',
      notifyUsers: [],
    },
    isActive: true,
    priority: 1,
  },
  {
    id: 'no_reply_3_days',
    name: 'Follow up after 3 days no reply',
    trigger: {
      type: 'no_reply',
      delayDays: 3,
    },
    conditions: [
      { field: 'totalTouchpoints', operator: 'less_than', value: 5 },
    ],
    action: {
      type: 'send_email',
      templateId: 'followup_no_reply',
    },
    isActive: true,
    priority: 3,
  },
  {
    id: 'meeting_completed',
    name: 'Follow up after meeting',
    trigger: {
      type: 'meeting_completed',
      delayMinutes: 60 * 4, // 4 hours
    },
    conditions: [],
    action: {
      type: 'send_email',
      templateId: 'followup_after_meeting',
    },
    isActive: true,
    priority: 1,
  },
  {
    id: 'call_no_answer',
    name: 'Email after unanswered call',
    trigger: {
      type: 'call_completed',
      delayMinutes: 15,
    },
    conditions: [
      { field: 'callResult', operator: 'equals', value: 'no_answer' },
    ],
    action: {
      type: 'send_email',
      templateId: 'followup_missed_call',
    },
    isActive: true,
    priority: 2,
  },
];

// ============================================
// FOLLOW-UP ENGINE CLASS
// ============================================

export interface FollowUpEngineConfig {
  maxFollowUpsPerLead: number;
  minFollowUpIntervalHours: number;
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  timezone: string;
}

export class FollowUpEngine {
  private config: FollowUpEngineConfig;
  private rules: Map<string, FollowUpRule> = new Map();
  private followUps: Map<string, FollowUp> = new Map();
  private leadFollowUpCounts: Map<string, number> = new Map();

  constructor(config?: Partial<FollowUpEngineConfig>) {
    this.config = {
      maxFollowUpsPerLead: 10,
      minFollowUpIntervalHours: 24,
      businessHoursOnly: true,
      businessHoursStart: '09:00',
      businessHoursEnd: '18:00',
      businessDays: [1, 2, 3, 4, 5],
      timezone: 'America/New_York',
      ...config,
    };

    // Load default rules
    for (const rule of DEFAULT_FOLLOWUP_RULES) {
      this.rules.set(rule.id, rule);
    }
  }

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  /**
   * Add follow-up rule
   */
  addRule(rule: FollowUpRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Follow-up rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get rule
   */
  getRule(ruleId: string): FollowUpRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): FollowUpRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Enable/disable rule
   */
  setRuleActive(ruleId: string, isActive: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.isActive = isActive;
    return true;
  }

  // ============================================
  // TRIGGER PROCESSING
  // ============================================

  /**
   * Process event trigger
   */
  async processEvent(
    eventType: FollowUpTrigger['type'],
    lead: Lead,
    sdrEmployeeId: string,
    eventData?: Record<string, unknown>
  ): Promise<FollowUp[]> {
    const triggeredFollowUps: FollowUp[] = [];

    // Find matching rules
    const matchingRules = Array.from(this.rules.values())
      .filter(rule => rule.isActive && rule.trigger.type === eventType)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of matchingRules) {
      // Check conditions
      if (!this.checkConditions(rule.conditions, lead, eventData)) {
        continue;
      }

      // Check if we've exceeded max follow-ups
      const currentCount = this.leadFollowUpCounts.get(lead.id) || 0;
      if (currentCount >= this.config.maxFollowUpsPerLead) {
        logger.info('Max follow-ups reached for lead', { leadId: lead.id });
        continue;
      }

      // Check minimum interval
      if (!this.checkMinimumInterval(lead.id)) {
        logger.info('Minimum interval not met', { leadId: lead.id });
        continue;
      }

      // Create follow-up based on action
      const followUp = this.createFollowUp(rule, lead, sdrEmployeeId, eventData);
      triggeredFollowUps.push(followUp);

      // Update count
      this.leadFollowUpCounts.set(lead.id, currentCount + 1);
    }

    return triggeredFollowUps;
  }

  /**
   * Check conditions against lead data
   */
  private checkConditions(
    conditions: FollowUpCondition[],
    lead: Lead,
    eventData?: Record<string, unknown>
  ): boolean {
    for (const condition of conditions) {
      const value = this.getFieldValue(condition.field, lead, eventData);

      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'contains':
          if (typeof value !== 'string' || !value.includes(String(condition.value))) return false;
          break;
        case 'greater_than':
          if (typeof value !== 'number' || value <= Number(condition.value)) return false;
          break;
        case 'less_than':
          if (typeof value !== 'number' || value >= Number(condition.value)) return false;
          break;
        case 'is_set':
          if (value === undefined || value === null) return false;
          break;
        case 'is_not_set':
          if (value !== undefined && value !== null) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get field value from lead or event data
   */
  private getFieldValue(
    field: string,
    lead: Lead,
    eventData?: Record<string, unknown>
  ): unknown {
    // Check event data first
    if (eventData && field in eventData) {
      return eventData[field];
    }

    // Check lead fields
    return (lead as unknown as Record<string, unknown>)[field];
  }

  /**
   * Check minimum interval between follow-ups
   */
  private checkMinimumInterval(leadId: string): boolean {
    const lastFollowUp = this.getLastFollowUpForLead(leadId);
    if (!lastFollowUp) return true;

    const hoursSince = (Date.now() - lastFollowUp.scheduledFor.getTime()) / (1000 * 60 * 60);
    return hoursSince >= this.config.minFollowUpIntervalHours;
  }

  /**
   * Get last follow-up for lead
   */
  private getLastFollowUpForLead(leadId: string): FollowUp | undefined {
    let lastFollowUp: FollowUp | undefined;

    for (const followUp of this.followUps.values()) {
      if (followUp.leadId === leadId) {
        if (!lastFollowUp || followUp.scheduledFor > lastFollowUp.scheduledFor) {
          lastFollowUp = followUp;
        }
      }
    }

    return lastFollowUp;
  }

  // ============================================
  // FOLLOW-UP CREATION
  // ============================================

  /**
   * Create follow-up from rule
   */
  private createFollowUp(
    rule: FollowUpRule,
    lead: Lead,
    sdrEmployeeId: string,
    eventData?: Record<string, unknown>
  ): FollowUp {
    const id = `followup_${Date.now()}_${lead.id}`;
    const now = new Date();

    // Calculate schedule time
    let scheduledFor = new Date(now);
    if (rule.trigger.delayMinutes) {
      scheduledFor.setMinutes(scheduledFor.getMinutes() + rule.trigger.delayMinutes);
    }
    if (rule.trigger.delayDays) {
      scheduledFor.setDate(scheduledFor.getDate() + rule.trigger.delayDays);
    }

    // Adjust for business hours
    if (this.config.businessHoursOnly) {
      scheduledFor = this.ensureBusinessHours(scheduledFor);
    }

    const followUp: FollowUp = {
      id,
      leadId: lead.id,
      sdrEmployeeId,
      type: this.mapTriggerToFollowUpType(rule.trigger.type),
      reason: rule.name,
      priority: this.mapPriority(rule.priority),
      scheduledFor,
      channel: rule.action.channel || 'email',
      templateId: rule.action.templateId,
      status: 'scheduled',
      triggerEvent: rule.trigger.type,
      createdAt: now,
      updatedAt: now,
    };

    this.followUps.set(id, followUp);

    logger.info('Follow-up created', {
      followUpId: id,
      leadId: lead.id,
      rule: rule.name,
      scheduledFor: scheduledFor.toISOString(),
    });

    return followUp;
  }

  /**
   * Map trigger type to follow-up type
   */
  private mapTriggerToFollowUpType(triggerType: FollowUpTrigger['type']): FollowUpType {
    switch (triggerType) {
      case 'no_reply':
        return 'no_response';
      case 'meeting_completed':
        return 'after_meeting';
      case 'call_completed':
        return 'after_reply';
      case 'email_opened':
      case 'email_clicked':
        return 'no_response';
      default:
        return 'custom';
    }
  }

  /**
   * Map rule priority to follow-up priority
   */
  private mapPriority(rulePriority: number): FollowUp['priority'] {
    if (rulePriority === 1) return 'urgent';
    if (rulePriority === 2) return 'high';
    if (rulePriority === 3) return 'medium';
    return 'low';
  }

  /**
   * Ensure time is within business hours
   */
  private ensureBusinessHours(date: Date): Date {
    const result = new Date(date);

    // If not a business day, move to next business day
    while (!this.config.businessDays.includes(result.getDay())) {
      result.setDate(result.getDate() + 1);
    }

    // Check business hours
    const startParts = this.config.businessHoursStart.split(':').map(Number);
    const endParts = this.config.businessHoursEnd.split(':').map(Number);
    const startHour = startParts[0] ?? 9;
    const startMin = startParts[1] ?? 0;
    const endHour = endParts[0] ?? 18;
    const endMin = endParts[1] ?? 0;

    const currentHours = result.getHours();
    const currentMins = result.getMinutes();

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = currentHours * 60 + currentMins;

    if (currentMinutes < startMinutes) {
      result.setHours(startHour, startMin, 0, 0);
    } else if (currentMinutes > endMinutes) {
      // Move to next business day
      result.setDate(result.getDate() + 1);
      while (!this.config.businessDays.includes(result.getDay())) {
        result.setDate(result.getDate() + 1);
      }
      result.setHours(startHour, startMin, 0, 0);
    }

    return result;
  }

  // ============================================
  // FOLLOW-UP MANAGEMENT
  // ============================================

  /**
   * Schedule manual follow-up
   */
  scheduleFollowUp(
    leadId: string,
    sdrEmployeeId: string,
    type: FollowUpType,
    scheduledFor: Date,
    channel: CommunicationChannel,
    options?: {
      reason?: string;
      priority?: FollowUp['priority'];
      templateId?: string;
      customMessage?: string;
    }
  ): FollowUp {
    const id = `followup_${Date.now()}_${leadId}`;
    const now = new Date();

    const followUp: FollowUp = {
      id,
      leadId,
      sdrEmployeeId,
      type,
      reason: options?.reason || 'Manual follow-up',
      priority: options?.priority || 'medium',
      scheduledFor: this.config.businessHoursOnly 
        ? this.ensureBusinessHours(scheduledFor) 
        : scheduledFor,
      channel,
      templateId: options?.templateId,
      customMessage: options?.customMessage,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };

    this.followUps.set(id, followUp);

    logger.info('Manual follow-up scheduled', {
      followUpId: id,
      leadId,
      scheduledFor: followUp.scheduledFor.toISOString(),
    });

    return followUp;
  }

  /**
   * Get follow-up by ID
   */
  getFollowUp(id: string): FollowUp | undefined {
    return this.followUps.get(id);
  }

  /**
   * Get follow-ups for lead
   */
  getLeadFollowUps(leadId: string): FollowUp[] {
    return Array.from(this.followUps.values())
      .filter(f => f.leadId === leadId)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Get due follow-ups
   */
  getDueFollowUps(): FollowUp[] {
    const now = new Date();
    return Array.from(this.followUps.values())
      .filter(f => f.status === 'scheduled' && f.scheduledFor <= now)
      .sort((a, b) => {
        // Sort by priority first, then by scheduled time
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.scheduledFor.getTime() - b.scheduledFor.getTime();
      });
  }

  /**
   * Get pending follow-ups for SDR
   */
  getSDRPendingFollowUps(sdrEmployeeId: string): FollowUp[] {
    return Array.from(this.followUps.values())
      .filter(f => f.sdrEmployeeId === sdrEmployeeId && f.status === 'scheduled')
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Complete follow-up
   */
  completeFollowUp(
    followUpId: string,
    outcome: FollowUpOutcome
  ): FollowUp | null {
    const followUp = this.followUps.get(followUpId);
    if (!followUp) return null;

    followUp.status = 'completed';
    followUp.completedAt = new Date();
    followUp.outcome = outcome;
    followUp.updatedAt = new Date();

    logger.info('Follow-up completed', {
      followUpId,
      result: outcome.result,
    });

    return followUp;
  }

  /**
   * Cancel follow-up
   */
  cancelFollowUp(followUpId: string, reason?: string): FollowUp | null {
    const followUp = this.followUps.get(followUpId);
    if (!followUp) return null;

    followUp.status = 'cancelled';
    followUp.notes = reason;
    followUp.updatedAt = new Date();

    logger.info('Follow-up cancelled', {
      followUpId,
      reason,
    });

    return followUp;
  }

  /**
   * Reschedule follow-up
   */
  rescheduleFollowUp(followUpId: string, newDate: Date): FollowUp | null {
    const followUp = this.followUps.get(followUpId);
    if (!followUp) return null;

    followUp.scheduledFor = this.config.businessHoursOnly
      ? this.ensureBusinessHours(newDate)
      : newDate;
    followUp.updatedAt = new Date();

    logger.info('Follow-up rescheduled', {
      followUpId,
      newDate: followUp.scheduledFor.toISOString(),
    });

    return followUp;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get follow-up statistics
   */
  getStats(sdrEmployeeId?: string): {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    missed: number;
    avgCompletionTime: number;
    byType: Record<FollowUpType, number>;
    byOutcome: Record<FollowUpOutcome['result'], number>;
  } {
    let followUps = Array.from(this.followUps.values());
    
    if (sdrEmployeeId) {
      followUps = followUps.filter(f => f.sdrEmployeeId === sdrEmployeeId);
    }

    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
      no_response: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const followUp of followUps) {
      // Count by type
      byType[followUp.type] = (byType[followUp.type] || 0) + 1;

      // Count by outcome
      if (followUp.outcome) {
        byOutcome[followUp.outcome.result] = (byOutcome[followUp.outcome.result] || 0) + 1;
      }

      // Calculate completion time
      if (followUp.status === 'completed' && followUp.completedAt) {
        totalCompletionTime += followUp.completedAt.getTime() - followUp.scheduledFor.getTime();
        completedCount++;
      }
    }

    return {
      total: followUps.length,
      scheduled: followUps.filter(f => f.status === 'scheduled').length,
      completed: followUps.filter(f => f.status === 'completed').length,
      cancelled: followUps.filter(f => f.status === 'cancelled').length,
      missed: followUps.filter(f => f.status === 'missed').length,
      avgCompletionTime: completedCount > 0 
        ? totalCompletionTime / completedCount / (1000 * 60 * 60) // Hours
        : 0,
      byType: byType as Record<FollowUpType, number>,
      byOutcome: byOutcome as Record<FollowUpOutcome['result'], number>,
    };
  }
}

/**
 * Create follow-up engine
 */
export function createFollowUpEngine(config?: Partial<FollowUpEngineConfig>): FollowUpEngine {
  return new FollowUpEngine(config);
}

