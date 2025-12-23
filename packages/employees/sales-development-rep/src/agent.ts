/**
 * AI Sales Development Rep (SDR) Agent
 * 
 * Core implementation of the AI SDR employee for lead qualification,
 * outreach, follow-up automation, meeting scheduling, and CRM integration.
 */

import { createLogger } from '@aibos/core';
import {
  type Employee,
  type Contact,
  type CreateActionInput,
  createPersonaManager,
  createMemoryStore,
  createTrustManager,
  createActionEngine,
  createKnowledgeBase,
  KNOWLEDGE_TEMPLATES,
} from '@aibos/employee-core';
import {
  createUnifiedInbox,
} from '@aibos/communication-hub';
import type {
  SDRConfig,
  SDRState,
  Lead,
  LeadStatus,
  LeadTemperature,
  OutreachSequence,
  LeadEnrollment,
  FollowUp,
  MeetingRequest,
  MeetingOutcome,
  CRMActivity,
  SDRActionType,
  SDRActionContext,
  SDRPerformanceReport,
  SDRTask,
  CreateLeadInput,
  UpdateLeadInput,
  EnrollLeadInput,
  ScheduleMeetingInput,
} from './types';
import { createLeadQualifier, LeadQualifier, QualificationResult } from './qualification/qualifier';
import { createQualificationConversationManager, QualificationConversationManager } from './qualification/conversation';
import { createOutreachSequenceManager, OutreachSequenceManager } from './outreach/sequence-manager';
import { createFollowUpEngine, FollowUpEngine } from './followup/engine';
import { createMeetingScheduler, MeetingScheduler } from './scheduling/scheduler';
import { createCRMService, CRMService } from './crm/service';
import * as templates from './templates';

const logger = createLogger('employee:sdr');

// ============================================
// DEFAULT SDR CONFIGURATION
// ============================================

const DEFAULT_SDR_CONFIG: SDRConfig = {
  maxLeadsAssigned: 100,
  coldLeadThresholdDays: 14,
  qualificationThreshold: 60,
  maxOutreachAttempts: 8,
  followUpIntervalDays: 3,
  autoOutreachEnabled: true,
  preferredChannels: ['email', 'slack'],
  workingHours: {
    timezone: 'America/New_York',
    start: '09:00',
    end: '18:00',
    workDays: [1, 2, 3, 4, 5],
  },
  meetingDefaults: {
    durationMinutes: 30,
    bufferMinutes: 15,
    advanceNoticeDays: 1,
    preferredTimes: ['10:00', '14:00', '15:30'],
  },
  escalationRules: [
    {
      id: 'hot_lead',
      trigger: 'high_score_lead',
      threshold: 80,
      action: 'escalate_to_ae',
      priority: 'urgent',
    },
    {
      id: 'no_response_7days',
      trigger: 'no_response',
      threshold: 7,
      action: 'auto_followup',
      priority: 'medium',
    },
    {
      id: 'negative_response',
      trigger: 'negative_response',
      action: 'manager_review',
      priority: 'high',
    },
  ],
  responseTimeTargetHours: 4,
};

// ============================================
// SDR AGENT CLASS
// ============================================

export class SalesDevAgent {
  private state: SDRState;
  private persona;
  private memory;
  private trust;
  private actions;
  private knowledge;
  private inbox;

  // Subsystems
  private qualifier: LeadQualifier;
  private conversationManager: QualificationConversationManager;
  private sequenceManager: OutreachSequenceManager;
  private followUpEngine: FollowUpEngine;
  private meetingScheduler: MeetingScheduler;
  private crmService: CRMService;

