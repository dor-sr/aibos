/**
 * Action Engine
 * 
 * Manages action queue, execution, and audit logging for AI employees.
 */

import { createLogger } from '@aibos/core';
import type {
  EmployeeAction,
  ActionType,
  ActionStatus,
  ActionDefinition,
  ActionRiskLevel,
  CreateActionInput,
} from '../types';
import { TrustManager, type ActionContext } from '../trust/trust-manager';

const logger = createLogger('employee:actions');

// Action definitions
export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  send_message: {
    type: 'send_message',
    name: 'Send Message',
    description: 'Send a message through a communication channel',
    riskLevel: 'medium',
    reversible: false,
    requiredParams: ['channel', 'contactId', 'content'],
    optionalParams: ['attachments', 'replyTo'],
  },
  send_email: {
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email to a contact',
    riskLevel: 'medium',
    reversible: false,
    requiredParams: ['to', 'subject', 'body'],
    optionalParams: ['cc', 'bcc', 'attachments', 'replyTo'],
  },
  create_task: {
    type: 'create_task',
    name: 'Create Task',
    description: 'Create a new task in a project',
    riskLevel: 'low',
    reversible: true,
    requiredParams: ['projectId', 'title'],
    optionalParams: ['description', 'assigneeId', 'dueDate', 'priority'],
  },
  update_task: {
    type: 'update_task',
    name: 'Update Task',
    description: 'Update an existing task',
    riskLevel: 'low',
    reversible: true,
    requiredParams: ['taskId'],
    optionalParams: ['title', 'description', 'status', 'assigneeId', 'dueDate', 'priority'],
  },
  schedule_meeting: {
    type: 'schedule_meeting',
    name: 'Schedule Meeting',
    description: 'Schedule a meeting with contacts',
    riskLevel: 'medium',
    reversible: true,
    requiredParams: ['title', 'startTime', 'duration', 'attendees'],
    optionalParams: ['description', 'location', 'isVirtual'],
  },
  create_reminder: {
    type: 'create_reminder',
    name: 'Create Reminder',
    description: 'Create a reminder for follow-up',
    riskLevel: 'low',
    reversible: true,
    requiredParams: ['message', 'remindAt'],
    optionalParams: ['contactId', 'projectId'],
  },
  escalate: {
    type: 'escalate',
    name: 'Escalate to Human',
    description: 'Escalate an issue to a human team member',
    riskLevel: 'low',
    reversible: false,
    requiredParams: ['reason', 'context'],
    optionalParams: ['assignTo', 'priority'],
  },
  update_contact: {
    type: 'update_contact',
    name: 'Update Contact',
    description: 'Update contact information',
    riskLevel: 'low',
    reversible: true,
    requiredParams: ['contactId'],
    optionalParams: ['name', 'email', 'phone', 'company', 'tags', 'metadata'],
  },
  log_interaction: {
    type: 'log_interaction',
    name: 'Log Interaction',
    description: 'Log an interaction with a contact',
    riskLevel: 'low',
    reversible: true,
    requiredParams: ['contactId', 'type', 'content'],
    optionalParams: ['channel', 'sentiment', 'metadata'],
  },
  custom: {
    type: 'custom',
    name: 'Custom Action',
    description: 'A custom action type',
    riskLevel: 'high',
    reversible: false,
    requiredParams: ['handler', 'data'],
    optionalParams: [],
  },
};

export interface ActionHandler {
  execute(action: EmployeeAction): Promise<Record<string, unknown>>;
  validate(params: Record<string, unknown>): { valid: boolean; errors: string[] };
  rollback?(action: EmployeeAction): Promise<void>;
}

export interface ActionEngineConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxQueueSize: number;
}

const DEFAULT_CONFIG: ActionEngineConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  maxQueueSize: 1000,
};

/**
 * Action Engine class
 */
