/**
 * AI Project Manager Agent
 * 
 * Core implementation of the AI Project Manager employee.
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
  PMConfig,
  PMState,
  StandupRequest,
  StandupResponse,
  StandupSummary,
  TeamWorkload,
  ProjectProgress,
  WeeklyReport,
  PMActionType,
  PMActionContext,
} from './types';

const logger = createLogger('employee:project-manager');

// Default PM configuration
const DEFAULT_PM_CONFIG: PMConfig = {
  standupTime: '09:00',
  standupDays: [1, 2, 3, 4, 5], // Monday to Friday
  standupChannels: ['slack', 'email'],
  reportDay: 5, // Friday
  reportTime: '16:00',
  escalationRules: [
    {
      id: 'blocker_3days',
      trigger: 'blocker_days',
      threshold: 3,
      action: 'notify',
    },
    {
      id: 'missed_3_standups',
      trigger: 'missed_standups',
      threshold: 3,
      action: 'escalate',
    },
  ],
  workloadThreshold: 10,
  overdueAlertDays: 2,
};

/**
 * AI Project Manager class
 */
export class ProjectManagerAgent {
  private state: PMState;
  private persona;
  private memory;
  private trust;
  private actions;
  private knowledge;
  private inbox;

  constructor(employee: Employee, config?: Partial<PMConfig>) {
    this.state = {
      employee,
      config: { ...DEFAULT_PM_CONFIG, ...config },
      todayStandups: [],
      pendingFollowups: [],
    };

    // Initialize core systems
    this.persona = createPersonaManager('project_manager', employee.persona);
    this.memory = createMemoryStore(employee.id);
    this.trust = createTrustManager(employee.id, employee.trustConfig);
    this.actions = createActionEngine(employee.id, employee.workspaceId, this.trust);
    this.knowledge = createKnowledgeBase(employee.id);
    this.inbox = createUnifiedInbox(employee.workspaceId);

    // Load default knowledge
    this.loadDefaultKnowledge();

    logger.info('Project Manager initialized', {
      employeeId: employee.id,
      name: employee.name,
    });
  }