  constructor(employee: Employee, config?: Partial<SDRConfig>) {
    this.state = {
      employee,
      config: { ...DEFAULT_SDR_CONFIG, ...config },
      assignedLeads: [],
      activeEnrollments: [],
      pendingFollowUps: [],
      scheduledMeetings: [],
      recentActivities: [],
      todaysTasks: [],
    };

    // Initialize core systems
    this.persona = createPersonaManager('sales_dev', employee.persona);
    this.memory = createMemoryStore(employee.id);
    this.trust = createTrustManager(employee.id, employee.trustConfig);
    this.actions = createActionEngine(employee.id, employee.workspaceId, this.trust);
    this.knowledge = createKnowledgeBase(employee.id);
    this.inbox = createUnifiedInbox(employee.workspaceId);

    // Initialize SDR-specific systems
    this.qualifier = createLeadQualifier({
      qualificationThreshold: this.state.config.qualificationThreshold,
    });
    this.conversationManager = createQualificationConversationManager();
    this.sequenceManager = createOutreachSequenceManager({
      defaultTimezone: this.state.config.workingHours.timezone,
      businessHoursStart: this.state.config.workingHours.start,
      businessHoursEnd: this.state.config.workingHours.end,
      businessDays: this.state.config.workingHours.workDays,
    });
    this.followUpEngine = createFollowUpEngine({
      businessHoursOnly: true,
      businessHoursStart: this.state.config.workingHours.start,
      businessHoursEnd: this.state.config.workingHours.end,
      businessDays: this.state.config.workingHours.workDays,
      timezone: this.state.config.workingHours.timezone,
    });
    this.meetingScheduler = createMeetingScheduler({
      defaultDuration: this.state.config.meetingDefaults.durationMinutes,
      bufferMinutes: this.state.config.meetingDefaults.bufferMinutes,
      advanceNoticeDays: this.state.config.meetingDefaults.advanceNoticeDays,
      preferredTimes: this.state.config.meetingDefaults.preferredTimes,
      timezone: this.state.config.workingHours.timezone,
      businessHoursStart: this.state.config.workingHours.start,
      businessHoursEnd: this.state.config.workingHours.end,
      businessDays: this.state.config.workingHours.workDays,
    });
    this.crmService = createCRMService();

    // Load default knowledge
    this.loadDefaultKnowledge();

    logger.info('Sales Development Rep initialized', {
      employeeId: employee.id,
      name: employee.name,
    });
  }

  /**
   * Load default SDR knowledge
   */
  private async loadDefaultKnowledge(): Promise<void> {
    const knowledgeTemplates = KNOWLEDGE_TEMPLATES.sales_dev || [];
    for (const template of knowledgeTemplates) {
      await this.knowledge.addEntry({
        employeeId: this.state.employee.id,
        ...template,
      });
    }
  }

  /**
   * Get employee info
   */
  getEmployee(): Employee {
    return this.state.employee;
  }

  /**
   * Get SDR config
   */
  getConfig(): SDRConfig {
    return this.state.config;
  }

  /**
   * Update SDR config
   */
  updateConfig(updates: Partial<SDRConfig>): void {
    this.state.config = { ...this.state.config, ...updates };
    logger.info('SDR config updated', { updates });
  }

  // ============================================
  // LEAD MANAGEMENT
  // ============================================

  /**
   * Add lead to pipeline
   */
  async addLead(input: CreateLeadInput): Promise<Lead> {
    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const lead: Lead = {
      id,
      workspaceId: input.workspaceId,
      contactId: `contact_${id}`,
      email: input.email,
      name: input.name,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      title: input.title,
      phone: input.phone,
      linkedInUrl: input.linkedInUrl,
      source: input.source,
      sourceDetail: input.sourceDetail,
      status: 'new',
      temperature: this.determineTemperature(input),
      lifecycleStage: 'lead',
      qualificationScore: 0,
      qualificationStatus: 'not_started',
      totalTouchpoints: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      meetingsScheduled: 0,
      meetingsCompleted: 0,
      assignedSDRId: this.state.employee.id,
      assignedAt: now,
      industry: input.industry,
      companySize: input.companySize,
      tags: input.tags || [],
      customFields: input.customFields,
      createdAt: now,
      updatedAt: now,
    };

    this.state.assignedLeads.push(lead);

    // Quick score the lead
    lead.qualificationScore = this.qualifier.quickScore(lead);

    // Store in memory
    await this.memory.store({
      contextType: 'contact',
      contextId: lead.id,
      content: `New lead: ${lead.name} from ${lead.company}, Source: ${lead.source}, Score: ${lead.qualificationScore}`,
      importanceScore: 0.7,
      tags: ['lead', 'new', lead.source],
    });

    // Sync to CRM
    await this.crmService.syncLeadToCRM(lead);

    logger.info('Lead added', {
      leadId: lead.id,
      company: lead.company,
      source: lead.source,
    });

    return lead;
  }

