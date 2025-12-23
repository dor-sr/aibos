/**
 * Outreach Sequence Manager
 * 
 * Manages multi-channel outreach sequences for lead engagement.
 */

import { createLogger } from '@aibos/core';
import type { CommunicationChannel } from '@aibos/employee-core';
import type {
  Lead,
  OutreachSequence,
  OutreachStep,
  OutreachStepType,
  SequenceType,
  SequenceTargetCriteria,
  ExitCondition,
  LeadEnrollment,
  StepExecution,
  EnrollmentStatus,
  CreateSequenceInput,
  EnrollLeadInput,
  StepVariant,
} from '../types';

const logger = createLogger('sdr:sequence-manager');

// ============================================
// DEFAULT SEQUENCES
// ============================================

const DEFAULT_DEMO_REQUEST_SEQUENCE: Omit<OutreachSequence, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  name: 'Demo Request Follow-up',
  description: 'Follow-up sequence for inbound demo requests',
  type: 'demo_request_followup',
  status: 'active',
  steps: [
    {
      id: 'step_1',
      order: 1,
      name: 'Initial Response',
      type: 'email',
      channel: 'email',
      delayDays: 0,
      delayHours: 0,
      templateId: 'demo_initial_response',
      aiPersonalizationEnabled: true,
    },
    {
      id: 'step_2',
      order: 2,
      name: 'LinkedIn Connection',
      type: 'linkedin_connection',
      channel: 'email', // Fallback channel
      delayDays: 1,
      templateId: 'linkedin_connection_request',
    },
    {
      id: 'step_3',
      order: 3,
      name: 'Follow-up Email',
      type: 'email',
      channel: 'email',
      delayDays: 2,
      templateId: 'demo_followup_1',
    },
    {
      id: 'step_4',
      order: 4,
      name: 'Phone Call',
      type: 'phone_call',
      channel: 'email', // Notification channel
      delayDays: 4,
      taskDescription: 'Call to discuss demo and answer questions',
    },
    {
      id: 'step_5',
      order: 5,
      name: 'Final Follow-up',
      type: 'email',
      channel: 'email',
      delayDays: 7,
      templateId: 'demo_followup_final',
    },
  ],
  totalSteps: 5,
  businessDaysOnly: true,
  timezone: 'America/New_York',
  exitConditions: [
    { type: 'replied', action: 'exit' },
    { type: 'meeting_booked', action: 'exit' },
    { type: 'unsubscribed', action: 'exit' },
  ],
  leadsEnrolled: 0,
  leadsCompleted: 0,
  leadsReplied: 0,
  meetingsBooked: 0,
  tags: ['inbound', 'demo'],
};

const DEFAULT_COLD_OUTREACH_SEQUENCE: Omit<OutreachSequence, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  name: 'Cold Outreach',
  description: 'Multi-touch cold outreach sequence',
  type: 'cold_outbound',
  status: 'active',
  steps: [
    {
      id: 'step_1',
      order: 1,
      name: 'LinkedIn View Profile',
      type: 'manual_task',
      channel: 'email',
      delayDays: 0,
      taskDescription: 'View prospect LinkedIn profile',
    },
    {
      id: 'step_2',
      order: 2,
      name: 'Initial Email',
      type: 'email',
      channel: 'email',
      delayDays: 1,
      templateId: 'cold_initial',
      aiPersonalizationEnabled: true,
      variants: [
        { id: 'a', name: 'Pain-focused', weight: 50 },
        { id: 'b', name: 'Value-focused', weight: 50 },
      ],
    },
    {
      id: 'step_3',
      order: 3,
      name: 'LinkedIn Connection',
      type: 'linkedin_connection',
      channel: 'email',
      delayDays: 3,
      templateId: 'linkedin_cold_connect',
    },
    {
      id: 'step_4',
      order: 4,
      name: 'Follow-up Email',
      type: 'email',
      channel: 'email',
      delayDays: 5,
      templateId: 'cold_followup_1',
    },
    {
      id: 'step_5',
      order: 5,
      name: 'Phone Call',
      type: 'phone_call',
      channel: 'email',
      delayDays: 8,
      taskDescription: 'Discovery call attempt',
    },
    {
      id: 'step_6',
      order: 6,
      name: 'Break-up Email',
      type: 'email',
      channel: 'email',
      delayDays: 12,
      templateId: 'cold_breakup',
    },
  ],
  totalSteps: 6,
  businessDaysOnly: true,
  timezone: 'America/New_York',
  exitConditions: [
    { type: 'replied', action: 'exit' },
    { type: 'meeting_booked', action: 'exit' },
    { type: 'unsubscribed', action: 'exit' },
    { type: 'bounced', action: 'exit' },
  ],
  leadsEnrolled: 0,
  leadsCompleted: 0,
  leadsReplied: 0,
  meetingsBooked: 0,
  tags: ['outbound', 'cold'],
};

