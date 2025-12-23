/**
 * AI Customer Success Manager Agent
 * 
 * Core implementation of the AI Customer Success Manager employee.
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
  createEmailChannel,
  createSlackChannel,
} from '@aibos/communication-hub';
import type {
  CSMConfig,
  CSMState,
  ClientAccount,
  HealthScoreMetrics,
  HealthScoreBreakdown,
  OnboardingSequence,
  CheckIn,
  ChurnRiskAssessment,
  ChurnAlert,
  UpsellOpportunity,
  UsagePattern,
  CSMActionType,
  CSMActionContext,
  CSMPortfolioReport,
} from './types';
import { createHealthScoreCalculator, HealthScoreCalculator } from './health';
import { createOnboardingManager, OnboardingSequenceManager } from './onboarding';
import { createCheckInManager, CheckInManager } from './checkins';
import { createChurnDetector, ChurnRiskDetector } from './churn';
import { createUpsellDetector, UpsellOpportunityDetector } from './upsell';
import { createUsageAnalyzer, UsageAnalyzer, RawUsageData } from './usage';
import * as templates from './templates';

const logger = createLogger('employee:csm');

// Default CSM configuration
const DEFAULT_CSM_CONFIG: CSMConfig = {
  welcomeDelayHours: 0,
  checkInIntervalDays: 14,
  renewalAlertDays: 60,
  healthAlertThreshold: 50,
  churnRiskThreshold: 0.6,
  inactivityThresholdDays: 14,
  autoOutreachEnabled: true,
  preferredChannels: ['email', 'slack'],
  escalationRules: [
    {
      id: 'low_health_critical',
      trigger: 'low_health',
      threshold: 30,
      action: 'escalate',
      priority: 'critical',
    },
    {
      id: 'low_health_alert',
      trigger: 'low_health',
      threshold: 50,
      action: 'auto_outreach',
      priority: 'high',
    },
    {
      id: 'high_churn_risk',
      trigger: 'high_churn_risk',
      threshold: 0.7,
      action: 'escalate',
      priority: 'critical',
    },
    {
      id: 'inactivity',
      trigger: 'inactivity',
      threshold: 14,
      action: 'auto_outreach',
      priority: 'medium',
    },
  ],
  checkInDays: [1, 2, 3, 4, 5], // Monday to Friday
  checkInTime: '10:00',
};

/**
 * AI Customer Success Manager Agent
 */
export class CustomerSuccessAgent {
  private state: CSMState;
  private persona;
  private memory;
  private trust;
  private actions;
  private knowledge;
  private inbox;

  // Sub-systems
  private healthCalculator: HealthScoreCalculator;
  private onboardingManager: OnboardingSequenceManager;
  private checkInManager: CheckInManager;
  private churnDetector: ChurnRiskDetector;
  private upsellDetector: UpsellOpportunityDetector;
  private usageAnalyzer: UsageAnalyzer;

  constructor(employee: Employee, config?: Partial<CSMConfig>) {
    this.state = {
      employee,
      config: { ...DEFAULT_CSM_CONFIG, ...config },
      portfolio: [],
      pendingCheckIns: [],
      activeOnboardings: [],
      openAlerts: [],
      activeOpportunities: [],
    };

    // Initialize core systems
    this.persona = createPersonaManager('customer_success', employee.persona);
    this.memory = createMemoryStore(employee.id);
    this.trust = createTrustManager(employee.id, employee.trustConfig);
    this.actions = createActionEngine(employee.id, employee.workspaceId, this.trust);
    this.knowledge = createKnowledgeBase(employee.id);
    this.inbox = createUnifiedInbox(employee.workspaceId);

    // Initialize CSM-specific systems
    this.healthCalculator = createHealthScoreCalculator();
    this.onboardingManager = createOnboardingManager();
    this.checkInManager = createCheckInManager();
    this.churnDetector = createChurnDetector();
    this.upsellDetector = createUpsellDetector();
    this.usageAnalyzer = createUsageAnalyzer();

    // Load default knowledge
    this.loadDefaultKnowledge();

    logger.info('Customer Success Manager initialized', {
      employeeId: employee.id,
      name: employee.name,
    });
  }

