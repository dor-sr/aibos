/**
 * Onboarding Sequence Manager
 * 
 * Manages client onboarding sequences with step tracking and automation.
 */

import { createLogger } from '@aibos/core';
import type {
  OnboardingSequence,
  OnboardingStep,
  OnboardingTemplate,
  OnboardingStepType,
  ClientAccount,
} from '../types';

const logger = createLogger('employee:csm:onboarding');

// Default onboarding templates
const DEFAULT_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'template_starter',
    name: 'Starter Plan Onboarding',
    description: 'Streamlined onboarding for starter tier customers',
    planTier: ['starter', 'free'],
    steps: [
      {
        order: 1,
        name: 'Welcome Email',
        type: 'welcome_message',
        channel: 'email',
        delayHours: 0,
        content: 'welcome_starter',
      },
      {
        order: 2,
        name: 'Account Setup Guide',
        type: 'account_setup',
        channel: 'email',
        delayHours: 24,
        triggerCondition: { type: 'time_delay', delayHours: 24 },
      },
      {
        order: 3,
        name: 'First Value Check-in',
        type: 'first_value',
        channel: 'email',
        delayHours: 168, // 7 days
        triggerCondition: { type: 'time_delay', delayHours: 168 },
      },
      {
        order: 4,
        name: '14-Day Review',
        type: 'check_in',
        channel: 'email',
        delayHours: 336, // 14 days
        triggerCondition: { type: 'time_delay', delayHours: 336 },
      },
    ],
    estimatedDays: 14,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template_pro',
    name: 'Pro Plan Onboarding',
    description: 'Comprehensive onboarding with training and success planning',
    planTier: ['pro'],
    steps: [
      {
        order: 1,
        name: 'Welcome Email',
        type: 'welcome_message',
        channel: 'email',
        delayHours: 0,
        content: 'welcome_pro',
      },
      {
        order: 2,
        name: 'Kickoff Call Scheduling',
        type: 'kickoff_call',
        channel: 'email',
        delayHours: 1,
        triggerCondition: { type: 'time_delay', delayHours: 1 },
      },
      {
        order: 3,
        name: 'Account Setup Verification',
        type: 'account_setup',
        channel: 'email',
        delayHours: 48,
        triggerCondition: { type: 'event', event: 'kickoff_completed' },
      },
      {
        order: 4,
        name: 'Training Session',
        type: 'training_session',
        channel: 'email',
        delayHours: 72,
        triggerCondition: { type: 'time_delay', delayHours: 72 },
      },
      {
        order: 5,
        name: 'Integration Setup',
        type: 'integration_setup',
        channel: 'email',
        delayHours: 120,
        triggerCondition: { type: 'event', event: 'training_completed' },
      },
      {
        order: 6,
        name: 'First Value Milestone',
        type: 'first_value',
        channel: 'email',
        delayHours: 168, // 7 days
        triggerCondition: { type: 'time_delay', delayHours: 168 },
      },
      {
        order: 7,
        name: 'Success Plan Review',
        type: 'success_plan',
        channel: 'email',
        delayHours: 336, // 14 days
        triggerCondition: { type: 'time_delay', delayHours: 336 },
      },
      {
        order: 8,
        name: '30-Day Review Call',
        type: 'review_call',
        channel: 'email',
        delayHours: 720, // 30 days
        triggerCondition: { type: 'time_delay', delayHours: 720 },
      },
    ],
    estimatedDays: 30,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template_enterprise',
    name: 'Enterprise Onboarding',
    description: 'High-touch enterprise onboarding with executive alignment',
    planTier: ['enterprise'],
    steps: [
      {
        order: 1,
        name: 'Executive Welcome',
        type: 'welcome_message',
        channel: 'email',
        delayHours: 0,
        content: 'welcome_enterprise',
      },
      {
        order: 2,
        name: 'Account Team Introduction',
        type: 'custom',
        channel: 'email',
        delayHours: 2,
        triggerCondition: { type: 'time_delay', delayHours: 2 },
      },
      {
        order: 3,
        name: 'Executive Alignment Call',
        type: 'kickoff_call',
        channel: 'email',
        delayHours: 24,
        triggerCondition: { type: 'time_delay', delayHours: 24 },
      },
      {
        order: 4,
        name: 'Technical Discovery',
        type: 'custom',
        channel: 'email',
        delayHours: 72,
        triggerCondition: { type: 'event', event: 'kickoff_completed' },
      },
      {
        order: 5,
        name: 'Implementation Planning',
        type: 'account_setup',
        channel: 'email',
        delayHours: 96,
        triggerCondition: { type: 'time_delay', delayHours: 96 },
      },
      {
        order: 6,
        name: 'Admin Training',
        type: 'training_session',
        channel: 'email',
        delayHours: 168, // 7 days
        triggerCondition: { type: 'time_delay', delayHours: 168 },
      },
      {
        order: 7,
        name: 'User Training Rollout',
        type: 'training_session',
        channel: 'email',
        delayHours: 240, // 10 days
        triggerCondition: { type: 'event', event: 'admin_training_completed' },
      },
      {
        order: 8,
        name: 'Integration & Migration',
        type: 'integration_setup',
        channel: 'email',
        delayHours: 336, // 14 days
        triggerCondition: { type: 'time_delay', delayHours: 336 },
      },
      {
        order: 9,
        name: 'Success Metrics Definition',
        type: 'success_plan',
        channel: 'email',
        delayHours: 504, // 21 days
        triggerCondition: { type: 'time_delay', delayHours: 504 },
      },
      {
        order: 10,
        name: 'Launch Verification',
        type: 'first_value',
        channel: 'email',
        delayHours: 672, // 28 days
        triggerCondition: { type: 'time_delay', delayHours: 672 },
      },
      {
        order: 11,
        name: '30-Day Executive Review',
        type: 'review_call',
        channel: 'email',
        delayHours: 720, // 30 days
        triggerCondition: { type: 'time_delay', delayHours: 720 },
      },
      {
        order: 12,
        name: '60-Day Success Review',
        type: 'review_call',
        channel: 'email',
        delayHours: 1440, // 60 days
        triggerCondition: { type: 'time_delay', delayHours: 1440 },
      },
    ],
    estimatedDays: 60,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Onboarding Sequence Manager
 */