// ============================================
// SEQUENCE MANAGER CLASS
// ============================================

export interface SequenceManagerConfig {
  defaultTimezone: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  maxConcurrentSequences: number;
}

export class OutreachSequenceManager {
  private config: SequenceManagerConfig;
  private sequences: Map<string, OutreachSequence> = new Map();
  private enrollments: Map<string, LeadEnrollment> = new Map();

  constructor(config?: Partial<SequenceManagerConfig>) {
    this.config = {
      defaultTimezone: 'America/New_York',
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: [1, 2, 3, 4, 5], // Monday to Friday
      maxConcurrentSequences: 3,
      ...config,
    };

    // Load default sequences
    this.loadDefaultSequences();
  }

  /**
   * Load default sequences
   */
  private loadDefaultSequences(): void {
    const demoSeq = this.createSequenceObject({
      ...DEFAULT_DEMO_REQUEST_SEQUENCE,
      workspaceId: 'default',
    } as CreateSequenceInput);
    this.sequences.set(demoSeq.id, demoSeq);

    const coldSeq = this.createSequenceObject({
      ...DEFAULT_COLD_OUTREACH_SEQUENCE,
      workspaceId: 'default',
    } as CreateSequenceInput);
    this.sequences.set(coldSeq.id, coldSeq);
  }

  /**
   * Create sequence object
   */
  private createSequenceObject(input: CreateSequenceInput): OutreachSequence {
    const id = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    return {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'active',
      targetCriteria: input.targetCriteria,
      steps: input.steps.map((step, idx) => ({
        ...step,
        id: `step_${idx + 1}`,
        order: idx + 1,
      })),
      totalSteps: input.steps.length,
      businessDaysOnly: input.businessDaysOnly ?? true,
      timezone: input.timezone || this.config.defaultTimezone,
      exitConditions: input.exitConditions || [
        { type: 'replied', action: 'exit' },
        { type: 'meeting_booked', action: 'exit' },
      ],
      leadsEnrolled: 0,
      leadsCompleted: 0,
      leadsReplied: 0,
      meetingsBooked: 0,
      tags: input.tags || [],
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    };
  }

  // ============================================
  // SEQUENCE MANAGEMENT
  // ============================================

  /**
   * Create a new sequence
   */
  createSequence(input: CreateSequenceInput): OutreachSequence {
    const sequence = this.createSequenceObject(input);
    this.sequences.set(sequence.id, sequence);

    logger.info('Sequence created', {
      sequenceId: sequence.id,
      name: sequence.name,
      steps: sequence.totalSteps,
    });

    return sequence;
  }

  /**
   * Get sequence by ID
   */
  getSequence(id: string): OutreachSequence | undefined {
    return this.sequences.get(id);
  }

  /**
   * Get all sequences
   */
  getAllSequences(workspaceId?: string): OutreachSequence[] {
    const sequences = Array.from(this.sequences.values());
    if (workspaceId) {
      return sequences.filter(s => s.workspaceId === workspaceId || s.workspaceId === 'default');
    }
    return sequences;
  }

  /**
   * Get sequences by type
   */
  getSequencesByType(type: SequenceType): OutreachSequence[] {
    return Array.from(this.sequences.values()).filter(s => s.type === type);
  }

  /**
   * Update sequence
   */
  updateSequence(id: string, updates: Partial<OutreachSequence>): OutreachSequence | null {
    const sequence = this.sequences.get(id);
    if (!sequence) return null;

    const updated: OutreachSequence = {
      ...sequence,
      ...updates,
      updatedAt: new Date(),
    };

    this.sequences.set(id, updated);
    return updated;
  }

  /**
   * Pause sequence
   */
  pauseSequence(id: string): boolean {
    const sequence = this.sequences.get(id);
    if (!sequence) return false;

    sequence.status = 'paused';
    sequence.updatedAt = new Date();
    return true;
  }

  /**
   * Activate sequence
   */
  activateSequence(id: string): boolean {
    const sequence = this.sequences.get(id);
    if (!sequence) return false;

    sequence.status = 'active';
    sequence.updatedAt = new Date();
    return true;
  }

  // ============================================
  // LEAD ENROLLMENT
  // ============================================