  /**
   * Load default CSM knowledge
   */
  private async loadDefaultKnowledge(): Promise<void> {
    const knowledgeTemplates = KNOWLEDGE_TEMPLATES.customer_success;
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
   * Get CSM config
   */
  getConfig(): CSMConfig {
    return this.state.config;
  }

  /**
   * Update CSM config
   */
  updateConfig(updates: Partial<CSMConfig>): void {
    this.state.config = { ...this.state.config, ...updates };
    logger.info('CSM config updated', { updates });
  }

  // ============================================
  // CLIENT MANAGEMENT
  // ============================================

  /**
   * Add client to portfolio
   */
  async addClient(client: ClientAccount): Promise<void> {
    this.state.portfolio.push(client);
    
    // Store in memory
    await this.memory.store({
      contextType: 'contact',
      contextId: client.id,
      content: `New client: ${client.name}, Plan: ${client.planTier}, MRR: $${client.mrr}`,
      importanceScore: 0.8,
      tags: ['client', 'new', client.planTier],
    });

    logger.info('Client added to portfolio', {
      clientId: client.id,
      clientName: client.name,
      planTier: client.planTier,
    });
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): ClientAccount | undefined {
    return this.state.portfolio.find(c => c.id === clientId);
  }

  /**
   * Get all clients
   */
  getPortfolio(): ClientAccount[] {
    return this.state.portfolio;
  }

  // ============================================
  // ONBOARDING
  // ============================================

  /**
   * Start onboarding for new client
   */
  async startOnboarding(client: ClientAccount): Promise<OnboardingSequence> {
    const sequence = this.onboardingManager.startOnboarding(client);
    this.state.activeOnboardings.push(sequence);

    // Queue welcome message action
    await this.queueAction('send_welcome', {
      clientId: client.id,
      channel: this.state.config.preferredChannels[0],
    });

    // Store onboarding start in memory
    await this.memory.store({
      contextType: 'contact',
      contextId: client.id,
      content: `Onboarding started: ${sequence.steps.length} steps, template: ${sequence.templateId}`,
      importanceScore: 0.7,
      tags: ['onboarding', 'started'],
    });

    logger.info('Onboarding started', {
      clientId: client.id,
      sequenceId: sequence.id,
    });

    return sequence;
  }

  /**
   * Progress onboarding step
   */
  async completeOnboardingStep(
    sequenceId: string, 
    stepId: string, 
    notes?: string
  ): Promise<OnboardingSequence | null> {
    const sequence = this.onboardingManager.completeStep(sequenceId, stepId, notes);
    
    if (sequence && sequence.status === 'completed') {
      // Onboarding complete - update client lifecycle
      const client = this.getClient(sequence.clientId);
      if (client) {
        client.onboardingStatus = 'complete';
        client.lifecycleStage = 'adoption';
        
        await this.memory.store({
          contextType: 'contact',
          contextId: client.id,
          content: 'Onboarding completed successfully',
          importanceScore: 0.8,
          tags: ['onboarding', 'completed', 'milestone'],
        });
      }
    }

    return sequence;
  }

  /**
   * Get onboarding progress for client
   */
  getOnboardingProgress(clientId: string) {
    const sequence = this.onboardingManager.getClientSequence(clientId);
    if (!sequence) return null;
    return this.onboardingManager.getProgress(sequence.id);
  }

  /**
   * Get due onboarding steps
   */
  getDueOnboardingSteps() {
    return this.onboardingManager.getDueSteps();
  }

  // ============================================
  // HEALTH MONITORING
  // ============================================

  /**
   * Calculate health score for client
   */
  async calculateHealthScore(
    client: ClientAccount,
    metrics: HealthScoreMetrics
  ): Promise<HealthScoreBreakdown> {
    const breakdown = this.healthCalculator.calculate(metrics, client);

    // Update client health score
    const clientIndex = this.state.portfolio.findIndex(c => c.id === client.id);
    if (clientIndex >= 0 && this.state.portfolio[clientIndex]) {
      const portfolioClient = this.state.portfolio[clientIndex];
      if (portfolioClient) {
        portfolioClient.healthScore = breakdown.overall;
      }
    }

    // Check for health alerts
    if (breakdown.overall < (this.state.config.healthAlertThreshold ?? 50)) {
      await this.handleLowHealthScore(client, breakdown);
    }

    // Store health update in memory
    await this.memory.store({
      contextType: 'contact',
      contextId: client.id,
      content: `Health score: ${breakdown.overall} (${breakdown.trend}). Risk factors: ${breakdown.riskFactors.length}`,
      importanceScore: breakdown.overall < 50 ? 0.9 : 0.5,
      tags: ['health', breakdown.trend, this.healthCalculator.getHealthStatus(breakdown.overall)],
    });

    return breakdown;
  }

  /**
   * Handle low health score
   */
  private async handleLowHealthScore(
    client: ClientAccount,
    breakdown: HealthScoreBreakdown
  ): Promise<void> {
    const rule = this.state.config.escalationRules.find(
      r => r.trigger === 'low_health' && breakdown.overall <= r.threshold
    );

    if (!rule) return;

    if (rule.action === 'auto_outreach' && this.state.config.autoOutreachEnabled) {
      await this.queueAction('send_check_in', {
        clientId: client.id,
        channel: 'email',
      });
    } else if (rule.action === 'escalate') {
      await this.queueAction('escalate_to_human', {
        clientId: client.id,
        customMessage: `Health score critical: ${breakdown.overall}`,
      });
    }

    logger.warn('Low health score detected', {
      clientId: client.id,
      healthScore: breakdown.overall,
      action: rule.action,
    });
  }

  /**
   * Get health recommendations for client
   */
  getHealthRecommendations(breakdown: HealthScoreBreakdown): string[] {
    return this.healthCalculator.getRecommendedActions(breakdown);
  }

  // ============================================
  // CHURN RISK MANAGEMENT
  // ============================================

  /**
   * Assess churn risk for client
   */
  async assessChurnRisk(
    client: ClientAccount,
    healthBreakdown: HealthScoreBreakdown,
    usagePattern?: UsagePattern
  ): Promise<ChurnRiskAssessment> {
    const assessment = this.churnDetector.assessRisk(client, healthBreakdown, usagePattern);

    // Update client churn risk
    const clientIndex = this.state.portfolio.findIndex(c => c.id === client.id);
    if (clientIndex >= 0) {
      const portfolioClient = this.state.portfolio[clientIndex];
      if (portfolioClient) {
        portfolioClient.churnRiskScore = assessment.riskScore;
        
        // Update lifecycle stage if at risk
        if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
          portfolioClient.lifecycleStage = 'at_risk';
        }
      }
    }

    // Check if alert should be created
    const existingAlerts = this.churnDetector.getClientAlerts(client.id);
    if (this.churnDetector.shouldAlert(assessment, existingAlerts)) {
      await this.createChurnAlert(assessment, client);
    }

    return assessment;
  }