  /**
   * Load default PM knowledge
   */
  private async loadDefaultKnowledge(): Promise<void> {
    const templates = KNOWLEDGE_TEMPLATES.project_manager;
    for (const template of templates) {
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
   * Get PM config
   */
  getConfig(): PMConfig {
    return this.state.config;
  }

  /**
   * Update PM config
   */
  updateConfig(updates: Partial<PMConfig>): void {
    this.state.config = { ...this.state.config, ...updates };
    logger.info('PM config updated', { updates });
  }

  // ============================================
  // STANDUP MANAGEMENT
  // ============================================

  /**
   * Initiate daily standups for team
   */
  async initiateStandups(teamMembers: Contact[]): Promise<StandupRequest[]> {
    const requests: StandupRequest[] = [];
    const now = new Date();

    for (const member of teamMembers) {
      const request: StandupRequest = {
        id: `standup_${now.getTime()}_${member.id}`,
        contactId: member.id,
        contactName: member.name,
        channel: member.preferredChannel,
        requestedAt: now,
        status: 'pending',
      };

      requests.push(request);

      // Queue action to send standup request
      await this.queueAction('send_standup_request', {
        contactId: member.id,
        channel: member.preferredChannel,
      });
    }

    this.state.todayStandups = requests;

    logger.info('Standups initiated', {
      teamSize: teamMembers.length,
      date: now.toISOString(),
    });

    return requests;
  }

  /**
   * Process standup response
   */
  async processStandupResponse(
    contactId: string,
    response: Omit<StandupResponse, 'id' | 'submittedAt'>
  ): Promise<StandupResponse> {
    const now = new Date();

    const standup: StandupResponse = {
      id: `standup_resp_${now.getTime()}_${contactId}`,
      ...response,
      submittedAt: now,
    };

    // Update request status
    const request = this.state.todayStandups.find(r => r.contactId === contactId);
    if (request) {
      request.status = 'received';
    }

    // Store in memory
    await this.memory.store({
      contextType: 'contact',
      contextId: contactId,
      content: `Standup ${now.toDateString()}: Yesterday: ${response.yesterday}. Today: ${response.today}. Blockers: ${response.blockers || 'None'}`,
      importanceScore: 0.6,
      tags: ['standup', now.toDateString()],
    });

    // Check for blockers
    if (response.blockers && response.blockers.toLowerCase() !== 'none' && response.blockers.trim() !== '') {
      await this.handleBlockerReported(contactId, response.blockers);
    }

    logger.info('Standup response processed', {
      contactId,
      hasBlockers: !!response.blockers,
    });

    return standup;
  }

  /**
   * Generate standup summary
   */
  async generateStandupSummary(): Promise<StandupSummary> {
    const today = new Date();
    const requests = this.state.todayStandups;
    const received = requests.filter(r => r.status === 'received');

    // Find blockers from today's standups
    const blockerDetails: StandupSummary['blockerDetails'] = [];
    // TODO: Fetch from standup responses stored in database

    const summary: StandupSummary = {
      date: today,
      totalTeamMembers: requests.length,
      responsesReceived: received.length,
      blockersReported: blockerDetails.length,
      blockerDetails,
      highlights: [],
    };

    // Store summary in memory
    await this.memory.store({
      contextType: 'workspace',
      contextId: this.state.employee.workspaceId,
      content: `Standup summary ${today.toDateString()}: ${received.length}/${requests.length} responses, ${blockerDetails.length} blockers`,
      importanceScore: 0.7,
      tags: ['standup_summary', today.toDateString()],
    });

    return summary;
  }

  /**
   * Handle blocker reported
   */
  private async handleBlockerReported(contactId: string, blockerDescription: string): Promise<void> {
    // Schedule follow-up
    const followupDate = new Date();
    followupDate.setDate(followupDate.getDate() + 1);

    this.state.pendingFollowups.push({
      type: 'blocker',
      contactId,
      details: blockerDescription,
      scheduledFor: followupDate,
    });

    // Store blocker in memory
    await this.memory.store({
      contextType: 'contact',
      contextId: contactId,
      content: `Blocker reported: ${blockerDescription}`,
      importanceScore: 0.8,
      tags: ['blocker', 'active'],
    });

    logger.info('Blocker recorded', { contactId, blocker: blockerDescription });
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  /**
   * Get team workload analysis
   */
  async analyzeTeamWorkload(teamMembers: Contact[]): Promise<TeamWorkload[]> {
    const workloads: TeamWorkload[] = [];

    for (const member of teamMembers) {
      // TODO: Fetch actual task data from database
      const workload: TeamWorkload = {
        contactId: member.id,
        contactName: member.name,
        activeTasks: 0, // Placeholder
        completedThisWeek: 0,
        overdueCount: 0,
        estimatedHoursRemaining: 0,
        workloadStatus: 'normal',
      };

      // Determine workload status
      if (workload.activeTasks > this.state.config.workloadThreshold) {
        workload.workloadStatus = 'overloaded';
      } else if (workload.activeTasks > this.state.config.workloadThreshold * 0.8) {
        workload.workloadStatus = 'heavy';
      } else if (workload.activeTasks < 3) {
        workload.workloadStatus = 'light';
      }

      workloads.push(workload);
    }

    return workloads;
  }

  /**
   * Get project progress
   */
  async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    // TODO: Fetch actual data from database
    const progress: ProjectProgress = {
      projectId,
      projectName: 'Project', // Placeholder
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      overdueTasksCount: 0,
      completionPercentage: 0,
      healthScore: 'good',
    };

    // Calculate health score
    if (progress.blockedTasks > 0 || progress.overdueTasksCount > 2) {
      progress.healthScore = 'critical';
    } else if (progress.overdueTasksCount > 0 || progress.completionPercentage < 50) {
      progress.healthScore = 'at_risk';
    }

    return progress;
  }

  /**
   * Check for overdue tasks and send reminders
   */
  async checkOverdueTasks(): Promise<void> {
    // TODO: Fetch overdue tasks from database
    const overdueTasks: Array<{ taskId: string; assigneeId: string; title: string; daysOverdue: number }> = [];

    for (const task of overdueTasks) {
      if (task.daysOverdue >= this.state.config.overdueAlertDays) {
        await this.queueAction('send_deadline_reminder', {
          taskId: task.taskId,
          contactId: task.assigneeId,
        });
      }
    }
  }

  // ============================================
  // WEEKLY REPORTS
  // ============================================

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(): Promise<WeeklyReport> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday

    const report: WeeklyReport = {
      id: `report_${now.getTime()}`,
      workspaceId: this.state.employee.workspaceId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      projectSummaries: [], // TODO: Fetch from projects
      teamPerformance: {
        tasksCompleted: 0, // TODO: Calculate
        tasksCreated: 0,
        blockersResolved: 0,
        standupParticipation: 0,
      },
      highlights: [],
      concerns: [],
      upcomingDeadlines: [],
      generatedAt: now,
    };

    this.state.lastReportDate = now;

    logger.info('Weekly report generated', { reportId: report.id });

    return report;
  }

  // ============================================
  // ACTION MANAGEMENT
  // ============================================

  /**
   * Queue an action for execution
   */
  async queueAction(type: PMActionType, context: PMActionContext): Promise<string> {
    const input: CreateActionInput = {
      employeeId: this.state.employee.id,
      type: this.mapPMActionToGeneric(type),
      parameters: {
        pmActionType: type,
        ...context,
      },
    };

    const action = await this.actions.createAction(input);
    return action.id;
  }

  /**
   * Map PM-specific action to generic action type
   */
  private mapPMActionToGeneric(pmAction: PMActionType): 'send_message' | 'send_email' | 'create_task' | 'update_task' | 'schedule_meeting' | 'escalate' {
    switch (pmAction) {
      case 'send_standup_request':
      case 'send_standup_reminder':
      case 'send_deadline_reminder':
      case 'send_blocker_followup':
      case 'send_progress_update':
        return 'send_message';
      case 'send_weekly_report':
        return 'send_email';
      case 'assign_task':
        return 'create_task';
      case 'update_task_status':
        return 'update_task';
      case 'create_meeting':
        return 'schedule_meeting';
      case 'escalate_blocker':
        return 'escalate';
      default:
        return 'send_message';
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
  // FOLLOW-UP MANAGEMENT
  // ============================================

  /**
   * Process due follow-ups
   */
  async processDueFollowups(): Promise<void> {
    const now = new Date();
    const dueFollowups = this.state.pendingFollowups.filter(
      f => f.scheduledFor <= now
    );

    for (const followup of dueFollowups) {
      switch (followup.type) {
        case 'blocker':
          await this.queueAction('send_blocker_followup', {
            contactId: followup.contactId,
          });
          break;
        case 'missed_standup':
          await this.queueAction('send_standup_reminder', {
            contactId: followup.contactId,
          });
          break;
        case 'overdue':
          await this.queueAction('send_deadline_reminder', {
            contactId: followup.contactId,
          });
          break;
      }
    }

    // Remove processed followups
    this.state.pendingFollowups = this.state.pendingFollowups.filter(
      f => f.scheduledFor > now
    );
  }

  // ============================================
  // NATURAL LANGUAGE INTERFACE
  // ============================================

  /**
   * Handle natural language query
   */
  async handleQuery(query: string, context?: { contactId?: string; projectId?: string }): Promise<string> {
    const queryLower = query.toLowerCase();

    // Simple intent detection
    if (queryLower.includes('standup') && queryLower.includes('summary')) {
      const summary = await this.generateStandupSummary();
      return this.formatStandupSummary(summary);
    }

    if (queryLower.includes('workload') || queryLower.includes('capacity')) {
      // TODO: Fetch team and analyze
      return "I'll analyze the team workload. This feature requires team data to be loaded.";
    }

    if (queryLower.includes('blocker') || queryLower.includes('blocked')) {
      const blockers = await this.getActiveBlockers();
      return this.formatBlockersList(blockers);
    }

    if (queryLower.includes('overdue') || queryLower.includes('late')) {
      // TODO: Fetch overdue tasks
      return "I'll check for overdue tasks. This feature requires task data to be loaded.";
    }

    if (queryLower.includes('report') && queryLower.includes('weekly')) {
      const report = await this.generateWeeklyReport();
      return this.formatWeeklyReport(report);
    }

    // Default response
    return `I'm ${this.state.employee.name}, your AI Project Manager. I can help you with:
- Daily standups and summaries
- Team workload analysis
- Blocker tracking and follow-ups
- Deadline reminders
- Weekly reports

What would you like me to help with?`;
  }

  /**
   * Get active blockers
   */
  private async getActiveBlockers(): Promise<Array<{ contactId: string; description: string; daysOpen: number }>> {
    // Search memory for blocker entries
    const results = this.memory.search('blocker', { contextType: 'contact', limit: 20 });
    return results
      .filter(r => r.memory.tags?.includes('active'))
      .map(r => ({
        contactId: r.memory.contextId,
        description: r.memory.content,
        daysOpen: Math.floor((Date.now() - r.memory.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      }));
  }

  /**
   * Format standup summary
   */
  private formatStandupSummary(summary: StandupSummary): string {
    return `Standup Summary for ${summary.date.toDateString()}:
- Responses: ${summary.responsesReceived}/${summary.totalTeamMembers}
- Blockers reported: ${summary.blockersReported}
${summary.blockerDetails.length > 0 ? '\nBlockers:\n' + summary.blockerDetails.map(b => `- ${b.contactName}: ${b.blocker}`).join('\n') : ''}
${summary.highlights.length > 0 ? '\nHighlights:\n' + summary.highlights.map(h => `- ${h}`).join('\n') : ''}`;
  }

  /**
   * Format blockers list
   */
  private formatBlockersList(blockers: Array<{ contactId: string; description: string; daysOpen: number }>): string {
    if (blockers.length === 0) {
      return 'No active blockers reported.';
    }

    return `Active Blockers (${blockers.length}):\n` +
      blockers.map(b => `- ${b.description} (${b.daysOpen} days open)`).join('\n');
  }

  /**
   * Format weekly report
   */
  private formatWeeklyReport(report: WeeklyReport): string {
    return `Weekly Report (${report.weekStartDate.toDateString()} - ${report.weekEndDate.toDateString()}):

Team Performance:
- Tasks Completed: ${report.teamPerformance.tasksCompleted}
- Tasks Created: ${report.teamPerformance.tasksCreated}
- Blockers Resolved: ${report.teamPerformance.blockersResolved}
- Standup Participation: ${report.teamPerformance.standupParticipation}%

${report.highlights.length > 0 ? 'Highlights:\n' + report.highlights.map(h => `- ${h}`).join('\n') : ''}
${report.concerns.length > 0 ? '\nConcerns:\n' + report.concerns.map(c => `- ${c}`).join('\n') : ''}
${report.upcomingDeadlines.length > 0 ? '\nUpcoming Deadlines:\n' + report.upcomingDeadlines.map(d => `- ${d.task} (${d.project}) - ${d.dueDate.toDateString()}`).join('\n') : ''}`;
  }
}

/**
 * Create a Project Manager agent
 */
export function createProjectManagerAgent(
  employee: Employee,
  config?: Partial<PMConfig>
): ProjectManagerAgent {
  return new ProjectManagerAgent(employee, config);
}