  /**
   * Determine initial lead temperature
   */
  private determineTemperature(input: CreateLeadInput): LeadTemperature {
    if (input.source === 'demo_request' || input.source === 'referral') {
      return 'hot';
    }
    if (input.source === 'content_download' || input.source === 'free_trial') {
      return 'warm';
    }
    return 'cold';
  }

  /**
   * Get lead by ID
   */
  getLead(leadId: string): Lead | undefined {
    return this.state.assignedLeads.find(l => l.id === leadId);
  }

  /**
   * Get all assigned leads
   */
  getAssignedLeads(): Lead[] {
    return this.state.assignedLeads;
  }

  /**
   * Get leads by status
   */
  getLeadsByStatus(status: LeadStatus): Lead[] {
    return this.state.assignedLeads.filter(l => l.status === status);
  }

  /**
   * Update lead
   */
  async updateLead(leadId: string, updates: UpdateLeadInput): Promise<Lead | null> {
    const lead = this.getLead(leadId);
    if (!lead) return null;

    // Apply updates
    Object.assign(lead, updates);
    lead.updatedAt = new Date();

    // Re-qualify if relevant fields changed
    if (updates.budgetInfo || updates.authorityInfo || updates.needInfo || updates.timelineInfo) {
      const result = this.qualifier.qualify(lead);
      lead.qualificationScore = result.score;
      lead.qualificationStatus = result.status;
    }

    // Sync to CRM
    await this.crmService.syncLeadToCRM(lead);

    // Log activity
    await this.crmService.logActivity(leadId, 'status_changed', {
      subject: `Lead updated`,
      description: `Updated fields: ${Object.keys(updates).join(', ')}`,
    });

    return lead;
  }

  // ============================================
  // QUALIFICATION
  // ============================================

  /**
   * Qualify a lead
   */
  qualifyLead(leadId: string): QualificationResult | null {
    const lead = this.getLead(leadId);
    if (!lead) return null;

    const result = this.qualifier.qualify(lead);

    // Update lead with qualification result
    lead.qualificationScore = result.score;
    lead.qualificationStatus = result.status;
    lead.updatedAt = new Date();

    // Check for handoff triggers
    if (result.isQualified && result.score >= 80) {
      this.checkForHandoff(lead, result);
    }

    logger.info('Lead qualified', {
      leadId,
      score: result.score,
      status: result.status,
    });

    return result;
  }

  /**
   * Check if lead should be handed off to AE
   */
  private async checkForHandoff(lead: Lead, result: QualificationResult): Promise<void> {
    const rule = this.state.config.escalationRules.find(
      r => r.trigger === 'high_score_lead' && result.score >= (r.threshold || 80)
    );

    if (rule && rule.action === 'escalate_to_ae') {
      await this.queueAction('handoff_to_ae', {
        leadId: lead.id,
        notes: `Lead qualified with score ${result.score}. ${result.strengths.join(', ')}`,
      });

      lead.status = 'qualified';
      lead.lifecycleStage = 'sales_qualified';
    }
  }

  /**
   * Start qualification conversation
   */
  startQualificationConversation(leadId: string) {
    const lead = this.getLead(leadId);
    if (!lead) return null;

    const result = this.qualifier.qualify(lead);
    return this.conversationManager.startConversation(
      leadId,
      this.state.employee.id,
      result.nextQuestions
    );
  }

  /**
   * Process lead message in qualification conversation
   */
  async processLeadMessage(conversationId: string, message: string) {
    return this.conversationManager.processLeadMessage(conversationId, message);
  }

  // ============================================
  // OUTREACH
  // ============================================

  /**
   * Enroll lead in outreach sequence
   */
  enrollInSequence(input: EnrollLeadInput): LeadEnrollment | null {
    const lead = this.getLead(input.leadId);
    if (!lead) return null;

    try {
      const enrollment = this.sequenceManager.enrollLead(input, this.state.employee.id);
      
      this.state.activeEnrollments.push(enrollment);
      lead.currentSequenceId = input.sequenceId;
      lead.sequenceStartedAt = new Date();
      lead.status = 'contacted';

      logger.info('Lead enrolled in sequence', {
        leadId: input.leadId,
        sequenceId: input.sequenceId,
      });

      return enrollment;
    } catch (error) {
      logger.error(
        'Failed to enroll lead',
        error instanceof Error ? error : new Error(String(error)),
        { leadId: input.leadId }
      );
      return null;
    }
  }