  /**
   * Create churn alert
   */
  private async createChurnAlert(
    assessment: ChurnRiskAssessment,
    client: ClientAccount
  ): Promise<ChurnAlert> {
    const triggerReason = `Churn risk score: ${(assessment.riskScore * 100).toFixed(0)}% - ${assessment.riskLevel} risk`;
    const alert = this.churnDetector.createAlert(assessment, client, triggerReason);
    
    this.state.openAlerts.push(alert);

    // Queue escalation if critical
    if (assessment.riskLevel === 'critical') {
      await this.queueAction('escalate_to_human', {
        clientId: client.id,
        alertId: alert.id,
        customMessage: `CRITICAL: ${client.name} at ${(assessment.riskScore * 100).toFixed(0)}% churn risk`,
      });
    } else if (assessment.riskLevel === 'high') {
      await this.queueAction('send_churn_mitigation', {
        clientId: client.id,
        alertId: alert.id,
      });
    }

    return alert;
  }

  /**
   * Get open churn alerts
   */
  getOpenAlerts(): ChurnAlert[] {
    return this.churnDetector.getOpenAlerts();
  }

  /**
   * Acknowledge churn alert
   */
  acknowledgeAlert(alertId: string, userId: string): ChurnAlert | null {
    return this.churnDetector.acknowledgeAlert(alertId, userId);
  }

  // ============================================
  // CHECK-INS
  // ============================================

  /**
   * Schedule check-in for client
   */
  async scheduleCheckIn(client: ClientAccount, contact: Contact): Promise<CheckIn> {
    const { date, type, reason } = this.checkInManager.calculateNextCheckIn(client);

    const checkIn = this.checkInManager.scheduleCheckIn({
      clientId: client.id,
      contactId: contact.id,
      type,
      channel: contact.preferredChannel,
      scheduledFor: date,
    }, this.state.employee.id);

    this.state.pendingCheckIns.push(checkIn);

    logger.info('Check-in scheduled', {
      clientId: client.id,
      type,
      date,
      reason,
    });

    return checkIn;
  }