export class OnboardingSequenceManager {
  private templates: Map<string, OnboardingTemplate> = new Map();
  private sequences: Map<string, OnboardingSequence> = new Map();

  constructor() {
    // Load default templates
    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Start onboarding sequence for a client
   */
  startOnboarding(client: ClientAccount, templateId?: string): OnboardingSequence {
    // Find appropriate template
    const template = templateId 
      ? this.templates.get(templateId)
      : this.findDefaultTemplate(client.planTier);

    if (!template) {
      throw new Error(`No onboarding template found for plan tier: ${client.planTier}`);
    }

    const now = new Date();
    const sequenceId = `onb_${Date.now()}_${client.id}`;

    // Create steps from template
    const steps: OnboardingStep[] = template.steps.map((step, index) => {
      const scheduledFor = new Date(now.getTime() + (step.delayHours || 0) * 60 * 60 * 1000);
      return {
        id: `step_${sequenceId}_${index + 1}`,
        order: step.order,
        name: step.name,
        type: step.type,
        status: index === 0 ? 'in_progress' : 'pending',
        triggerCondition: step.triggerCondition,
        delayHours: step.delayHours,
        content: step.content,
        channel: step.channel,
        scheduledFor,
      };
    });

    const sequence: OnboardingSequence = {
      id: sequenceId,
      clientId: client.id,
      templateId: template.id,
      status: 'active',
      currentStep: 1,
      steps,
      startedAt: now,
    };

    this.sequences.set(sequenceId, sequence);

    logger.info('Onboarding sequence started', {
      sequenceId,
      clientId: client.id,
      templateId: template.id,
      totalSteps: steps.length,
    });

    return sequence;
  }

  /**
   * Complete an onboarding step
   */
  completeStep(sequenceId: string, stepId: string, notes?: string): OnboardingSequence | null {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;

    const stepIndex = sequence.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;

    const step = sequence.steps[stepIndex];
    if (!step) return null;

    step.status = 'completed';
    step.completedAt = new Date();
    if (notes) step.notes = notes;

    // Advance to next step
    const nextStep = sequence.steps.find(s => s.status === 'pending');
    if (nextStep) {
      nextStep.status = 'in_progress';
      sequence.currentStep = nextStep.order;
    } else {
      // All steps completed
      sequence.status = 'completed';
      sequence.completedAt = new Date();
    }

    logger.info('Onboarding step completed', {
      sequenceId,
      stepId,
      stepName: step.name,
      isComplete: sequence.status === 'completed',
    });

    return sequence;
  }

  /**
   * Skip an onboarding step
   */
  skipStep(sequenceId: string, stepId: string, reason?: string): OnboardingSequence | null {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;

    const step = sequence.steps.find(s => s.id === stepId);
    if (!step) return null;

    step.status = 'skipped';
    step.notes = reason || 'Skipped';

    // Advance to next step
    const nextStep = sequence.steps.find(s => s.status === 'pending');
    if (nextStep) {
      nextStep.status = 'in_progress';
      sequence.currentStep = nextStep.order;
    }

    return sequence;
  }

  /**
   * Get onboarding sequence by ID
   */
  getSequence(sequenceId: string): OnboardingSequence | undefined {
    return this.sequences.get(sequenceId);
  }

  /**
   * Get onboarding sequence for client
   */
  getClientSequence(clientId: string): OnboardingSequence | undefined {
    return Array.from(this.sequences.values())
      .find(s => s.clientId === clientId && s.status === 'active');
  }

  /**
   * Get all active sequences
   */
  getActiveSequences(): OnboardingSequence[] {
    return Array.from(this.sequences.values())
      .filter(s => s.status === 'active');
  }

  /**
   * Get due steps across all sequences
   */
  getDueSteps(): Array<{ sequence: OnboardingSequence; step: OnboardingStep }> {
    const now = new Date();
    const dueSteps: Array<{ sequence: OnboardingSequence; step: OnboardingStep }> = [];

    for (const sequence of this.sequences.values()) {
      if (sequence.status !== 'active') continue;

      for (const step of sequence.steps) {
        if (step.status === 'in_progress' && step.scheduledFor && step.scheduledFor <= now) {
          dueSteps.push({ sequence, step });
        }
      }
    }

    return dueSteps.sort((a, b) => 
      (a.step.scheduledFor?.getTime() || 0) - (b.step.scheduledFor?.getTime() || 0)
    );
  }

  /**
   * Get onboarding progress for a client
   */
  getProgress(sequenceId: string): {
    completed: number;
    total: number;
    percentage: number;
    currentStepName: string;
    estimatedCompletion?: Date;
  } | null {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;

    const completed = sequence.steps.filter(s => 
      s.status === 'completed' || s.status === 'skipped'
    ).length;
    const total = sequence.steps.length;
    const percentage = Math.round((completed / total) * 100);

    const currentStep = sequence.steps.find(s => s.status === 'in_progress');
    const currentStepName = currentStep?.name || 'Complete';

    // Estimate completion based on remaining steps
    let estimatedCompletion: Date | undefined;
    const pendingSteps = sequence.steps.filter(s => 
      s.status === 'pending' || s.status === 'in_progress'
    );
    if (pendingSteps.length > 0) {
      const lastStep = pendingSteps[pendingSteps.length - 1];
      estimatedCompletion = lastStep?.scheduledFor;
    }

    return {
      completed,
      total,
      percentage,
      currentStepName,
      estimatedCompletion,
    };
  }

  /**
   * Pause onboarding
   */
  pauseOnboarding(sequenceId: string): OnboardingSequence | null {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;

    sequence.status = 'paused';
    logger.info('Onboarding paused', { sequenceId });
    return sequence;
  }

  /**
   * Resume onboarding
   */
  resumeOnboarding(sequenceId: string): OnboardingSequence | null {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence || sequence.status !== 'paused') return null;

    sequence.status = 'active';
    
    // Reschedule remaining steps from now
    const now = new Date();
    let delay = 0;
    for (const step of sequence.steps) {
      if (step && (step.status === 'pending' || step.status === 'in_progress')) {
        step.scheduledFor = new Date(now.getTime() + delay);
        delay += (step.delayHours ?? 24) * 60 * 60 * 1000;
      }
    }

    logger.info('Onboarding resumed', { sequenceId });
    return sequence;
  }

