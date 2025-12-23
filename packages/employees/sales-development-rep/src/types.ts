/**
 * AI Sales Development Rep (SDR) Types
 * 
 * Type definitions for the Sales Development Rep AI Employee.
 */

import type { Employee, Contact, CommunicationChannel } from '@aibos/employee-core';

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface SDRConfig {
  /** Maximum leads per SDR */
  maxLeadsAssigned: number;
  /** Days before a lead is considered cold */
  coldLeadThresholdDays: number;
  /** Minimum qualification score to pass to AE (0-100) */
  qualificationThreshold: number;
  /** Maximum outreach attempts per lead */
  maxOutreachAttempts: number;
  /** Days between follow-ups */
  followUpIntervalDays: number;
  /** Enable automated outreach */
  autoOutreachEnabled: boolean;
  /** Preferred communication channels in order */
  preferredChannels: CommunicationChannel[];
  /** Working hours for outreach */
  workingHours: {
    timezone: string;
    start: string; // HH:mm
    end: string; // HH:mm
    workDays: number[]; // 0-6, 0 = Sunday
  };
  /** Meeting scheduling preferences */
  meetingDefaults: {
    durationMinutes: number;
    bufferMinutes: number;
    advanceNoticeDays: number;
    preferredTimes: string[]; // HH:mm format
  };
  /** Escalation rules */
  escalationRules: SDREscalationRule[];
  /** Response time target in hours */
  responseTimeTargetHours: number;
}

export interface SDREscalationRule {
  id: string;
  trigger: 'high_score_lead' | 'hot_lead' | 'no_response' | 'negative_response' | 'requested_callback';
  threshold?: number;
  action: 'notify' | 'escalate_to_ae' | 'manager_review' | 'auto_followup';
  notifyUsers?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// ============================================
// LEAD TYPES
// ============================================

export interface Lead {
  id: string;
  workspaceId: string;
  contactId: string;
  
  // Contact info (denormalized for convenience)
  email: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company: string;
  title?: string;
  linkedInUrl?: string;
  
  // Lead source and tracking
  source: LeadSource;
  sourceDetail?: string; // e.g., "Google Ads - Campaign A"
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  
  // Status and lifecycle
  status: LeadStatus;
  temperature: LeadTemperature;
  lifecycleStage: LeadLifecycleStage;
  
  // Qualification
  qualificationScore: number; // 0-100
  qualificationStatus: QualificationStatus;
  qualificationNotes?: string;
  budgetInfo?: BudgetInfo;
  authorityInfo?: AuthorityInfo;
  needInfo?: NeedInfo;
  timelineInfo?: TimelineInfo;
  
  // Engagement tracking
  totalTouchpoints: number;
  lastTouchpointAt?: Date;
  lastResponseAt?: Date;
  meetingsScheduled: number;
  meetingsCompleted: number;
  emailsOpened: number;
  emailsClicked: number;
  
  // Assignment
  assignedSDRId?: string;
  assignedAEId?: string;
  assignedAt?: Date;
  
  // Sequence tracking
  currentSequenceId?: string;
  currentSequenceStep?: number;
  sequenceStartedAt?: Date;
  