  /**
   * Get recommended sequence for lead
   */
  getRecommendedSequence(leadId: string): OutreachSequence | null {
    const lead = this.getLead(leadId);
    if (!lead) return null;

    return this.sequenceManager.getRecommendedSequence(lead);
  }

  /**
   * Get all available sequences
   */
  getAvailableSequences(): OutreachSequence[] {
    return this.sequenceManager.getAllSequences(this.state.employee.workspaceId);
  }

  /**
   * Process due outreach steps
   */
  async processDueOutreachSteps(): Promise<void> {
    const dueSteps = this.sequenceManager.getDueSteps();

    for (const { enrollment, step } of dueSteps) {
      const lead = this.getLead(enrollment.leadId);
      if (!lead) continue;

      await this.queueAction('send_initial_outreach', {
        leadId: lead.id,
        sequenceId: enrollment.sequenceId,
        enrollmentId: enrollment.id,
        channel: step.channel,
        templateId: step.templateId,
      });
    }

    logger.info('Due outreach steps processed', { count: dueSteps.length });
  }

  /**
   * Record outreach response
   */
  async recordOutreachResponse(
    enrollmentId: string,
    responded: boolean,
    sentiment?: 'positive' | 'neutral' | 'negative'
  ): Promise<void> {
    if (responded) {
      this.sequenceManager.recordReply(enrollmentId);

      const enrollment = this.sequenceManager.getEnrollment(enrollmentId);
      if (enrollment) {
        const lead = this.getLead(enrollment.leadId);
        if (lead) {
          lead.lastResponseAt = new Date();
          lead.status = 'engaged';
          lead.temperature = sentiment === 'positive' ? 'hot' : 'warm';

          // Trigger follow-up
          if (sentiment) {
            await this.followUpEngine.processEvent(
              sentiment === 'positive' ? 'email_clicked' : 'no_reply',
              lead,
              this.state.employee.id,
              { sentiment }
            );
          }
        }
      }
    }
  }

  // ============================================
  // FOLLOW-UPS
  // ============================================

  /**
   * Process events for follow-up automation
   */
  async processFollowUpEvent(
    eventType: 'email_opened' | 'email_clicked' | 'no_reply' | 'call_completed' | 'meeting_completed',
    leadId: string,
    eventData?: Record<string, unknown>
  ): Promise<FollowUp[]> {
    const lead = this.getLead(leadId);
    if (!lead) return [];

    const followUps = await this.followUpEngine.processEvent(
      eventType,
      lead,
      this.state.employee.id,
      eventData
    );

    this.state.pendingFollowUps.push(...followUps);
    return followUps;
  }

  /**
   * Get due follow-ups
   */
  getDueFollowUps(): FollowUp[] {
    return this.followUpEngine.getDueFollowUps();
  }

  /**
   * Process due follow-ups
   */
  async processDueFollowUps(): Promise<void> {
    const dueFollowUps = this.followUpEngine.getDueFollowUps();

    for (const followUp of dueFollowUps) {
      await this.queueAction('send_followup_email', {
        leadId: followUp.leadId,
        followUpId: followUp.id,
        channel: followUp.channel,
        templateId: followUp.templateId,
        customMessage: followUp.customMessage,
      });
    }

    logger.info('Due follow-ups processed', { count: dueFollowUps.length });
  }

  // ============================================
  // MEETINGS
  // ============================================

  /**
   * Request a meeting
   */
  requestMeeting(input: ScheduleMeetingInput): MeetingRequest | null {
    const lead = this.getLead(input.leadId);
    if (!lead) return null;

    const meeting = this.meetingScheduler.requestMeeting(
      input,
      this.state.employee.id,
      lead
    );

    this.state.scheduledMeetings.push(meeting);
    lead.meetingsScheduled++;

    return meeting;
  }

  /**
   * Confirm meeting
   */
  confirmMeeting(meetingId: string, selectedTime: Date, videoLink?: string): MeetingRequest | null {
    const meeting = this.meetingScheduler.confirmMeeting(meetingId, selectedTime, videoLink);
    
    if (meeting) {
      const lead = this.getLead(meeting.leadId);
      if (lead) {
        lead.status = 'meeting_scheduled';
      }
    }

    return meeting;
  }