export class ActionEngine {
  private queue: Map<string, EmployeeAction> = new Map();
  private handlers: Map<ActionType, ActionHandler> = new Map();
  private trustManager: TrustManager;
  private config: ActionEngineConfig;
  private employeeId: string;
  private workspaceId: string;
  private auditLog: ActionAuditEntry[] = [];

  constructor(
    employeeId: string,
    workspaceId: string,
    trustManager: TrustManager,
    config: ActionEngineConfig = DEFAULT_CONFIG
  ) {
    this.employeeId = employeeId;
    this.workspaceId = workspaceId;
    this.trustManager = trustManager;
    this.config = config;
  }

  /**
   * Register an action handler
   */
  registerHandler(type: ActionType, handler: ActionHandler): void {
    this.handlers.set(type, handler);
    logger.debug('Handler registered', { type });
  }

  /**
   * Create and queue an action
   */
  async createAction(input: CreateActionInput): Promise<EmployeeAction> {
    // Validate parameters
    const definition = ACTION_DEFINITIONS[input.type];
    if (!definition) {
      throw new Error(`Unknown action type: ${input.type}`);
    }

    // Check required params
    for (const param of definition.requiredParams) {
      if (!(param in input.parameters)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    // Validate with handler if registered
    const handler = this.handlers.get(input.type);
    if (handler) {
      const validation = handler.validate(input.parameters);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Evaluate trust decision
    const context: ActionContext = {
      actionType: input.type,
      contactId: input.parameters.contactId as string | undefined,
      isNewContact: input.parameters.isNewContact as boolean | undefined,
      contentSensitivity: this.assessContentSensitivity(input.parameters),
    };

    const trustDecision = this.trustManager.evaluate(context);

    // Create action
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const action: EmployeeAction = {
      id,
      employeeId: this.employeeId,
      workspaceId: this.workspaceId,
      type: input.type,
      parameters: input.parameters,
      status: trustDecision.requiresApproval ? 'pending' : 'approved',
      confidenceScore: input.confidenceScore ?? trustDecision.confidenceScore,
      requiresApproval: trustDecision.requiresApproval,
      scheduledFor: input.scheduledFor,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      createdAt: now,
      updatedAt: now,
    };

    // Add to queue
    if (this.queue.size >= this.config.maxQueueSize) {
      throw new Error('Action queue is full');
    }

    this.queue.set(id, action);

    // Log action creation
    this.logAudit({
      actionId: id,
      event: 'created',
      details: {
        type: input.type,
        requiresApproval: trustDecision.requiresApproval,
        confidenceScore: trustDecision.confidenceScore,
        reason: trustDecision.reason,
      },
    });

    logger.info('Action created', {
      id,
      type: input.type,
      requiresApproval: trustDecision.requiresApproval,
    });

    // Auto-execute if approved
    if (!trustDecision.requiresApproval) {
      // Execute asynchronously
      this.executeAction(id).catch(err => {
        logger.error('Auto-execute failed', err as Error, { actionId: id });
      });
    }

    return action;
  }

  /**
   * Approve a pending action
   */
  async approveAction(id: string, approvedBy: string): Promise<EmployeeAction> {
    const action = this.queue.get(id);
    if (!action) {
      throw new Error(`Action not found: ${id}`);
    }

    if (action.status !== 'pending') {
      throw new Error(`Action is not pending: ${action.status}`);
    }

    action.status = 'approved';
    action.approvedBy = approvedBy;
    action.approvedAt = new Date();
    action.updatedAt = new Date();

    // Record approval in trust system
    this.trustManager.recordOutcome(action.type, true, false);

    this.logAudit({
      actionId: id,
      event: 'approved',
      userId: approvedBy,
    });

    logger.info('Action approved', { id, approvedBy });

    // Execute the action
    await this.executeAction(id);

    return action;
  }

  /**
   * Reject a pending action
   */
  async rejectAction(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<EmployeeAction> {
    const action = this.queue.get(id);
    if (!action) {
      throw new Error(`Action not found: ${id}`);
    }

    if (action.status !== 'pending') {
      throw new Error(`Action is not pending: ${action.status}`);
    }

    action.status = 'rejected';
    action.rejectedBy = rejectedBy;
    action.rejectedAt = new Date();
    action.rejectionReason = reason;
    action.updatedAt = new Date();

    // Record rejection in trust system
    this.trustManager.recordOutcome(action.type, false, false);

    this.logAudit({
      actionId: id,
      event: 'rejected',
      userId: rejectedBy,
      details: { reason },
    });

    logger.info('Action rejected', { id, rejectedBy, reason });

    return action;
  }

  /**
   * Execute an approved action
   */
  async executeAction(id: string): Promise<EmployeeAction> {
    const action = this.queue.get(id);
    if (!action) {
      throw new Error(`Action not found: ${id}`);
    }

    if (action.status !== 'approved') {
      throw new Error(`Action is not approved: ${action.status}`);
    }

    // Check if scheduled for later
    if (action.scheduledFor && action.scheduledFor > new Date()) {
      logger.debug('Action scheduled for later', {
        id,
        scheduledFor: action.scheduledFor,
      });
      return action;
    }

    // Get handler
    const handler = this.handlers.get(action.type);
    if (!handler) {
      action.status = 'failed';
      action.error = `No handler registered for action type: ${action.type}`;
      action.updatedAt = new Date();
      
      this.logAudit({
        actionId: id,
        event: 'failed',
        details: { error: action.error },
      });

      return action;
    }

    // Execute
    action.status = 'executing';
    action.updatedAt = new Date();

    try {
      const result = await handler.execute(action);
      
      action.status = 'completed';
      action.executedAt = new Date();
      action.result = result;
      action.updatedAt = new Date();

      // Record success
      if (action.approvedBy) {
        // Was manually approved
        this.trustManager.recordOutcome(action.type, true, false);
      } else {
        // Was auto-approved
        this.trustManager.recordOutcome(action.type, true, true);
      }

      this.logAudit({
        actionId: id,
        event: 'completed',
        details: { result },
      });

      logger.info('Action completed', { id, type: action.type });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      action.retryCount++;
      
      if (action.retryCount >= action.maxRetries) {
        action.status = 'failed';
        action.error = errorMessage;
        
        this.logAudit({
          actionId: id,
          event: 'failed',
          details: { error: errorMessage, retries: action.retryCount },
        });

        logger.error('Action failed', new Error(errorMessage), {
          id,
          retryCount: action.retryCount,
        });
      } else {
        action.status = 'approved'; // Reset to approved for retry
        
        this.logAudit({
          actionId: id,
          event: 'retry_scheduled',
          details: { error: errorMessage, retryCount: action.retryCount },
        });

        logger.warn('Action will retry', {
          id,
          retryCount: action.retryCount,
          maxRetries: action.maxRetries,
        });

        // Schedule retry
        setTimeout(() => {
          this.executeAction(id).catch(err => {
            logger.error('Retry failed', err as Error, { actionId: id });
          });
        }, this.config.retryDelayMs * action.retryCount);
      }
      
      action.updatedAt = new Date();
    }

    return action;
  }

  /**
   * Cancel a pending action
   */
  async cancelAction(id: string): Promise<EmployeeAction> {
    const action = this.queue.get(id);
    if (!action) {
      throw new Error(`Action not found: ${id}`);
    }

    if (action.status !== 'pending' && action.status !== 'approved') {
      throw new Error(`Cannot cancel action with status: ${action.status}`);
    }

    action.status = 'cancelled';
    action.updatedAt = new Date();

    this.logAudit({
      actionId: id,
      event: 'cancelled',
    });

    logger.info('Action cancelled', { id });

    return action;
  }

  /**
   * Rollback a completed action if reversible
   */
  async rollbackAction(id: string): Promise<boolean> {
    const action = this.queue.get(id);
    if (!action) {
      throw new Error(`Action not found: ${id}`);
    }

    if (action.status !== 'completed') {
      throw new Error(`Cannot rollback action with status: ${action.status}`);
    }

    const definition = ACTION_DEFINITIONS[action.type];
    if (!definition.reversible) {
      throw new Error(`Action type ${action.type} is not reversible`);
    }

    const handler = this.handlers.get(action.type);
    if (!handler?.rollback) {
      throw new Error(`No rollback handler for action type: ${action.type}`);
    }

    try {
      await handler.rollback(action);
      
      this.logAudit({
        actionId: id,
        event: 'rolled_back',
      });

      logger.info('Action rolled back', { id });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logAudit({
        actionId: id,
        event: 'rollback_failed',
        details: { error: errorMessage },
      });

      logger.error('Rollback failed', new Error(errorMessage), { id });
      return false;
    }
  }

  /**
   * Get action by ID
   */
  getAction(id: string): EmployeeAction | undefined {
    return this.queue.get(id);
  }

  /**
   * Get pending actions
   */
  getPendingActions(): EmployeeAction[] {
    return Array.from(this.queue.values())
      .filter(a => a.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get actions by status
   */
  getActionsByStatus(status: ActionStatus): EmployeeAction[] {
    return Array.from(this.queue.values())
      .filter(a => a.status === status);
  }

  /**
   * Get recent actions
   */
  getRecentActions(limit: number = 50): EmployeeAction[] {
    return Array.from(this.queue.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Assess content sensitivity
   */
  private assessContentSensitivity(
    params: Record<string, unknown>
  ): 'low' | 'medium' | 'high' {
    const content = JSON.stringify(params).toLowerCase();
    
    // High sensitivity keywords
    const highSensitivity = ['password', 'secret', 'confidential', 'private', 'ssn', 'salary', 'termination'];
    if (highSensitivity.some(word => content.includes(word))) {
      return 'high';
    }

    // Medium sensitivity keywords  
    const mediumSensitivity = ['contract', 'agreement', 'payment', 'invoice', 'deadline', 'urgent'];
    if (mediumSensitivity.some(word => content.includes(word))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: Omit<ActionAuditEntry, 'timestamp'>): void {
    this.auditLog.push({
      ...entry,
      timestamp: new Date(),
    });

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(options?: {
    actionId?: string;
    event?: string;
    limit?: number;
  }): ActionAuditEntry[] {
    let entries = [...this.auditLog];

    if (options?.actionId) {
      entries = entries.filter(e => e.actionId === options.actionId);
    }

    if (options?.event) {
      entries = entries.filter(e => e.event === options.event);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Clear completed actions from queue
   */
  clearCompleted(): number {
    let cleared = 0;
    for (const [id, action] of this.queue.entries()) {
      if (action.status === 'completed' || action.status === 'failed' || action.status === 'cancelled') {
        this.queue.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get stats
   */
  getStats(): ActionEngineStats {
    const actions = Array.from(this.queue.values());
    
    const byStatus: Record<ActionStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      executing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    const byType: Record<string, number> = {};

    for (const action of actions) {
      byStatus[action.status]++;
      byType[action.type] = (byType[action.type] || 0) + 1;
    }

    return {
      queueSize: this.queue.size,
      byStatus,
      byType,
    };
  }
}

export interface ActionAuditEntry {
  actionId: string;
  event: string;
  timestamp: Date;
  userId?: string;
  details?: Record<string, unknown>;
}

export interface ActionEngineStats {
  queueSize: number;
  byStatus: Record<ActionStatus, number>;
  byType: Record<string, number>;
}

/**
 * Create an action engine instance
 */
export function createActionEngine(
  employeeId: string,
  workspaceId: string,
  trustManager: TrustManager,
  config?: ActionEngineConfig
): ActionEngine {
  return new ActionEngine(employeeId, workspaceId, trustManager, config);
}