  // Custom fields
  industry?: string;
  companySize?: CompanySize;
  annualRevenue?: string;
  tags: string[];
  customFields?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
  closedAt?: Date;
  closedReason?: LeadClosedReason;
}

export type LeadSource = 
  | 'website'
  | 'form'
  | 'chat'
  | 'referral'
  | 'linkedin'
  | 'cold_outbound'
  | 'event'
  | 'webinar'
  | 'content_download'
  | 'free_trial'
  | 'demo_request'
  | 'partner'
  | 'import'
  | 'other';

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'engaged'
  | 'qualified'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'converted'
  | 'disqualified'
  | 'nurture'
  | 'recycled'
  | 'closed_lost';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export type LeadLifecycleStage = 
  | 'subscriber'
  | 'lead'
  | 'marketing_qualified'
  | 'sales_qualified'
  | 'opportunity'
  | 'customer';

export type QualificationStatus = 
  | 'not_started'
  | 'in_progress'
  | 'qualified'
  | 'disqualified'
  | 'needs_review';

export type CompanySize = 
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1001-5000'
  | '5001+';

export type LeadClosedReason = 
  | 'converted_to_opportunity'
  | 'no_budget'
  | 'no_authority'
  | 'no_need'
  | 'wrong_timing'
  | 'competitor_chosen'
  | 'no_response'
  | 'bad_fit'
  | 'duplicate'
  | 'spam'
  | 'other';

// ============================================
// BANT QUALIFICATION TYPES
// ============================================

export interface BudgetInfo {
  hasBudget: boolean | null;
  budgetRange?: string;
  budgetTimeline?: string;
  budgetNotes?: string;
  score: number; // 0-25
  qualifiedAt?: Date;
}

export interface AuthorityInfo {
  isDecisionMaker: boolean | null;
  decisionMakers?: string[];
  buyingProcess?: string;
  authorityNotes?: string;
  score: number; // 0-25
  qualifiedAt?: Date;
}

export interface NeedInfo {
  hasNeed: boolean | null;
  painPoints?: string[];
  currentSolution?: string;
  needUrgency?: 'low' | 'medium' | 'high' | 'critical';
  needNotes?: string;
  score: number; // 0-25
  qualifiedAt?: Date;
}

export interface TimelineInfo {
  hasTimeline: boolean | null;
  targetDate?: Date;
  purchaseTimeframe?: string;
  timelineDrivers?: string[];
  timelineNotes?: string;
  score: number; // 0-25
  qualifiedAt?: Date;
}

export interface QualificationCriteria {
  id: string;
  name: string;
  category: 'budget' | 'authority' | 'need' | 'timeline' | 'custom';
  weight: number; // 0-1, contribution to final score
  questions: QualificationQuestion[];
  scoringRules: ScoringRule[];
}

export interface QualificationQuestion {
  id: string;
  question: string;
  type: 'open_ended' | 'yes_no' | 'multiple_choice' | 'scale';
  options?: string[];
  followUpQuestions?: string[];
  requiredForQualification: boolean;
}

export interface ScoringRule {
  id: string;
  condition: string;
  points: number;
  disqualifying?: boolean;
}

// ============================================
// OUTREACH SEQUENCE TYPES
// ============================================

export interface OutreachSequence {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: SequenceType;
  status: 'active' | 'paused' | 'archived';
  
  // Targeting
  targetCriteria?: SequenceTargetCriteria;
  
  // Steps
  steps: OutreachStep[];
  totalSteps: number;
  
  // Timing
  businessDaysOnly: boolean;
  timezone: string;
  
  // Exit conditions
  exitConditions: ExitCondition[];
  
  // Performance tracking
  leadsEnrolled: number;
  leadsCompleted: number;
  leadsReplied: number;
  meetingsBooked: number;
  
  // Metadata
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SequenceType = 
  | 'initial_outreach'
  | 'demo_request_followup'
  | 'trial_activation'
  | 'content_download'
  | 'event_followup'
  | 'cold_outbound'
  | 're_engagement'
  | 'custom';

export interface SequenceTargetCriteria {
  leadSources?: LeadSource[];
  industries?: string[];
  companySizes?: CompanySize[];
  titles?: string[];
  excludeTags?: string[];
  requireTags?: string[];
  minScore?: number;
  maxScore?: number;
}

export interface OutreachStep {
  id: string;
  order: number;
  name: string;
  type: OutreachStepType;
  channel: CommunicationChannel;
  
  // Timing
  delayDays: number;
  delayHours?: number;
  preferredTime?: string; // HH:mm
  
  // Content
  templateId?: string;
  subject?: string;
  body?: string;
  
  // Personalization
  personalizationFields?: string[];
  aiPersonalizationEnabled?: boolean;
  
  // Task details (for manual steps)
  taskDescription?: string;
  taskAssignee?: string;
  
  // Conditional logic
  conditions?: StepCondition[];
  
