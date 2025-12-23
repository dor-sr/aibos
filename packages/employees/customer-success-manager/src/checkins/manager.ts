/**
 * Check-in Manager
 * 
 * Manages proactive client check-ins and follow-ups.
 */

import { createLogger } from '@aibos/core';
import type { CommunicationChannel } from '@aibos/employee-core';
import type {
  ClientAccount,
  CheckIn,
  CheckInType,
  CheckInResponse,
  CreateCheckInInput,
  HealthScoreBreakdown,
} from '../types';

const logger = createLogger('employee:csm:checkins');

// Check-in cadence by lifecycle stage
const CHECKIN_CADENCE: Record<string, number> = {
  onboarding: 3, // Every 3 days
  adoption: 7, // Weekly
  growth: 14, // Bi-weekly
  mature: 30, // Monthly
  renewal: 7, // Weekly during renewal
  at_risk: 3, // Every 3 days for at-risk
};

// Check-in types by trigger
const CHECKIN_TRIGGERS: Record<string, CheckInType> = {
  scheduled: 'periodic',
  renewal_approaching: 'renewal',
  support_resolved: 'post_support',
  health_declined: 'risk_mitigation',
  usage_spike: 'upsell',
  qbr_due: 'qbr_prep',
};

/**
 * Check-in Manager
 */
export class CheckInManager {
  private checkIns: Map<string, CheckIn> = new Map();

  /**
   * Schedule a check-in
   */
  scheduleCheckIn(input: CreateCheckInInput, employeeId: string): CheckIn {
    const checkInId = `checkin_${Date.now()}_${input.clientId}`;

    const checkIn: CheckIn = {
      id: checkInId,
      clientId: input.clientId,
      contactId: input.contactId,
      employeeId,
      type: input.type,
      channel: input.channel,
      status: 'scheduled',
      scheduledFor: input.scheduledFor,
      content: input.content,
      createdAt: new Date(),
    };

    this.checkIns.set(checkInId, checkIn);

    logger.info('Check-in scheduled', {
      checkInId,
      clientId: input.clientId,
      type: input.type,
      scheduledFor: input.scheduledFor,
    });

    return checkIn;
  }

