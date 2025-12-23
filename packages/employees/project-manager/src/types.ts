/**
 * AI Project Manager Types
 */

import type { Employee, Contact, CommunicationChannel } from '@aibos/employee-core';

// PM Specific Configuration
export interface PMConfig {
  standupTime: string; // HH:mm format
  standupDays: number[]; // 0-6, 0 = Sunday
  standupChannels: CommunicationChannel[];
  reportDay: number; // Day of week for weekly report
  reportTime: string;
  escalationRules: PMEscalationRule[];
  workloadThreshold: number; // Max tasks per person
  overdueAlertDays: number; // Days before due to start alerting
}

export interface PMEscalationRule {
  id: string;
  trigger: 'blocker_days' | 'missed_standups' | 'overdue_task' | 'workload';
  threshold: number;
  action: 'notify' | 'escalate' | 'auto_reassign';
  notifyUsers?: string[];
}

// Standup Types
export interface StandupRequest {
  id: string;
  contactId: string;
  contactName: string;
  channel: CommunicationChannel;
  requestedAt: Date;
  status: 'pending' | 'received' | 'skipped';
}

export interface StandupResponse {
  id: string;
  contactId: string;
  date: Date;
  yesterday: string;
  today: string;
  blockers: string;
  mood?: 'good' | 'okay' | 'struggling';
  projectId?: string;
  submittedAt: Date;
  channel: CommunicationChannel;
}

export interface StandupSummary {
  date: Date;
  totalTeamMembers: number;
  responsesReceived: number;
  blockersReported: number;
  blockerDetails: Array<{
    contactId: string;
    contactName: string;
    blocker: string;
    daysSinceReported?: number;
  }>;
  highlights: string[];
}

// Task Types for PM
export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeName: string;
  dueDate?: Date;
  daysOverdue?: number;
  daysUntilDue?: number;
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasksCount: number;
  completionPercentage: number;
  estimatedCompletionDate?: Date;
  healthScore: 'good' | 'at_risk' | 'critical';
}

export interface TeamWorkload {
  contactId: string;
  contactName: string;
  activeTasks: number;
  completedThisWeek: number;
  overdueCount: number;
  estimatedHoursRemaining: number;
  workloadStatus: 'light' | 'normal' | 'heavy' | 'overloaded';
}

// Weekly Report
export interface WeeklyReport {
  id: string;
  workspaceId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  projectSummaries: ProjectProgress[];
  teamPerformance: {
    tasksCompleted: number;
    tasksCreated: number;
    blockersResolved: number;
    standupParticipation: number; // percentage
  };
  highlights: string[];
  concerns: string[];
  upcomingDeadlines: Array<{
    task: string;
    project: string;
    dueDate: Date;
    assignee: string;
  }>;
  generatedAt: Date;
}

// PM Actions
export type PMActionType =
  | 'send_standup_request'
  | 'send_standup_reminder'
  | 'send_deadline_reminder'
  | 'send_blocker_followup'
  | 'send_progress_update'
  | 'send_weekly_report'
  | 'assign_task'
  | 'update_task_status'
  | 'create_meeting'
  | 'escalate_blocker';

export interface PMActionContext {
  projectId?: string;
  taskId?: string;
  contactId?: string;
  blockerId?: string;
  channel?: CommunicationChannel;
}

// PM Capabilities
export interface PMCapabilities {
  canSendStandups: boolean;
  canAssignTasks: boolean;
  canScheduleMeetings: boolean;
  canEscalate: boolean;
  canGenerateReports: boolean;
  canFollowUp: boolean;
}

// PM State
export interface PMState {
  employee: Employee;
  config: PMConfig;
  todayStandups: StandupRequest[];
  pendingFollowups: Array<{
    type: 'blocker' | 'overdue' | 'missed_standup';
    contactId: string;
    details: string;
    scheduledFor: Date;
  }>;
  lastReportDate?: Date;
}

