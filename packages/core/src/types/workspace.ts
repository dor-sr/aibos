import type { Timestamps, CurrencyCode } from './common';
import type { VerticalType } from './vertical';

/**
 * Workspace represents a single business on the platform
 */
export interface Workspace extends Timestamps {
  id: string;
  name: string;
  slug: string;
  verticalType: VerticalType;
  currency: CurrencyCode;
  timezone: string;
  settings: WorkspaceSettings;
  activeAgents: AgentType[];
  plan: PlanType;
  status: WorkspaceStatus;
}

/**
 * Workspace settings
 */
export interface WorkspaceSettings {
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  fiscalYearStartMonth: number; // 1-12
  reportingEmail?: string;
  slackWebhook?: string;
}

/**
 * Available agent types
 */
export type AgentType = 'analytics' | 'marketing' | 'commerce_ops';

/**
 * Subscription plan types
 */
export type PlanType = 'free' | 'starter' | 'growth' | 'enterprise';

/**
 * Workspace status
 */
export type WorkspaceStatus = 'active' | 'suspended' | 'churned';

/**
 * Workspace creation input
 */
export interface CreateWorkspaceInput {
  name: string;
  verticalType: VerticalType;
  currency?: CurrencyCode;
  timezone?: string;
}

/**
 * Workspace update input
 */
export interface UpdateWorkspaceInput {
  name?: string;
  currency?: CurrencyCode;
  timezone?: string;
  settings?: Partial<WorkspaceSettings>;
}






