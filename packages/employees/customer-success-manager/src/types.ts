/**
 * AI Customer Success Manager Types
 * 
 * Type definitions for the Customer Success Manager AI Employee.
 */

import type { Employee, Contact, CommunicationChannel } from '@aibos/employee-core';

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface CSMConfig {
  /** Hours after signup to send welcome message */
  welcomeDelayHours: number;
  /** Days between proactive check-ins */
  checkInIntervalDays: number;
  /** Days before renewal to start engagement */
  renewalAlertDays: number;
  /** Health score threshold for alerts (0-100) */
  healthAlertThreshold: number;
  /** Churn risk threshold for escalation (0-1) */
  churnRiskThreshold: number;
  /** Days of inactivity before concern */
  inactivityThresholdDays: number;
  /** Enable automated outreach */
  autoOutreachEnabled: boolean;
  /** Preferred communication channels in order */
  preferredChannels: CommunicationChannel[];
  /** Escalation rules */
  escalationRules: CSMEscalationRule[];
  /** Check-in days (0-6, 0 = Sunday) */
  checkInDays: number[];
  /** Best time for check-ins (HH:mm) */
  checkInTime: string;
}

export interface CSMEscalationRule {
  id: string;
  trigger: 'low_health' | 'high_churn_risk' | 'inactivity' | 'negative_sentiment' | 'support_spike';
  threshold: number;
  action: 'notify' | 'escalate' | 'auto_outreach' | 'schedule_call';
  notifyUsers?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// CLIENT TYPES
// ============================================

export interface ClientAccount {
  id: string;
  workspaceId: string;
  name: string;
  companyName?: string;
  primaryContactId: string;
  contacts: string[]; // Contact IDs
  plan: string;
  planTier: 'free' | 'starter' | 'pro' | 'enterprise';
  mrr: number;
  arr: number;
  contractStartDate: Date;
  contractEndDate?: Date;
  renewalDate?: Date;
  onboardingStatus: OnboardingStatus;
  healthScore: number; // 0-100
  churnRiskScore: number; // 0-1
  lifecycleStage: ClientLifecycleStage;
  tags: string[];
  metadata?: Record<string, unknown>;
  csmEmployeeId?: string;
  lastCheckInAt?: Date;
  nextCheckInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OnboardingStatus = 
  | 'pending'
  | 'welcome_sent'
  | 'kickoff_scheduled'
  | 'kickoff_completed'
  | 'training_scheduled'
  | 'training_completed'
  | 'setup_verified'
  | 'active'
  | 'complete';

export type ClientLifecycleStage = 
  | 'onboarding'
  | 'adoption'
  | 'growth'
  | 'mature'
  | 'renewal'
  | 'at_risk'
  | 'churned';

// ============================================
// HEALTH SCORE TYPES
// ============================================

export interface HealthScoreMetrics {
  /** Product usage metrics */
  usage: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    sessionDuration: number; // Average minutes
    featureAdoptionRate: number; // 0-1
    lastLoginAt?: Date;
  };
  /** Engagement metrics */
  engagement: {
    emailOpenRate: number; // 0-1
    emailClickRate: number; // 0-1
    supportTicketCount: number;
    npsScore?: number; // -100 to 100
    lastInteractionAt?: Date;
  };
  /** Financial health */
  financial: {
    paymentStatus: 'current' | 'late' | 'overdue' | 'failed';
    invoicesPaidOnTime: number; // 0-1
    expansionRevenue: number;
    contractValue: number;
    daysUntilRenewal?: number;
  };
  /** Relationship health */
  relationship: {
    executiveSponsorEngaged: boolean;
    championIdentified: boolean;
    lastQbrDate?: Date;
    successPlanDefined: boolean;
    referralMade: boolean;
  };
}

export interface HealthScoreBreakdown {
  overall: number; // 0-100
  usageScore: number;
  engagementScore: number;
  financialScore: number;
  relationshipScore: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  riskFactors: HealthRiskFactor[];
  lastCalculatedAt: Date;
}

export interface HealthRiskFactor {
  category: 'usage' | 'engagement' | 'financial' | 'relationship';
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

// ============================================
// ONBOARDING TYPES
// ============================================

export interface OnboardingSequence {
  id: string;
  clientId: string;
  templateId: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currentStep: number;
  steps: OnboardingStep[];
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OnboardingStep {
  id: string;
  order: number;
  name: string;
  type: OnboardingStepType;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  triggerCondition?: OnboardingTrigger;
  delayHours?: number;
  content?: string;
  channel?: CommunicationChannel;
  scheduledFor?: Date;
  completedAt?: Date;
  notes?: string;
}

export type OnboardingStepType = 
  | 'welcome_message'
  | 'kickoff_call'
  | 'account_setup'
  | 'training_session'
  | 'feature_walkthrough'
  | 'integration_setup'
  | 'success_plan'
  | 'first_value'
  | 'check_in'
  | 'review_call'
  | 'custom';

export interface OnboardingTrigger {
  type: 'time_delay' | 'event' | 'condition';
  event?: string; // e.g., 'account_created', 'first_login'
  condition?: string; // e.g., 'integration_connected'
  delayHours?: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  planTier: ClientAccount['planTier'][];
  steps: Omit<OnboardingStep, 'id' | 'status' | 'completedAt'>[];
  estimatedDays: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CHECK-IN TYPES
// ============================================

export interface CheckIn {
  id: string;
  clientId: string;
  contactId: string;
  employeeId: string;
  type: CheckInType;
  channel: CommunicationChannel;
  status: 'scheduled' | 'sent' | 'responded' | 'completed' | 'missed';
  scheduledFor: Date;
  sentAt?: Date;
  respondedAt?: Date;
  completedAt?: Date;
  content?: string;
  response?: CheckInResponse;
  followUpActions?: string[];
  notes?: string;
  createdAt: Date;
}

export type CheckInType = 
  | 'onboarding'
  | 'periodic'
  | 'renewal'
  | 'post_support'
  | 'risk_mitigation'
  | 'upsell'
  | 'qbr_prep'
  | 'custom';

export interface CheckInResponse {
  sentiment: 'positive' | 'neutral' | 'negative';
  feedbackSummary: string;
  issuesRaised: string[];
  requestsMade: string[];
  upsellInterest: boolean;
  referralWillingness: boolean;
  npsScore?: number;
}

// ============================================
// USAGE ANALYSIS TYPES
// ============================================

export interface UsagePattern {
  clientId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: UsageMetrics;
  trends: UsageTrend[];
  anomalies: UsageAnomaly[];
  insights: string[];
}

export interface UsageMetrics {
  totalSessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  totalActions: number;
  topFeatures: Array<{ feature: string; usageCount: number; percentage: number }>;
  underutilizedFeatures: Array<{ feature: string; expectedUsage: number; actualUsage: number }>;
  peakUsageHours: number[];
  peakUsageDays: number[];
}

export interface UsageTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercentage: number;
  significance: 'low' | 'medium' | 'high';
}

export interface UsageAnomaly {
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  possibleCause: string;
}

// ============================================
// CHURN RISK TYPES
// ============================================

export interface ChurnRiskAssessment {
  clientId: string;
  riskScore: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedChurnDate?: Date;
  riskFactors: ChurnRiskFactor[];
  mitigationActions: string[];
  confidence: number; // 0-1
  assessedAt: Date;
}

export interface ChurnRiskFactor {
  factor: string;
  impact: number; // How much this factor contributes to risk
  direction: 'positive' | 'negative';
  description: string;
  mitigation?: string;
}

export interface ChurnAlert {
  id: string;
  clientId: string;
  clientName: string;
  riskLevel: ChurnRiskAssessment['riskLevel'];
  riskScore: number;
  triggerReason: string;
  topRiskFactors: ChurnRiskFactor[];
  recommendedActions: string[];
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated';
  assignedTo?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

// ============================================
// UPSELL TYPES
// ============================================

export interface UpsellOpportunity {
  id: string;
  clientId: string;
  clientName: string;
  type: UpsellType;
  currentPlan: string;
  recommendedPlan?: string;
  product?: string;
  estimatedValue: number;
  confidence: number; // 0-1
  signals: UpsellSignal[];
  status: 'identified' | 'qualified' | 'proposed' | 'negotiating' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  recommendedTiming?: Date;
  proposedAt?: Date;
  closedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export type UpsellType = 
  | 'plan_upgrade'
  | 'seat_expansion'
  | 'feature_addon'
  | 'contract_extension'
  | 'cross_sell'
  | 'usage_based';

export interface UpsellSignal {
  signal: string;
  strength: 'weak' | 'moderate' | 'strong';
  evidence: string;
  timestamp?: Date;
}

// ============================================
// ACTION TYPES
// ============================================

export type CSMActionType = 
  | 'send_welcome'
  | 'schedule_kickoff'
  | 'send_training_invite'
  | 'send_check_in'
  | 'send_check_in_reminder'
  | 'send_health_alert'
  | 'send_churn_mitigation'
  | 'send_renewal_reminder'
  | 'send_upsell_proposal'
  | 'schedule_qbr'
  | 'request_nps'
  | 'request_referral'
  | 'escalate_to_human'
  | 'update_health_score'
  | 'log_interaction';

export interface CSMActionContext {
  clientId?: string;
  contactId?: string;
  channel?: CommunicationChannel;
  checkInId?: string;
  onboardingStepId?: string;
  opportunityId?: string;
  alertId?: string;
  customMessage?: string;
}

// ============================================
// REPORTING TYPES
// ============================================

export interface CSMPortfolioReport {
  id: string;
  workspaceId: string;
  employeeId: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  totalClients: number;
  healthSummary: {
    healthy: number; // Health > 70
    atRisk: number; // Health 40-70
    critical: number; // Health < 40
    avgHealthScore: number;
    healthTrend: 'improving' | 'stable' | 'declining';
  };
  churnSummary: {
    atRiskCount: number;
    atRiskRevenue: number;
    churnedCount: number;
    churnedRevenue: number;
    savedCount: number;
    savedRevenue: number;
  };
  engagementSummary: {
    checkInsCompleted: number;
    checkInResponseRate: number;
    avgSentimentScore: number;
    issuesResolved: number;
  };
  revenueSummary: {
    totalMrr: number;
    expansionMrr: number;
    contractionMrr: number;
    upsellsClosed: number;
    upsellValue: number;
  };
  onboardingSummary: {
    newClients: number;
    completedOnboarding: number;
    avgOnboardingDays: number;
    timeToFirstValue: number;
  };
  topRiskClients: Array<{
    clientId: string;
    clientName: string;
    healthScore: number;
    churnRisk: number;
    mrr: number;
    topIssue: string;
  }>;
  topOpportunities: Array<{
    clientId: string;
    clientName: string;
    type: UpsellType;
    estimatedValue: number;
    confidence: number;
  }>;
  keyHighlights: string[];
  recommendations: string[];
  generatedAt: Date;
}

// ============================================
// STATE TYPES
// ============================================

export interface CSMState {
  employee: Employee;
  config: CSMConfig;
  portfolio: ClientAccount[];
  pendingCheckIns: CheckIn[];
  activeOnboardings: OnboardingSequence[];
  openAlerts: ChurnAlert[];
  activeOpportunities: UpsellOpportunity[];
  lastPortfolioRefresh?: Date;
}

// ============================================
// INPUT TYPES
// ============================================

export interface CreateClientInput {
  workspaceId: string;
  name: string;
  companyName?: string;
  primaryContactId: string;
  plan: string;
  planTier: ClientAccount['planTier'];
  mrr: number;
  contractStartDate: Date;
  contractEndDate?: Date;
  tags?: string[];
}

export interface UpdateClientInput {
  name?: string;
  companyName?: string;
  primaryContactId?: string;
  plan?: string;
  planTier?: ClientAccount['planTier'];
  mrr?: number;
  contractEndDate?: Date;
  renewalDate?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateCheckInInput {
  clientId: string;
  contactId: string;
  type: CheckInType;
  channel: CommunicationChannel;
  scheduledFor: Date;
  content?: string;
}