  // A/B testing
  variants?: StepVariant[];
}

export type OutreachStepType = 
  | 'email'
  | 'linkedin_connection'
  | 'linkedin_message'
  | 'phone_call'
  | 'sms'
  | 'voicemail_drop'
  | 'manual_task'
  | 'wait';

export interface StepCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
  skipIfTrue: boolean;
}

export interface StepVariant {
  id: string;
  name: string;
  weight: number; // 0-100, percentage allocation
  subject?: string;
  body?: string;
  performance?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
}

export interface ExitCondition {
  type: 'replied' | 'meeting_booked' | 'unsubscribed' | 'bounced' | 'manual_removal' | 'qualified' | 'disqualified';
  action: 'exit' | 'move_to_sequence' | 'notify';
  targetSequenceId?: string;
  notifyUsers?: string[];
}

// ============================================
// LEAD ENROLLMENT TYPES
// ============================================

export interface LeadEnrollment {
  id: string;
  leadId: string;
  sequenceId: string;
  sdrEmployeeId: string;
  
  status: EnrollmentStatus;
  currentStep: number;
  
  // Tracking
  startedAt: Date;
  completedAt?: Date;
  exitedAt?: Date;
  exitReason?: ExitCondition['type'];
  
  // Step history
  stepHistory: StepExecution[];
  
  // Engagement
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalReplies: number;
  totalCalls: number;
  totalConnections: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentStatus = 
  | 'active'
  | 'paused'
  | 'completed'
  | 'exited'
  | 'bounced'
  | 'unsubscribed';

export interface StepExecution {
  stepId: string;
  stepOrder: number;
  status: 'pending' | 'scheduled' | 'executed' | 'skipped' | 'failed';
  scheduledFor: Date;
  executedAt?: Date;
  result?: {
    delivered?: boolean;
    opened?: boolean;
    clicked?: boolean;
    replied?: boolean;
    bounced?: boolean;
    error?: string;
  };
  variantUsed?: string;
}

// ============================================
// FOLLOW-UP TYPES
// ============================================

export interface FollowUp {
  id: string;
  leadId: string;
  sdrEmployeeId: string;
  
  type: FollowUpType;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Scheduling
  scheduledFor: Date;
  reminderBefore?: number; // minutes before
  
  // Content
  channel: CommunicationChannel;
  templateId?: string;
  customMessage?: string;
  
  // Status
  status: 'scheduled' | 'sent' | 'completed' | 'cancelled' | 'missed';
  completedAt?: Date;
  outcome?: FollowUpOutcome;
  
  // Context
  triggerEvent?: string;
  previousInteractionId?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export type FollowUpType = 
  | 'no_response'
  | 'after_reply'
  | 'after_meeting'
  | 'post_demo'
  | 'document_sent'
  | 'voicemail_left'
  | 'linkedin_connection'
  | 'custom';

export interface FollowUpOutcome {
  result: 'positive' | 'neutral' | 'negative' | 'no_response';
  nextSteps?: string;
  notesAdded?: string;
  leadStatusChanged?: LeadStatus;
}

export interface FollowUpRule {
  id: string;
  name: string;
  trigger: FollowUpTrigger;
  conditions: FollowUpCondition[];
  action: FollowUpAction;
  isActive: boolean;
  priority: number;
}

export interface FollowUpTrigger {
  type: 'email_opened' | 'email_clicked' | 'no_reply' | 'form_submit' | 'page_visit' | 'call_completed' | 'meeting_completed' | 'custom_event';
  eventName?: string;
  delayMinutes?: number;
  delayDays?: number;
}

export interface FollowUpCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_not_set';
  value?: string | number | boolean;
}

export interface FollowUpAction {
  type: 'send_email' | 'send_sms' | 'create_task' | 'update_lead' | 'notify_sdr' | 'start_sequence';
  templateId?: string;
  channel?: CommunicationChannel;
  taskDetails?: string;
  leadUpdates?: Partial<Lead>;
  notifyUsers?: string[];
  sequenceId?: string;
}

// ============================================
// MEETING SCHEDULING TYPES
// ============================================

export interface MeetingRequest {
  id: string;
  leadId: string;
  sdrEmployeeId: string;
  
  type: MeetingType;
  title: string;
  description?: string;
  
  // Scheduling
  requestedAt: Date;
  proposedTimes: ProposedTime[];
  selectedTime?: Date;
  duration: number; // minutes
  timezone: string;
  