  /**
   * Process due check-ins
   */
  async processDueCheckIns(): Promise<void> {
    const dueCheckIns = this.checkInManager.getDueCheckIns();

    for (const checkIn of dueCheckIns) {
      await this.queueAction('send_check_in', {
        clientId: checkIn.clientId,
        contactId: checkIn.contactId,
        checkInId: checkIn.id,
        channel: checkIn.channel,
      });
    }

    logger.info('Due check-ins processed', { count: dueCheckIns.length });
  }

  /**
   * Record check-in response
   */
  async recordCheckInResponse(
    checkInId: string,
    response: CheckIn['response']
  ): Promise<CheckIn | null> {
    if (!response) return null;
    
    const checkIn = this.checkInManager.recordResponse(checkInId, response);

    if (checkIn && response) {
      // Store response in memory
      await this.memory.store({
        contextType: 'contact',
        contextId: checkIn.contactId,
        content: `Check-in response: ${response.sentiment}. Issues: ${response.issuesRaised?.join(', ') || 'None'}`,
        importanceScore: response.sentiment === 'negative' ? 0.9 : 0.5,
        tags: ['check_in', 'response', response.sentiment],
      });

      // Handle follow-ups
      if (response.sentiment === 'negative') {
        await this.queueAction('escalate_to_human', {
          clientId: checkIn.clientId,
          checkInId: checkIn.id,
          customMessage: 'Negative check-in response - attention needed',
        });
      }

      if (response.upsellInterest) {
        await this.queueAction('send_upsell_proposal', {
          clientId: checkIn.clientId,
        });
      }
    }

    return checkIn;
  }

  /**
   * Get check-in stats
   */
  getCheckInStats(period: 'week' | 'month' = 'week') {
    return this.checkInManager.getStats(this.state.employee.id, period);
  }

  // ============================================
  // UPSELL OPPORTUNITIES
  // ============================================

  /**
   * Detect upsell opportunities for client
   */
  async detectUpsellOpportunities(
    client: ClientAccount,
    health: HealthScoreBreakdown,
    usage?: UsagePattern
  ): Promise<UpsellOpportunity[]> {
    const opportunities = this.upsellDetector.detectOpportunities(client, health, usage);

    // Add to state
    for (const opp of opportunities) {
      if (!this.state.activeOpportunities.find(o => o.id === opp.id)) {
        this.state.activeOpportunities.push(opp);
      }
    }

    // Store in memory
    if (opportunities.length > 0) {
      await this.memory.store({
        contextType: 'contact',
        contextId: client.id,
        content: `Upsell opportunities: ${opportunities.map(o => o.type).join(', ')}`,
        importanceScore: 0.7,
        tags: ['upsell', 'opportunity'],
      });
    }

    return opportunities;
  }

  /**
   * Get client upsell opportunities
   */
  getClientOpportunities(clientId: string): UpsellOpportunity[] {
    return this.upsellDetector.getClientOpportunities(clientId);
  }

  /**
   * Update opportunity status
   */
  updateOpportunityStatus(
    opportunityId: string,
    status: UpsellOpportunity['status'],
    notes?: string
  ): UpsellOpportunity | null {
    return this.upsellDetector.updateOpportunityStatus(opportunityId, status, notes);
  }

  /**
   * Get opportunity talking points
   */
  getOpportunityTalkingPoints(opportunity: UpsellOpportunity): string[] {
    return this.upsellDetector.getTalkingPoints(opportunity);
  }

  // ============================================
  // USAGE ANALYSIS
  // ============================================

  /**
   * Analyze usage patterns for client
   */
  async analyzeUsage(
    clientId: string,
    rawData: RawUsageData
  ): Promise<UsagePattern> {
    const pattern = this.usageAnalyzer.analyze(clientId, rawData);

    // Store insights in memory
    if (pattern.insights.length > 0) {
      await this.memory.store({
        contextType: 'contact',
        contextId: clientId,
        content: `Usage insights: ${pattern.insights.join('. ')}`,
        importanceScore: pattern.anomalies.length > 0 ? 0.8 : 0.5,
        tags: ['usage', 'analysis'],
      });
    }

    // Check for concerning anomalies
    const criticalAnomalies = pattern.anomalies.filter(a => a.severity === 'high');
    if (criticalAnomalies.length > 0) {
      const client = this.getClient(clientId);
      if (client) {
        await this.queueAction('send_check_in', {
          clientId,
          channel: 'email',
          customMessage: 'Usage pattern concerns detected',
        });
      }
    }

    return pattern;
  }