  /**
   * Enroll lead in sequence
   */
  enrollLead(input: EnrollLeadInput, sdrEmployeeId: string): LeadEnrollment {
    const sequence = this.sequences.get(input.sequenceId);
    if (!sequence) {
      throw new Error('Sequence not found');
    }

    if (sequence.status !== 'active') {
      throw new Error('Sequence is not active');
    }

    // Check if lead already enrolled
    const existingEnrollment = this.getLeadActiveEnrollment(input.leadId);
    if (existingEnrollment) {
      throw new Error('Lead already enrolled in an active sequence');
    }

    const id = `enroll_${Date.now()}_${input.leadId}`;
    const now = new Date();

    // Ensure sequence has at least one step
    const firstStep = sequence.steps[0];
    if (!firstStep) {
      throw new Error('Sequence has no steps');
    }

    // Calculate first step schedule
    const firstStepSchedule = this.calculateStepSchedule(
      now,
      firstStep,
      sequence.businessDaysOnly,
      sequence.timezone
    );

    const enrollment: LeadEnrollment = {
      id,
      leadId: input.leadId,
      sequenceId: input.sequenceId,
      sdrEmployeeId,
      status: 'active',
      currentStep: 1,
      startedAt: now,
      stepHistory: sequence.steps.map((step, idx) => ({
        stepId: step.id,
        stepOrder: step.order,
        status: idx === 0 ? (input.startImmediately ? 'scheduled' : 'pending') : 'pending',
        scheduledFor: idx === 0 ? firstStepSchedule : new Date(0), // Will be calculated as we progress
      })),
      totalEmailsSent: 0,
      totalEmailsOpened: 0,
      totalEmailsClicked: 0,
      totalReplies: 0,
      totalCalls: 0,
      totalConnections: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.enrollments.set(id, enrollment);

    // Update sequence stats
    sequence.leadsEnrolled++;
    sequence.updatedAt = now;

    logger.info('Lead enrolled in sequence', {
      enrollmentId: id,
      leadId: input.leadId,
      sequenceId: input.sequenceId,
    });

    return enrollment;
  }

  /**
   * Get enrollment by ID
   */
  getEnrollment(id: string): LeadEnrollment | undefined {
    return this.enrollments.get(id);
  }

  /**
   * Get lead's active enrollment
   */
  getLeadActiveEnrollment(leadId: string): LeadEnrollment | undefined {
    for (const enrollment of this.enrollments.values()) {
      if (enrollment.leadId === leadId && enrollment.status === 'active') {
        return enrollment;
      }
    }
    return undefined;
  }

  /**
   * Get all enrollments for lead
   */
  getLeadEnrollments(leadId: string): LeadEnrollment[] {
    return Array.from(this.enrollments.values()).filter(e => e.leadId === leadId);
  }

  /**
   * Get due steps across all enrollments
   */
  getDueSteps(): Array<{ enrollment: LeadEnrollment; step: OutreachStep; execution: StepExecution }> {
    const now = new Date();
    const dueSteps: Array<{ enrollment: LeadEnrollment; step: OutreachStep; execution: StepExecution }> = [];

    for (const enrollment of this.enrollments.values()) {
      if (enrollment.status !== 'active') continue;

      const sequence = this.sequences.get(enrollment.sequenceId);
      if (!sequence) continue;

      for (const execution of enrollment.stepHistory) {
        if (execution.status === 'scheduled' && execution.scheduledFor <= now) {
          const step = sequence.steps.find(s => s.id === execution.stepId);
          if (step) {
            dueSteps.push({ enrollment, step, execution });
          }
        }
      }
    }

    return dueSteps;
  }

  /**
   * Execute step
   */
  executeStep(
    enrollmentId: string,
    stepId: string,
    result: StepExecution['result']
  ): StepExecution | null {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return null;

    const stepExecution = enrollment.stepHistory.find(s => s.stepId === stepId);
    if (!stepExecution) return null;

    stepExecution.status = 'executed';
    stepExecution.executedAt = new Date();
    stepExecution.result = result;

    // Update enrollment stats
    if (result?.delivered) enrollment.totalEmailsSent++;
    if (result?.opened) enrollment.totalEmailsOpened++;
    if (result?.clicked) enrollment.totalEmailsClicked++;
    if (result?.replied) {
      enrollment.totalReplies++;
      // Check exit condition
      this.checkExitConditions(enrollment, 'replied');
    }

    // Schedule next step
    this.scheduleNextStep(enrollment);

    enrollment.updatedAt = new Date();

    logger.info('Step executed', {
      enrollmentId,
      stepId,
      delivered: result?.delivered,
    });

    return stepExecution;
  }

  /**
   * Record reply
   */
  recordReply(enrollmentId: string): void {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return;

    enrollment.totalReplies++;
    this.checkExitConditions(enrollment, 'replied');

    // Update sequence stats
    const sequence = this.sequences.get(enrollment.sequenceId);
    if (sequence) {
      sequence.leadsReplied++;
      sequence.updatedAt = new Date();
    }
  }

  /**
   * Record meeting booked
   */
  recordMeetingBooked(enrollmentId: string): void {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return;

    this.checkExitConditions(enrollment, 'meeting_booked');

    // Update sequence stats
    const sequence = this.sequences.get(enrollment.sequenceId);
    if (sequence) {
      sequence.meetingsBooked++;
      sequence.updatedAt = new Date();
    }
  }

  /**
   * Remove lead from sequence
   */
  removeFromSequence(enrollmentId: string, reason: ExitCondition['type']): void {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return;

    enrollment.status = 'exited';
    enrollment.exitedAt = new Date();
    enrollment.exitReason = reason;
    enrollment.updatedAt = new Date();

    logger.info('Lead removed from sequence', {
      enrollmentId,
      reason,
    });
  }

  /**
   * Pause enrollment
   */
  pauseEnrollment(enrollmentId: string): boolean {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return false;

    enrollment.status = 'paused';
    enrollment.updatedAt = new Date();
    return true;
  }

  /**
   * Resume enrollment
   */
  resumeEnrollment(enrollmentId: string): boolean {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment || enrollment.status !== 'paused') return false;

    enrollment.status = 'active';
    enrollment.updatedAt = new Date();

    // Reschedule current step
    this.rescheduleCurrentStep(enrollment);
    return true;
  }