  // Location
  locationType: 'video' | 'phone' | 'in_person';
  videoLink?: string;
  phoneNumber?: string;
  address?: string;
  
  // Participants
  attendees: MeetingAttendee[];
  optionalAttendees?: MeetingAttendee[];
  
  // Status
  status: MeetingStatus;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  rescheduledFrom?: string;
  
  // Integration
  calendarEventId?: string;
  videoConferenceId?: string;
  
  // Follow-up
  reminderSent: boolean;
  reminderSentAt?: Date;
  
  // Outcome
  outcome?: MeetingOutcome;
  
  createdAt: Date;
  updatedAt: Date;
}

export type MeetingType = 
  | 'discovery_call'
  | 'demo'
  | 'qualification_call'
  | 'follow_up_call'
  | 'technical_review'
  | 'proposal_review'
  | 'intro_to_ae'
  | 'custom';

export interface ProposedTime {
  start: Date;
  end: Date;
  isPreferred?: boolean;
}

export interface MeetingAttendee {
  email: string;
  name: string;
  role: 'organizer' | 'required' | 'optional';
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export type MeetingStatus = 
  | 'pending'
  | 'proposed'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export interface MeetingOutcome {
  happened: boolean;
  noShowBy?: 'lead' | 'sdr' | 'both';
  notes?: string;
  nextSteps?: string[];
  qualificationUpdates?: Partial<Lead>;
  handoffToAE?: boolean;
  followUpScheduled?: Date;
}

// ============================================
// CRM INTEGRATION TYPES
// ============================================

export interface CRMConfig {
  provider: CRMProvider;
  isEnabled: boolean;
  syncDirection: 'bidirectional' | 'push_only' | 'pull_only';
  syncFrequencyMinutes: number;
  fieldMappings: CRMFieldMapping[];
  autoCreateLead: boolean;
  autoUpdateLead: boolean;
  autoLogActivities: boolean;
}

export type CRMProvider = 
  | 'salesforce'
  | 'hubspot'
  | 'pipedrive'
  | 'zoho'
  | 'dynamics'
  | 'custom';

export interface CRMFieldMapping {
  localField: string;
  crmField: string;
  syncDirection: 'to_crm' | 'from_crm' | 'both';
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'custom';
  customTransform?: string;
}

export interface CRMActivity {
  id: string;
  leadId: string;
  crmLeadId?: string;
  
  type: CRMActivityType;
  subject: string;
  description?: string;
  
  // Activity details
  channel?: CommunicationChannel;
  direction?: 'inbound' | 'outbound';
  duration?: number; // minutes
  
  // Status
  status: 'completed' | 'scheduled' | 'cancelled';
  completedAt?: Date;
  
  // CRM sync
  syncedToCRM: boolean;
  crmActivityId?: string;
  syncedAt?: Date;
  syncError?: string;
  
  createdAt: Date;
}

export type CRMActivityType = 
  | 'email_sent'
  | 'email_received'
  | 'call_made'
  | 'call_received'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'linkedin_sent'
  | 'linkedin_received'
  | 'note_added'
  | 'status_changed'
  | 'task_completed';

export interface CRMSyncResult {
  success: boolean;
  syncedLeads: number;
  syncedActivities: number;
  errors: CRMSyncError[];
  syncedAt: Date;
}

export interface CRMSyncError {
  entityType: 'lead' | 'activity' | 'contact';
  entityId: string;
  error: string;
  retryable: boolean;
}

// ============================================
// ACTION TYPES
// ============================================

export type SDRActionType = 
  | 'send_initial_outreach'
  | 'send_followup_email'
  | 'send_linkedin_connection'
  | 'send_linkedin_message'
  | 'make_phone_call'
  | 'leave_voicemail'
  | 'send_sms'
  | 'schedule_meeting'
  | 'send_meeting_reminder'
  | 'send_meeting_followup'
  | 'qualify_lead'
  | 'disqualify_lead'
  | 'handoff_to_ae'
  | 'enroll_in_sequence'
  | 'remove_from_sequence'
  | 'update_lead_status'
  | 'add_note'
  | 'create_task'
  | 'sync_to_crm'
  | 'escalate_to_manager';

export interface SDRActionContext {
  leadId?: string;
  contactId?: string;
  sequenceId?: string;
  enrollmentId?: string;
  meetingId?: string;
  followUpId?: string;
  channel?: CommunicationChannel;
  templateId?: string;
  customMessage?: string;
  qualificationData?: Partial<Lead>;
  aeUserId?: string;
  notes?: string;
}

// ============================================
// REPORTING TYPES
// ============================================

export interface SDRPerformanceReport {
  id: string;
  workspaceId: string;
  sdrEmployeeId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  
  // Activity metrics
  activityMetrics: {
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsReplied: number;
    callsMade: number;
    callsConnected: number;
    voicemailsLeft: number;
    linkedInSent: number;
    linkedInAccepted: number;
    totalTouchpoints: number;
  };
  