  /**
   * Calculate next check-in date for client
   */
  calculateNextCheckIn(client: ClientAccount): {
    date: Date;
    type: CheckInType;
    reason: string;
  } {
    const now = new Date();
    let daysUntilCheckIn = CHECKIN_CADENCE[client.lifecycleStage] || 14;
    let type: CheckInType = 'periodic';
    let reason = 'Regular check-in cadence';

    // Check for special conditions

    // 1. Renewal approaching
    if (client.renewalDate) {
      const daysUntilRenewal = Math.floor(
        (new Date(client.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilRenewal <= 60 && daysUntilRenewal > 0) {
        daysUntilCheckIn = Math.min(daysUntilCheckIn, 7);
        type = 'renewal';
        reason = `Renewal in ${daysUntilRenewal} days`;
      }
    }

    // 2. At-risk status
    if (client.lifecycleStage === 'at_risk' || client.churnRiskScore > 0.6) {
      daysUntilCheckIn = Math.min(daysUntilCheckIn, 3);
      type = 'risk_mitigation';
      reason = 'Account at risk - frequent touch required';
    }

    // 3. Low health score
    if (client.healthScore < 50) {
      daysUntilCheckIn = Math.min(daysUntilCheckIn, 5);
      type = 'risk_mitigation';
      reason = `Low health score (${client.healthScore})`;
    }

    // 4. Onboarding
    if (client.onboardingStatus !== 'complete' && client.onboardingStatus !== 'active') {
      daysUntilCheckIn = Math.min(daysUntilCheckIn, 3);
      type = 'onboarding';
      reason = 'Active onboarding';
    }

    // Calculate date based on last check-in
    const lastCheckIn = client.lastCheckInAt 
      ? new Date(client.lastCheckInAt) 
      : new Date(client.createdAt);
    
    const nextDate = new Date(lastCheckIn.getTime() + daysUntilCheckIn * 24 * 60 * 60 * 1000);

    // Don't schedule in the past
    if (nextDate < now) {
      nextDate.setTime(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    }

    return { date: nextDate, type, reason };
  }

  /**
   * Get check-ins due for execution
   */
  getDueCheckIns(): CheckIn[] {
    const now = new Date();
    return Array.from(this.checkIns.values())
      .filter(c => c.status === 'scheduled' && c.scheduledFor <= now)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Mark check-in as sent
   */
  markSent(checkInId: string): CheckIn | null {
    const checkIn = this.checkIns.get(checkInId);
    if (!checkIn) return null;

    checkIn.status = 'sent';
    checkIn.sentAt = new Date();

    logger.info('Check-in sent', { checkInId, clientId: checkIn.clientId });

    return checkIn;
  }

  /**
   * Record check-in response
   */
  recordResponse(checkInId: string, response: CheckInResponse): CheckIn | null {
    const checkIn = this.checkIns.get(checkInId);
    if (!checkIn) return null;

    checkIn.status = 'responded';
    checkIn.respondedAt = new Date();
    checkIn.response = response;

    // Determine follow-up actions based on response
    checkIn.followUpActions = this.determineFollowUpActions(response);

    logger.info('Check-in response recorded', {
      checkInId,
      sentiment: response.sentiment,
      hasIssues: response.issuesRaised.length > 0,
    });

    return checkIn;
  }

  /**
   * Complete check-in
   */
  completeCheckIn(checkInId: string, notes?: string): CheckIn | null {
    const checkIn = this.checkIns.get(checkInId);
    if (!checkIn) return null;

    checkIn.status = 'completed';
    checkIn.completedAt = new Date();
    if (notes) checkIn.notes = notes;

    return checkIn;
  }

  /**
   * Mark check-in as missed
   */
  markMissed(checkInId: string): CheckIn | null {
    const checkIn = this.checkIns.get(checkInId);
    if (!checkIn) return null;

    checkIn.status = 'missed';

    logger.warn('Check-in missed', { checkInId, clientId: checkIn.clientId });

    return checkIn;
  }

  /**
   * Determine follow-up actions from response
   */
  private determineFollowUpActions(response: CheckInResponse): string[] {
    const actions: string[] = [];

    // Negative sentiment requires attention
    if (response.sentiment === 'negative') {
      actions.push('Schedule call to address concerns');
      actions.push('Create support ticket for issues raised');
    }

    // Issues raised need tracking
    if (response.issuesRaised.length > 0) {
      actions.push(`Follow up on ${response.issuesRaised.length} issue(s)`);
    }

    // Requests made need action
    if (response.requestsMade.length > 0) {
      actions.push(`Process ${response.requestsMade.length} request(s)`);
    }

    // Upsell interest
    if (response.upsellInterest) {
      actions.push('Connect with sales for upsell conversation');
    }

    // Referral willingness
    if (response.referralWillingness) {
      actions.push('Follow up with referral program details');
    }

    // NPS follow-up
    if (response.npsScore !== undefined) {
      if (response.npsScore >= 9) {
        actions.push('Send thank you and referral request');
      } else if (response.npsScore <= 6) {
        actions.push('Schedule call to understand detractor feedback');
      }
    }

    return actions;
  }

  /**
   * Get client check-in history
   */
  getClientHistory(clientId: string, limit = 10): CheckIn[] {
    return Array.from(this.checkIns.values())
      .filter(c => c.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get check-in by ID
   */
  getCheckIn(checkInId: string): CheckIn | undefined {
    return this.checkIns.get(checkInId);
  }

  /**
   * Get pending check-ins for employee
   */
  getPendingCheckIns(employeeId: string): CheckIn[] {
    return Array.from(this.checkIns.values())
      .filter(c => 
        c.employeeId === employeeId && 
        (c.status === 'scheduled' || c.status === 'sent')
      )
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Get check-in stats
   */
  getStats(employeeId: string, period: 'week' | 'month' = 'week'): {
    scheduled: number;
    completed: number;
    missed: number;
    avgResponseRate: number;
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
  } {
    const now = new Date();
    const periodMs = period === 'week' 
      ? 7 * 24 * 60 * 60 * 1000 
      : 30 * 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - periodMs);

    const checkIns = Array.from(this.checkIns.values())
      .filter(c => 
        c.employeeId === employeeId && 
        c.createdAt >= startDate
      );

    const scheduled = checkIns.length;
    const completed = checkIns.filter(c => c.status === 'completed').length;
    const missed = checkIns.filter(c => c.status === 'missed').length;
    const responded = checkIns.filter(c => c.response).length;

    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
    for (const c of checkIns) {
      if (c.response) {
        sentimentBreakdown[c.response.sentiment]++;
      }
    }

    return {
      scheduled,
      completed,
      missed,
      avgResponseRate: scheduled > 0 ? responded / scheduled : 0,
      sentimentBreakdown,
    };
  }

  /**
   * Generate check-in content based on type and context
   */
  generateCheckInContent(
    type: CheckInType,
    client: ClientAccount,
    health?: HealthScoreBreakdown
  ): { subject: string; body: string } {
    switch (type) {
      case 'periodic':
        return {
          subject: `Quick check-in - How are things going with ${client.companyName || client.name}?`,
          body: `I wanted to touch base and see how everything is going. Is there anything I can help with?`,
        };

      case 'onboarding':
        return {
          subject: `How is your onboarding going?`,
          body: `I'm checking in to make sure your onboarding is going smoothly. Have you had a chance to explore the key features? Any questions I can help with?`,
        };

      case 'renewal':
        return {
          subject: `Your renewal is coming up - let's connect`,
          body: `I wanted to reach out as your renewal date is approaching. I'd love to discuss how we can continue supporting your success and any goals you have for the coming year.`,
        };

      case 'risk_mitigation':
        return {
          subject: `Following up - Want to make sure you're getting value`,
          body: `I noticed you might have some concerns or challenges. I want to make sure we're doing everything we can to support your success. Could we schedule a quick call?`,
        };

      case 'post_support':
        return {
          subject: `Following up on your recent support request`,
          body: `I saw that you had a support request recently. I wanted to follow up and make sure everything was resolved to your satisfaction. Is there anything else I can help with?`,
        };

      case 'upsell':
        return {
          subject: `Noticed something great - let's talk`,
          body: `I've been looking at how you're using the platform and I'm really impressed! I have some ideas that could help you get even more value. Would you have time for a quick chat?`,
        };

      case 'qbr_prep':
        return {
          subject: `Preparing for our quarterly review`,
          body: `Our quarterly business review is coming up. I'm putting together a summary of your success metrics. Are there any specific topics you'd like us to cover?`,
        };

      default:
        return {
          subject: `Checking in`,
          body: `Just wanted to see how things are going and if there's anything I can help with.`,
        };
    }
  }

  /**
   * Recommend best channel for check-in
   */
  recommendChannel(client: ClientAccount, type: CheckInType): CommunicationChannel {
    // Critical check-ins prefer direct channels
    if (type === 'risk_mitigation' || type === 'renewal') {
      return 'email'; // More formal
    }

    // Quick check-ins prefer chat
    if (type === 'periodic' || type === 'post_support') {
      return client.tags.includes('slack_user') ? 'slack' : 'email';
    }

    // Use client's preferred channel if available
    // Would come from contact data
    return 'email';
  }
}

/**
 * Create check-in manager
 */
export function createCheckInManager(): CheckInManager {
  return new CheckInManager();
}