  /**
   * Add custom template
   */
  addTemplate(template: OnboardingTemplate): void {
    this.templates.set(template.id, template);
    logger.info('Template added', { templateId: template.id, name: template.name });
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): OnboardingTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): OnboardingTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Find default template for plan tier
   */
  private findDefaultTemplate(planTier: ClientAccount['planTier']): OnboardingTemplate | undefined {
    return Array.from(this.templates.values())
      .find(t => t.isDefault && t.planTier.includes(planTier));
  }

  /**
   * Get step action type for template generation
   */
  getStepActionDescription(type: OnboardingStepType): string {
    const descriptions: Record<OnboardingStepType, string> = {
      welcome_message: 'Send personalized welcome message',
      kickoff_call: 'Schedule and conduct kickoff call',
      account_setup: 'Verify account configuration',
      training_session: 'Conduct product training',
      feature_walkthrough: 'Walk through key features',
      integration_setup: 'Assist with integrations',
      success_plan: 'Define success criteria and plan',
      first_value: 'Verify first value achievement',
      check_in: 'Proactive check-in',
      review_call: 'Conduct progress review call',
      custom: 'Custom action',
    };
    return descriptions[type] ?? type;
  }
}

/**
 * Create onboarding sequence manager
 */
export function createOnboardingManager(): OnboardingSequenceManager {
  return new OnboardingSequenceManager();
}