  /**
   * Record meeting outcome
   */
  async recordMeetingOutcome(meetingId: string, outcome: MeetingOutcome): Promise<MeetingRequest | null> {
    const meeting = this.meetingScheduler.recordOutcome(meetingId, outcome);

    if (meeting) {
      const lead = this.getLead(meeting.leadId);
      if (lead) {
        if (outcome.happened) {
          lead.meetingsCompleted++;
          lead.status = 'meeting_completed';

          // Log activity
          await this.crmService.logActivity(lead.id, 'meeting_completed', {
            subject: `Meeting completed: ${meeting.title}`,
            description: outcome.notes,
            duration: meeting.duration,
          });

          // Update qualification if provided
          if (outcome.qualificationUpdates) {
            await this.updateLead(lead.id, outcome.qualificationUpdates);
          }

          // Check for handoff
          if (outcome.handoffToAE) {
            await this.queueAction('handoff_to_ae', {
              leadId: lead.id,
              notes: outcome.notes,
            });
          }

          // Trigger post-meeting follow-up
          await this.processFollowUpEvent('meeting_completed', lead.id);
        } else {
          // No show handling
          await this.queueAction('send_meeting_followup', {
            leadId: lead.id,
            meetingId: meeting.id,
            customMessage: 'no_show',
          });
        }
      }
    }

    return meeting;
  }

  /**
   * Get upcoming meetings
   */
  getUpcomingMeetings(days: number = 7): MeetingRequest[] {
    return this.meetingScheduler.getUpcomingMeetings(this.state.employee.id, days);
  }

  /**
   * Send meeting reminders
   */
  async sendMeetingReminders(): Promise<void> {
    const meetingsNeedingReminders = this.meetingScheduler.getMeetingsNeedingReminders();

    for (const meeting of meetingsNeedingReminders) {
      await this.queueAction('send_meeting_reminder', {
        leadId: meeting.leadId,
        meetingId: meeting.id,
      });

      this.meetingScheduler.markReminderSent(meeting.id);
    }

    logger.info('Meeting reminders sent', { count: meetingsNeedingReminders.length });
  }

  // ============================================
  // CRM INTEGRATION
  // ============================================

  /**
   * Sync all leads to CRM
   */
  async syncToCRM(): Promise<void> {
    const result = await this.crmService.bulkSync(this.state.assignedLeads);
    
    logger.info('CRM sync completed', {
      syncedLeads: result.syncedLeads,
      errors: result.errors.length,
    });
  }

  /**
   * Log activity to CRM
   */
  async logActivity(
    leadId: string,
    type: CRMActivity['type'],
    details: { subject: string; description?: string; duration?: number }
  ): Promise<CRMActivity> {
    return this.crmService.logActivity(leadId, type, details);
  }

  // ============================================
  // DAILY TASKS
  // ============================================