  // ============================================
  // ACTION MANAGEMENT
  // ============================================

  /**
   * Queue an action for execution
   */
  async queueAction(type: CSMActionType, context: CSMActionContext): Promise<string> {
    const input: CreateActionInput = {
      employeeId: this.state.employee.id,
      type: this.mapCSMActionToGeneric(type),
      parameters: {
        csmActionType: type,
        ...context,
      },
    };

    const action = await this.actions.createAction(input);
    return action.id;
  }

  /**
   * Map CSM-specific action to generic action type
   */
  private mapCSMActionToGeneric(csmAction: CSMActionType) {
    switch (csmAction) {
      case 'send_welcome':
      case 'send_check_in':
      case 'send_check_in_reminder':
      case 'send_health_alert':
      case 'send_churn_mitigation':
      case 'send_renewal_reminder':
      case 'send_upsell_proposal':
      case 'request_nps':
      case 'request_referral':
        return 'send_message' as const;
      case 'schedule_kickoff':
      case 'send_training_invite':
      case 'schedule_qbr':
        return 'schedule_meeting' as const;
      case 'escalate_to_human':
        return 'escalate' as const;
      case 'update_health_score':
      case 'log_interaction':
        return 'update_contact' as const;
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
   * Generate portfolio report
   */
  async generatePortfolioReport(
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): Promise<CSMPortfolioReport> {
    const now = new Date();
    const periodMs = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;
    const startDate = new Date(now.getTime() - periodMs * 24 * 60 * 60 * 1000);

    const portfolio = this.state.portfolio;

    // Health summary
    const healthySummary = {
      healthy: portfolio.filter(c => c.healthScore >= 70).length,
      atRisk: portfolio.filter(c => c.healthScore >= 40 && c.healthScore < 70).length,
      critical: portfolio.filter(c => c.healthScore < 40).length,
      avgHealthScore: portfolio.length > 0 
        ? portfolio.reduce((sum, c) => sum + c.healthScore, 0) / portfolio.length 
        : 0,
      healthTrend: 'stable' as const, // Would calculate from history
    };

    // Churn summary
    const atRiskClients = portfolio.filter(c => c.churnRiskScore > 0.5);
    const churnSummary = {
      atRiskCount: atRiskClients.length,
      atRiskRevenue: atRiskClients.reduce((sum, c) => sum + c.mrr * 12, 0),
      churnedCount: 0, // Would come from historical data
      churnedRevenue: 0,
      savedCount: 0,
      savedRevenue: 0,
    };

    // Engagement summary
    const checkInStats = this.checkInManager.getStats(this.state.employee.id, 'month');
    const engagementSummary = {
      checkInsCompleted: checkInStats.completed,
      checkInResponseRate: checkInStats.avgResponseRate,
      avgSentimentScore: 0, // Would calculate from responses
      issuesResolved: 0, // Would come from support integration
    };

    // Revenue summary
    const totalMrr = portfolio.reduce((sum, c) => sum + c.mrr, 0);
    const opportunitySummary = this.upsellDetector.getPortfolioSummary();
    const revenueSummary = {
      totalMrr,
      expansionMrr: 0, // Would come from historical comparison
      contractionMrr: 0,
      upsellsClosed: opportunitySummary.byPriority.high ?? 0, // Approximation
      upsellValue: opportunitySummary.totalPipelineValue,
    };

    // Onboarding summary
    const activeOnboardings = this.onboardingManager.getActiveSequences();
    const onboardingSummary = {
      newClients: portfolio.filter(c => 
        c.createdAt >= startDate
      ).length,
      completedOnboarding: portfolio.filter(c => 
        c.onboardingStatus === 'complete'
      ).length,
      avgOnboardingDays: 14, // Would calculate from actual data
      timeToFirstValue: 7, // Would calculate from actual data
    };

    // Top risk clients
    const topRiskClients = portfolio
      .filter(c => c.healthScore < 70 || c.churnRiskScore > 0.4)
      .sort((a, b) => b.churnRiskScore - a.churnRiskScore)
      .slice(0, 5)
      .map(c => ({
        clientId: c.id,
        clientName: c.name,
        healthScore: c.healthScore,
        churnRisk: c.churnRiskScore,
        mrr: c.mrr,
        topIssue: c.healthScore < 40 ? 'Critical health' : 'At risk',
      }));

    // Top opportunities
    const topOpportunities = this.upsellDetector.getActiveOpportunities()
      .slice(0, 5)
      .map(o => ({
        clientId: o.clientId,
        clientName: o.clientName,
        type: o.type,
        estimatedValue: o.estimatedValue,
        confidence: o.confidence,
      }));

    // Key highlights
    const keyHighlights: string[] = [];
    if (healthySummary.avgHealthScore >= 70) {
      keyHighlights.push('Portfolio health above target');
    }
    if (opportunitySummary.totalOpportunities > 0) {
      keyHighlights.push(`${opportunitySummary.totalOpportunities} active expansion opportunities`);
    }
    if (checkInStats.completed > 0) {
      keyHighlights.push(`${checkInStats.completed} check-ins completed`);
    }

    // Recommendations
    const recommendations: string[] = [];
    if (healthySummary.critical > 0) {
      recommendations.push(`Prioritize ${healthySummary.critical} critical health accounts`);
    }
    if (churnSummary.atRiskCount > 0) {
      recommendations.push(`Activate save playbooks for ${churnSummary.atRiskCount} at-risk accounts`);
    }
    if (checkInStats.missed > 0) {
      recommendations.push(`Follow up on ${checkInStats.missed} missed check-ins`);
    }

    const report: CSMPortfolioReport = {
      id: `report_${now.getTime()}`,
      workspaceId: this.state.employee.workspaceId,
      employeeId: this.state.employee.id,
      period,
      startDate,
      endDate: now,
      totalClients: portfolio.length,
      healthSummary: healthySummary,
      churnSummary,
      engagementSummary,
      revenueSummary,
      onboardingSummary,
      topRiskClients,
      topOpportunities,
      keyHighlights,
      recommendations,
      generatedAt: now,
    };

    logger.info('Portfolio report generated', {
      reportId: report.id,
      period,
      totalClients: portfolio.length,
    });

    return report;
  }

  // ============================================
  // NATURAL LANGUAGE INTERFACE
  // ============================================

  /**
   * Handle natural language query
   */
  async handleQuery(
    query: string, 
    context?: { clientId?: string }
  ): Promise<string> {
    const queryLower = query.toLowerCase();

    // Health queries
    if (queryLower.includes('health') && queryLower.includes('score')) {
      if (context?.clientId) {
        const client = this.getClient(context.clientId);
        if (client) {
          return `${client.name} has a health score of ${client.healthScore}. ` +
            `They are in the ${client.lifecycleStage} stage with ${client.mrr} MRR.`;
        }
      }
      return this.formatPortfolioHealth();
    }

    // Churn risk queries
    if (queryLower.includes('churn') || queryLower.includes('at risk')) {
      return this.formatAtRiskClients();
    }

    // Upsell queries
    if (queryLower.includes('upsell') || queryLower.includes('opportunit')) {
      return this.formatUpsellOpportunities();
    }

    // Check-in queries
    if (queryLower.includes('check-in') || queryLower.includes('checkin')) {
      return this.formatCheckInStatus();
    }

    // Onboarding queries
    if (queryLower.includes('onboarding') || queryLower.includes('new client')) {
      return this.formatOnboardingStatus();
    }

    // Portfolio overview
    if (queryLower.includes('portfolio') || queryLower.includes('overview')) {
      return this.formatPortfolioOverview();
    }

    // Default response
    return `I'm ${this.state.employee.name}, your AI Customer Success Manager. I can help you with:
- Portfolio health and client scores
- Churn risk assessment and alerts
- Upsell opportunities
- Client onboarding status
- Check-in scheduling and tracking

What would you like to know?`;
  }

  /**
   * Format portfolio health summary
   */
  private formatPortfolioHealth(): string {
    const portfolio = this.state.portfolio;
    if (portfolio.length === 0) {
      return 'No clients in portfolio yet.';
    }

    const healthy = portfolio.filter(c => c.healthScore >= 70).length;
    const atRisk = portfolio.filter(c => c.healthScore >= 40 && c.healthScore < 70).length;
    const critical = portfolio.filter(c => c.healthScore < 40).length;
    const avgScore = Math.round(
      portfolio.reduce((sum, c) => sum + c.healthScore, 0) / portfolio.length
    );

    return `Portfolio Health Summary:
- Total Clients: ${portfolio.length}
- Healthy (70+): ${healthy}
- At Risk (40-69): ${atRisk}
- Critical (<40): ${critical}
- Average Score: ${avgScore}`;
  }

  /**
   * Format at-risk clients
   */
  private formatAtRiskClients(): string {
    const atRisk = this.state.portfolio
      .filter(c => c.churnRiskScore > 0.5 || c.healthScore < 50)
      .sort((a, b) => b.churnRiskScore - a.churnRiskScore);

    if (atRisk.length === 0) {
      return 'No clients currently at significant churn risk.';
    }

    return `At-Risk Clients (${atRisk.length}):\n` +
      atRisk.slice(0, 5).map(c => 
        `- ${c.name}: Risk ${(c.churnRiskScore * 100).toFixed(0)}%, Health ${c.healthScore}, MRR $${c.mrr}`
      ).join('\n');
  }

  /**
   * Format upsell opportunities
   */
  private formatUpsellOpportunities(): string {
    const opportunities = this.upsellDetector.getActiveOpportunities();

    if (opportunities.length === 0) {
      return 'No active upsell opportunities at the moment.';
    }

    const summary = this.upsellDetector.getPortfolioSummary();
    
    return `Upsell Opportunities (${opportunities.length}):
- Total Pipeline: $${summary.totalPipelineValue.toLocaleString()}
- High Priority: ${summary.byPriority.high}

Top Opportunities:
${opportunities.slice(0, 3).map(o => 
  `- ${o.clientName}: ${o.type} - $${o.estimatedValue.toLocaleString()} (${(o.confidence * 100).toFixed(0)}% confidence)`
).join('\n')}`;
  }

  /**
   * Format check-in status
   */
  private formatCheckInStatus(): string {
    const stats = this.checkInManager.getStats(this.state.employee.id, 'week');
    const pending = this.checkInManager.getPendingCheckIns(this.state.employee.id);

    return `Check-in Status (This Week):
- Completed: ${stats.completed}
- Pending: ${pending.length}
- Missed: ${stats.missed}
- Response Rate: ${(stats.avgResponseRate * 100).toFixed(0)}%
- Sentiment: ${stats.sentimentBreakdown.positive} positive, ${stats.sentimentBreakdown.negative} negative`;
  }

  /**
   * Format onboarding status
   */
  private formatOnboardingStatus(): string {
    const activeOnboardings = this.onboardingManager.getActiveSequences();

    if (activeOnboardings.length === 0) {
      return 'No active onboardings in progress.';
    }

    return `Active Onboardings (${activeOnboardings.length}):\n` +
      activeOnboardings.map(seq => {
        const progress = this.onboardingManager.getProgress(seq.id);
        return `- ${seq.clientId}: ${progress?.percentage || 0}% complete (${progress?.currentStepName || 'Unknown'})`;
      }).join('\n');
  }

  /**
   * Format portfolio overview
   */
  private formatPortfolioOverview(): string {
    const portfolio = this.state.portfolio;
    if (portfolio.length === 0) {
      return 'Portfolio is empty. Add clients to get started.';
    }

    const totalMrr = portfolio.reduce((sum, c) => sum + c.mrr, 0);
    const avgHealth = Math.round(
      portfolio.reduce((sum, c) => sum + c.healthScore, 0) / portfolio.length
    );

    return `Portfolio Overview:
- Total Clients: ${portfolio.length}
- Total MRR: $${totalMrr.toLocaleString()}
- Average Health: ${avgHealth}
- Open Alerts: ${this.state.openAlerts.length}
- Active Opportunities: ${this.state.activeOpportunities.length}
- Pending Check-ins: ${this.state.pendingCheckIns.length}`;
  }
}

/**
 * Create a Customer Success Manager agent
 */
export function createCustomerSuccessAgent(
  employee: Employee,
  config?: Partial<CSMConfig>
): CustomerSuccessAgent {
  return new CustomerSuccessAgent(employee, config);
}