  // Lead metrics
  leadMetrics: {
    newLeadsAssigned: number;
    leadsContacted: number;
    leadsQualified: number;
    leadsDisqualified: number;
    leadsHandedOff: number;
    conversionRate: number;
  };
  
  // Meeting metrics
  meetingMetrics: {
    meetingsBooked: number;
    meetingsCompleted: number;
    meetingsNoShow: number;
    meetingShowRate: number;
    avgMeetingsPerLead: number;
  };
  
  // Sequence metrics
  sequenceMetrics: {
    leadsEnrolled: number;
    leadsCompleted: number;
    replyRate: number;
    avgStepsToReply: number;
  };
  
  // Response metrics
  responseMetrics: {
    avgResponseTimeHours: number;
    sameBusinessDayRate: number;
  };
  
  // Pipeline contribution
  pipelineMetrics: {
    opportunitiesCreated: number;
    pipelineValue: number;
    avgDealSize: number;
  };
  
  // Top performers
  topSequences: Array<{ sequenceId: string; name: string; replyRate: number }>;
  topTemplates: Array<{ templateId: string; name: string; replyRate: number }>;
  
  generatedAt: Date;
}

// ============================================
// STATE TYPES
// ============================================

export interface SDRState {
  employee: Employee;
  config: SDRConfig;
  assignedLeads: Lead[];
  activeEnrollments: LeadEnrollment[];
  pendingFollowUps: FollowUp[];
  scheduledMeetings: MeetingRequest[];
  recentActivities: CRMActivity[];
  todaysTasks: SDRTask[];
}

export interface SDRTask {
  id: string;
  type: 'call' | 'email' | 'linkedin' | 'meeting_prep' | 'follow_up' | 'qualification' | 'other';
  leadId: string;
  leadName: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
}

// ============================================
// INPUT TYPES
// ============================================

export interface CreateLeadInput {
  workspaceId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company: string;
  title?: string;
  phone?: string;
  linkedInUrl?: string;
  source: LeadSource;
  sourceDetail?: string;
  industry?: string;
  companySize?: CompanySize;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  temperature?: LeadTemperature;
  qualificationScore?: number;
  qualificationStatus?: QualificationStatus;
  budgetInfo?: Partial<BudgetInfo>;
  authorityInfo?: Partial<AuthorityInfo>;
  needInfo?: Partial<NeedInfo>;
  timelineInfo?: Partial<TimelineInfo>;
  assignedSDRId?: string;
  assignedAEId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface CreateSequenceInput {
  workspaceId: string;
  name: string;
  description?: string;
  type: SequenceType;
  targetCriteria?: SequenceTargetCriteria;
  steps: Omit<OutreachStep, 'id'>[];
  exitConditions?: ExitCondition[];
  businessDaysOnly?: boolean;
  timezone?: string;
  tags?: string[];
}

export interface EnrollLeadInput {
  leadId: string;
  sequenceId: string;
  startImmediately?: boolean;
  skipSteps?: number[];
}

export interface ScheduleMeetingInput {
  leadId: string;
  type: MeetingType;
  title?: string;
  description?: string;
  proposedTimes: ProposedTime[];
  duration?: number;
  locationType?: MeetingRequest['locationType'];
  additionalAttendees?: MeetingAttendee[];
}