  /**
   * Generate today's task list
   */
  generateDailyTasks(): SDRTask[] {
    const tasks: SDRTask[] = [];
    const now = new Date();

    // Due follow-ups
    const dueFollowUps = this.followUpEngine.getDueFollowUps();
    for (const followUp of dueFollowUps) {
      const lead = this.getLead(followUp.leadId);
      if (lead) {
        tasks.push({
          id: `task_${followUp.id}`,
          type: 'follow_up',
          leadId: followUp.leadId,
          leadName: lead.name,
          description: `Follow up with ${lead.name} (${followUp.type})`,
          priority: followUp.priority,
          dueAt: followUp.scheduledFor,
          status: 'pending',
        });
      }
    }

    // Due outreach steps
    const dueSteps = this.sequenceManager.getDueSteps();
    for (const { enrollment, step } of dueSteps) {
      const lead = this.getLead(enrollment.leadId);
      if (lead) {
        tasks.push({
          id: `task_${enrollment.id}_${step.id}`,
          type: step.type === 'phone_call' ? 'call' : step.type === 'linkedin_connection' ? 'linkedin' : 'email',
          leadId: lead.id,
          leadName: lead.name,
          description: `${step.name} for ${lead.name}`,
          priority: 'medium',
          dueAt: now,
          status: 'pending',
        });
      }
    }

    // Upcoming meetings prep
    const meetings = this.getUpcomingMeetings(1);
    for (const meeting of meetings) {
      const lead = this.getLead(meeting.leadId);
      if (lead) {
        tasks.push({
          id: `task_prep_${meeting.id}`,
          type: 'meeting_prep',
          leadId: lead.id,
          leadName: lead.name,
          description: `Prepare for ${meeting.type} with ${lead.name}`,
          priority: 'high',
          dueAt: meeting.selectedTime!,
          status: 'pending',
        });
      }
    }

    // Sort by priority and due time
    tasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.dueAt.getTime() - b.dueAt.getTime();
    });

    this.state.todaysTasks = tasks;
    return tasks;
  }

  /**
   * Get today's tasks
   */
  getTodaysTasks(): SDRTask[] {
    return this.state.todaysTasks;
  }

  /**
   * Complete task
   */
  completeTask(taskId: string): SDRTask | null {
    const task = this.state.todaysTasks.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completedAt = new Date();
    return task;
  }

  // ============================================
  // ACTION MANAGEMENT
  // ============================================

  /**
   * Queue an action for execution
   */
  async queueAction(type: SDRActionType, context: SDRActionContext): Promise<string> {
    const input: CreateActionInput = {
      employeeId: this.state.employee.id,
      type: this.mapSDRActionToGeneric(type),
      parameters: {
        sdrActionType: type,
        ...context,
      },
    };

    const action = await this.actions.createAction(input);
    return action.id;
  }

  /**
   * Map SDR-specific action to generic action type
   */
  private mapSDRActionToGeneric(sdrAction: SDRActionType) {
    switch (sdrAction) {
      case 'send_initial_outreach':
      case 'send_followup_email':
      case 'send_meeting_reminder':
      case 'send_meeting_followup':
        return 'send_email' as const;
      case 'send_linkedin_connection':
      case 'send_linkedin_message':
      case 'send_sms':
        return 'send_message' as const;
      case 'schedule_meeting':
        return 'schedule_meeting' as const;
      case 'make_phone_call':
      case 'leave_voicemail':
        return 'send_message' as const;
      case 'handoff_to_ae':
      case 'escalate_to_manager':
        return 'escalate' as const;
      case 'qualify_lead':
      case 'disqualify_lead':
      case 'update_lead_status':
        return 'update_contact' as const;
      case 'add_note':
      case 'create_task':
        return 'create_task' as const;
      default:
        return 'send_message' as const;
    }
  }

  /**
   * Get pending actions
   */
  getPendingActions() {
    return this.actions.getPendingActions();
  }

  /**
   * Approve action
   */
  async approveAction(actionId: string, approvedBy: string) {
    return this.actions.approveAction(actionId, approvedBy);
  }

  /**
   * Reject action
   */
  async rejectAction(actionId: string, rejectedBy: string, reason: string) {
    return this.actions.rejectAction(actionId, rejectedBy, reason);
  }

  // ============================================
  // REPORTING
  // ============================================

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<SDRPerformanceReport> {
    const now = new Date();
    const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const leads = this.state.assignedLeads;
    const followUpStats = this.followUpEngine.getStats(this.state.employee.id);
    const meetingStats = this.meetingScheduler.getStats(this.state.employee.id);

    // Calculate metrics
    const newLeads = leads.filter(l => l.createdAt >= startDate).length;
    const contacted = leads.filter(l => l.status !== 'new' && l.lastTouchpointAt && l.lastTouchpointAt >= startDate).length;
    const qualified = leads.filter(l => l.status === 'qualified' && l.updatedAt >= startDate).length;
    const disqualified = leads.filter(l => l.status === 'disqualified' && l.updatedAt >= startDate).length;

    // Sequence stats
    const enrollments = this.state.activeEnrollments;
    const sequenceStats = this.sequenceManager.getSequenceStats(enrollments[0]?.sequenceId || '');

    const report: SDRPerformanceReport = {
      id: `report_${now.getTime()}`,
      workspaceId: this.state.employee.workspaceId,
      sdrEmployeeId: this.state.employee.id,
      period,
      startDate,
      endDate: now,

      activityMetrics: {
        emailsSent: leads.reduce((sum, l) => sum + l.totalTouchpoints, 0),
        emailsOpened: leads.reduce((sum, l) => sum + l.emailsOpened, 0),
        emailsClicked: leads.reduce((sum, l) => sum + l.emailsClicked, 0),
        emailsReplied: leads.filter(l => l.lastResponseAt).length,
        callsMade: 0, // Would come from call tracking
        callsConnected: 0,
        voicemailsLeft: 0,
        linkedInSent: 0, // Would come from LinkedIn integration
        linkedInAccepted: 0,
        totalTouchpoints: leads.reduce((sum, l) => sum + l.totalTouchpoints, 0),
      },

      leadMetrics: {
        newLeadsAssigned: newLeads,
        leadsContacted: contacted,
        leadsQualified: qualified,
        leadsDisqualified: disqualified,
        leadsHandedOff: leads.filter(l => l.assignedAEId && l.updatedAt >= startDate).length,
        conversionRate: newLeads > 0 ? qualified / newLeads : 0,
      },

      meetingMetrics: {
        meetingsBooked: meetingStats.confirmed + meetingStats.completed,
        meetingsCompleted: meetingStats.completed,
        meetingsNoShow: meetingStats.noShow,
        meetingShowRate: meetingStats.showRate,
        avgMeetingsPerLead: leads.length > 0 ? meetingStats.completed / leads.length : 0,
      },

      sequenceMetrics: {
        leadsEnrolled: sequenceStats?.enrolled || 0,
        leadsCompleted: sequenceStats?.completed || 0,
        replyRate: sequenceStats?.replyRate || 0,
        avgStepsToReply: sequenceStats?.avgStepsToReply || 0,
      },

      responseMetrics: {
        avgResponseTimeHours: this.state.config.responseTimeTargetHours,
        sameBusinessDayRate: 0.8, // Would calculate from actual data
      },

      pipelineMetrics: {
        opportunitiesCreated: qualified,
        pipelineValue: 0, // Would calculate from deal values
        avgDealSize: 0,
      },

      topSequences: [],
      topTemplates: [],

      generatedAt: now,
    };

    logger.info('Performance report generated', {
      reportId: report.id,
      period,
    });

    return report;
  }

  // ============================================
  // NATURAL LANGUAGE INTERFACE
  // ============================================

  /**
   * Handle natural language query
   */
  async handleQuery(query: string, context?: { leadId?: string }): Promise<string> {
    const queryLower = query.toLowerCase();

    // Lead queries
    if (queryLower.includes('pipeline') || queryLower.includes('leads')) {
      return this.formatPipelineSummary();
    }

    if (queryLower.includes('qualified') || queryLower.includes('qualification')) {
      if (context?.leadId) {
        const result = this.qualifyLead(context.leadId);
        return result ? this.formatQualificationResult(result) : 'Lead not found';
      }
      return this.formatQualifiedLeads();
    }

    if (queryLower.includes('follow') || queryLower.includes('task')) {
      return this.formatTodaysTasks();
    }

    if (queryLower.includes('meeting') || queryLower.includes('calendar')) {
      return this.formatUpcomingMeetings();
    }

    if (queryLower.includes('performance') || queryLower.includes('metrics')) {
      const report = await this.generatePerformanceReport('weekly');
      return this.formatPerformanceHighlights(report);
    }

    if (queryLower.includes('sequence') || queryLower.includes('outreach')) {
      return this.formatActiveSequences();
    }

    // Default response
    return `I'm ${this.state.employee.name}, your AI Sales Development Rep. I can help you with:
- Pipeline overview and lead status
- Lead qualification and scoring
- Today's tasks and follow-ups
- Meeting scheduling
- Performance metrics
- Outreach sequences

What would you like to know?`;
  }

  // ============================================
  // FORMATTING HELPERS
  // ============================================

  private formatPipelineSummary(): string {
    const leads = this.state.assignedLeads;
    const byStatus: Record<LeadStatus, number> = {} as Record<LeadStatus, number>;

    for (const lead of leads) {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    }

    const totalValue = leads.reduce((sum, l) => sum + l.qualificationScore, 0);
    const avgScore = leads.length > 0 ? Math.round(totalValue / leads.length) : 0;

    return `Pipeline Summary:
- Total Leads: ${leads.length}
- New: ${byStatus.new || 0}
- Contacted: ${byStatus.contacted || 0}
- Engaged: ${byStatus.engaged || 0}
- Qualified: ${byStatus.qualified || 0}
- Meeting Scheduled: ${byStatus.meeting_scheduled || 0}
- Average Score: ${avgScore}

Hot Leads: ${leads.filter(l => l.temperature === 'hot').length}
Warm Leads: ${leads.filter(l => l.temperature === 'warm').length}`;
  }

  private formatQualifiedLeads(): string {
    const qualified = this.state.assignedLeads.filter(l => l.qualificationStatus === 'qualified');
    
    if (qualified.length === 0) {
      return 'No qualified leads at the moment.';
    }

    return `Qualified Leads (${qualified.length}):\n` +
      qualified.slice(0, 5).map(l => 
        `- ${l.name} (${l.company}): Score ${l.qualificationScore}, Status: ${l.status}`
      ).join('\n');
  }

  private formatQualificationResult(result: QualificationResult): string {
    return `Qualification Result:
- Score: ${result.score}/100
- Status: ${result.status}
- BANT Breakdown:
  - Budget: ${result.breakdown.budget}
  - Authority: ${result.breakdown.authority}
  - Need: ${result.breakdown.need}
  - Timeline: ${result.breakdown.timeline}
  - Company Fit: ${result.breakdown.companyFit}

Strengths: ${result.strengths.join(', ') || 'None identified'}
Areas to Explore: ${result.weaknesses.join(', ') || 'None identified'}`;
  }

  private formatTodaysTasks(): string {
    const tasks = this.state.todaysTasks.length > 0 
      ? this.state.todaysTasks 
      : this.generateDailyTasks();

    if (tasks.length === 0) {
      return 'No tasks for today. All caught up!';
    }

    return `Today's Tasks (${tasks.length}):\n` +
      tasks.slice(0, 10).map((t, i) => 
        `${i + 1}. [${t.priority.toUpperCase()}] ${t.description}`
      ).join('\n');
  }

  private formatUpcomingMeetings(): string {
    const meetings = this.getUpcomingMeetings();

    if (meetings.length === 0) {
      return 'No upcoming meetings scheduled.';
    }

    return `Upcoming Meetings (${meetings.length}):\n` +
      meetings.map(m => {
        const lead = this.getLead(m.leadId);
        const time = m.selectedTime?.toLocaleString() || 'TBD';
        return `- ${m.type} with ${lead?.name || 'Unknown'} (${lead?.company || 'Unknown'}): ${time}`;
      }).join('\n');
  }

  private formatActiveSequences(): string {
    const sequences = this.getAvailableSequences().filter(s => s.status === 'active');
    const enrollments = this.state.activeEnrollments.filter(e => e.status === 'active');

    return `Active Sequences:
${sequences.map(s => `- ${s.name}: ${s.leadsEnrolled} enrolled, ${(s.leadsReplied / Math.max(s.leadsEnrolled, 1) * 100).toFixed(0)}% reply rate`).join('\n')}

Currently Active Enrollments: ${enrollments.length}`;
  }

  private formatPerformanceHighlights(report: SDRPerformanceReport): string {
    return `Performance Highlights (${report.period}):

Activity:
- Touchpoints: ${report.activityMetrics.totalTouchpoints}
- Emails Sent: ${report.activityMetrics.emailsSent}
- Reply Rate: ${report.activityMetrics.emailsReplied}

Leads:
- New: ${report.leadMetrics.newLeadsAssigned}
- Qualified: ${report.leadMetrics.leadsQualified}
- Conversion: ${(report.leadMetrics.conversionRate * 100).toFixed(0)}%

Meetings:
- Booked: ${report.meetingMetrics.meetingsBooked}
- Completed: ${report.meetingMetrics.meetingsCompleted}
- Show Rate: ${(report.meetingMetrics.meetingShowRate * 100).toFixed(0)}%`;
  }
}

/**
 * Create a Sales Development Rep agent
 */
export function createSalesDevAgent(
  employee: Employee,
  config?: Partial<SDRConfig>
): SalesDevAgent {
  return new SalesDevAgent(employee, config);
}