  // ============================================
  // SCHEDULING HELPERS
  // ============================================

  /**
   * Calculate step schedule
   */
  private calculateStepSchedule(
    fromDate: Date,
    step: OutreachStep,
    businessDaysOnly: boolean,
    timezone: string
  ): Date {
    let targetDate = new Date(fromDate);

    // Add delay days
    if (step.delayDays > 0) {
      if (businessDaysOnly) {
        targetDate = this.addBusinessDays(targetDate, step.delayDays);
      } else {
        targetDate.setDate(targetDate.getDate() + step.delayDays);
      }
    }

    // Add delay hours
    if (step.delayHours) {
      targetDate.setHours(targetDate.getHours() + step.delayHours);
    }

    // Set preferred time if specified
    if (step.preferredTime) {
      const timeParts = step.preferredTime.split(':').map(Number);
      const hours = timeParts[0] ?? 9;
      const minutes = timeParts[1] ?? 0;
      targetDate.setHours(hours, minutes, 0, 0);
    }

    // Ensure within business hours
    if (businessDaysOnly) {
      targetDate = this.ensureBusinessHours(targetDate);
    }

    return targetDate;
  }

  /**
   * Add business days to date
   */
  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;

    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (this.config.businessDays.includes(result.getDay())) {
        added++;
      }
    }

    return result;
  }

  /**
   * Ensure date is within business hours
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
    const endHour = endParts[0] ?? 17;
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

  /**
   * Schedule next step
   */
  private scheduleNextStep(enrollment: LeadEnrollment): void {
    const currentStepIndex = enrollment.currentStep - 1;
    const nextStepIndex = currentStepIndex + 1;

    const sequence = this.sequences.get(enrollment.sequenceId);
    if (!sequence) return;

    if (nextStepIndex >= sequence.steps.length) {
      // Sequence complete
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      sequence.leadsCompleted++;
      return;
    }

    const nextStep = sequence.steps[nextStepIndex];
    const nextExecution = enrollment.stepHistory[nextStepIndex];

    if (nextExecution && nextStep) {
      nextExecution.status = 'scheduled';
      nextExecution.scheduledFor = this.calculateStepSchedule(
        new Date(),
        nextStep,
        sequence.businessDaysOnly,
        sequence.timezone
      );
    }

    enrollment.currentStep = nextStepIndex + 1;
  }

  /**
   * Reschedule current step
   */
  private rescheduleCurrentStep(enrollment: LeadEnrollment): void {
    const sequence = this.sequences.get(enrollment.sequenceId);
    if (!sequence) return;

    const currentStepIndex = enrollment.currentStep - 1;
    const currentStep = sequence.steps[currentStepIndex];
    const currentExecution = enrollment.stepHistory[currentStepIndex];

    if (currentExecution && currentStep) {
      currentExecution.status = 'scheduled';
      const stepForReschedule: OutreachStep = { ...currentStep, delayDays: 0, delayHours: 0 };
      currentExecution.scheduledFor = this.calculateStepSchedule(
        new Date(),
        stepForReschedule,
        sequence.businessDaysOnly,
        sequence.timezone
      );
    }
  }

  /**
   * Check exit conditions
   */
  private checkExitConditions(enrollment: LeadEnrollment, eventType: ExitCondition['type']): void {
    const sequence = this.sequences.get(enrollment.sequenceId);
    if (!sequence) return;

    const exitCondition = sequence.exitConditions.find(c => c.type === eventType);
    if (exitCondition && exitCondition.action === 'exit') {
      this.removeFromSequence(enrollment.id, eventType);
    }
  }

  // ============================================
  // SEQUENCE RECOMMENDATIONS
  // ============================================

  /**
   * Get recommended sequence for lead
   */
  getRecommendedSequence(lead: Lead): OutreachSequence | null {
    const sequences = Array.from(this.sequences.values()).filter(s => s.status === 'active');

    // Match by source
    const sourceSequence = sequences.find(s => {
      if (s.type === 'demo_request_followup' && lead.source === 'demo_request') return true;
      if (s.type === 'trial_activation' && lead.source === 'free_trial') return true;
      if (s.type === 'content_download' && lead.source === 'content_download') return true;
      if (s.type === 'cold_outbound' && lead.source === 'cold_outbound') return true;
      return false;
    });

    if (sourceSequence) return sourceSequence;

    // Match by criteria
    for (const sequence of sequences) {
      if (this.matchesCriteria(lead, sequence.targetCriteria)) {
        return sequence;
      }
    }

    // Default to initial outreach
    return sequences.find(s => s.type === 'initial_outreach') || sequences[0] || null;
  }

  /**
   * Check if lead matches sequence criteria
   */
  private matchesCriteria(lead: Lead, criteria?: SequenceTargetCriteria): boolean {
    if (!criteria) return true;

    if (criteria.leadSources && !criteria.leadSources.includes(lead.source)) {
      return false;
    }

    if (criteria.industries && lead.industry && !criteria.industries.includes(lead.industry.toLowerCase())) {
      return false;
    }

    if (criteria.companySizes && lead.companySize && !criteria.companySizes.includes(lead.companySize)) {
      return false;
    }

    if (criteria.requireTags && !criteria.requireTags.every(t => lead.tags.includes(t))) {
      return false;
    }

    if (criteria.excludeTags && criteria.excludeTags.some(t => lead.tags.includes(t))) {
      return false;
    }

    if (criteria.minScore && lead.qualificationScore < criteria.minScore) {
      return false;
    }

    if (criteria.maxScore && lead.qualificationScore > criteria.maxScore) {
      return false;
    }

    return true;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get sequence statistics
   */
  getSequenceStats(sequenceId: string): {
    enrolled: number;
    active: number;
    completed: number;
    exited: number;
    replyRate: number;
    meetingRate: number;
    avgStepsToReply: number;
  } | null {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;

    const enrollments = Array.from(this.enrollments.values()).filter(
      e => e.sequenceId === sequenceId
    );

    const active = enrollments.filter(e => e.status === 'active').length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const exited = enrollments.filter(e => e.status === 'exited').length;
    const replied = enrollments.filter(e => e.totalReplies > 0).length;

    // Calculate avg steps to reply
    let totalStepsToReply = 0;
    let repliedCount = 0;
    for (const enrollment of enrollments) {
      if (enrollment.totalReplies > 0) {
        totalStepsToReply += enrollment.currentStep;
        repliedCount++;
      }
    }

    return {
      enrolled: sequence.leadsEnrolled,
      active,
      completed,
      exited,
      replyRate: enrollments.length > 0 ? replied / enrollments.length : 0,
      meetingRate: enrollments.length > 0 ? sequence.meetingsBooked / enrollments.length : 0,
      avgStepsToReply: repliedCount > 0 ? totalStepsToReply / repliedCount : 0,
    };
  }

  /**
   * Get A/B test results for step
   */
  getVariantPerformance(sequenceId: string, stepId: string): StepVariant[] {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return [];

    const step = sequence.steps.find(s => s.id === stepId);
    if (!step || !step.variants) return [];

    return step.variants;
  }
}

/**
 * Create outreach sequence manager
 */
export function createOutreachSequenceManager(
  config?: Partial<SequenceManagerConfig>
): OutreachSequenceManager {
  return new OutreachSequenceManager(config);
}

