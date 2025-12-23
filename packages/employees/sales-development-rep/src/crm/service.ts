/**
 * CRM Integration Service
 * 
 * Manages CRM synchronization and activity logging.
 */

import { createLogger } from '@aibos/core';
import type {
  Lead,
  CRMConfig,
  CRMProvider,
  CRMFieldMapping,
  CRMActivity,
  CRMActivityType,
  CRMSyncResult,
  CRMSyncError,
  LeadStatus,
} from '../types';

const logger = createLogger('sdr:crm');

// ============================================
// DEFAULT FIELD MAPPINGS
// ============================================

const DEFAULT_FIELD_MAPPINGS: CRMFieldMapping[] = [
  { localField: 'email', crmField: 'Email', syncDirection: 'both' },
  { localField: 'name', crmField: 'Name', syncDirection: 'both' },
  { localField: 'firstName', crmField: 'FirstName', syncDirection: 'both' },
  { localField: 'lastName', crmField: 'LastName', syncDirection: 'both' },
  { localField: 'company', crmField: 'Company', syncDirection: 'both' },
  { localField: 'title', crmField: 'Title', syncDirection: 'both' },
  { localField: 'phone', crmField: 'Phone', syncDirection: 'both' },
  { localField: 'status', crmField: 'Status', syncDirection: 'to_crm' },
  { localField: 'source', crmField: 'LeadSource', syncDirection: 'both' },
  { localField: 'industry', crmField: 'Industry', syncDirection: 'both' },
  { localField: 'qualificationScore', crmField: 'Rating', syncDirection: 'to_crm', transform: 'custom' },
];

// ============================================
// CRM SERVICE CLASS
// ============================================

export interface CRMServiceConfig {
  provider: CRMProvider;
  apiKey?: string;
  apiUrl?: string;
  fieldMappings: CRMFieldMapping[];
  syncFrequencyMinutes: number;
  autoCreateLead: boolean;
  autoUpdateLead: boolean;
  autoLogActivities: boolean;
}

export class CRMService {
  private config: CRMServiceConfig;
  private activities: Map<string, CRMActivity> = new Map();
  private leadCRMMapping: Map<string, string> = new Map(); // leadId -> crmLeadId
  private lastSyncAt?: Date;
  private pendingSync: Array<{ type: 'lead' | 'activity'; data: unknown }> = [];

  constructor(config?: Partial<CRMServiceConfig>) {
    this.config = {
      provider: 'hubspot',
      fieldMappings: DEFAULT_FIELD_MAPPINGS,
      syncFrequencyMinutes: 5,
      autoCreateLead: true,
      autoUpdateLead: true,
      autoLogActivities: true,
      ...config,
    };
  }

  // ============================================
  // LEAD SYNC
  // ============================================

  /**
   * Sync lead to CRM
   */
  async syncLeadToCRM(lead: Lead): Promise<{
    success: boolean;
    crmLeadId?: string;
    error?: string;
  }> {
    try {
      // Map local fields to CRM fields
      const crmData = this.mapLeadToCRM(lead);

      // Check if lead already exists in CRM
      const existingCRMId = this.leadCRMMapping.get(lead.id);

      if (existingCRMId) {
        // Update existing lead
        await this.updateCRMLead(existingCRMId, crmData);
        
        logger.info('Lead updated in CRM', {
          leadId: lead.id,
          crmLeadId: existingCRMId,
        });

        return { success: true, crmLeadId: existingCRMId };
      } else if (this.config.autoCreateLead) {
        // Create new lead
        const crmLeadId = await this.createCRMLead(crmData);
        this.leadCRMMapping.set(lead.id, crmLeadId);

        logger.info('Lead created in CRM', {
          leadId: lead.id,
          crmLeadId,
        });

        return { success: true, crmLeadId };
      }

      return { success: false, error: 'Lead creation disabled' };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error('CRM sync failed', err, { leadId: lead.id });

      return { success: false, error: err.message };
    }
  }

  /**
   * Pull lead from CRM
   */
  async pullLeadFromCRM(crmLeadId: string): Promise<Partial<Lead> | null> {
    try {
      // In real implementation, would call CRM API
      // For now, simulate pulling data
      const crmData = await this.getCRMLead(crmLeadId);
      if (!crmData) return null;

      // Map CRM fields to local fields
      return this.mapCRMToLead(crmData);
    } catch (error) {
      logger.error(
        'Failed to pull lead from CRM',
        error instanceof Error ? error : new Error(String(error)),
        { crmLeadId }
      );
      return null;
    }
  }

  /**
   * Map lead to CRM format
   */
  private mapLeadToCRM(lead: Lead): Record<string, unknown> {
    const crmData: Record<string, unknown> = {};

    for (const mapping of this.config.fieldMappings) {
      if (mapping.syncDirection === 'from_crm') continue;

      const value = (lead as unknown as Record<string, unknown>)[mapping.localField];
      if (value === undefined || value === null) continue;

      // Apply transform
      let transformedValue: unknown = value;
      if (mapping.transform) {
        transformedValue = this.applyTransform(value, mapping.transform, mapping.localField);
      }

      crmData[mapping.crmField] = transformedValue;
    }

    return crmData;
  }

  /**
   * Map CRM data to lead format
   */
  private mapCRMToLead(crmData: Record<string, unknown>): Partial<Lead> {
    const leadData: Record<string, unknown> = {};

    for (const mapping of this.config.fieldMappings) {
      if (mapping.syncDirection === 'to_crm') continue;

      const value = crmData[mapping.crmField];
      if (value === undefined || value === null) continue;

      leadData[mapping.localField] = value;
    }

    return leadData as Partial<Lead>;
  }

  /**
   * Apply field transform
   */
  private applyTransform(
    value: unknown,
    transform: CRMFieldMapping['transform'],
    fieldName: string
  ): unknown {
    switch (transform) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'capitalize':
        return typeof value === 'string' 
          ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          : value;
      case 'custom':
        return this.applyCustomTransform(value, fieldName);
      default:
        return value;
    }
  }

  /**
   * Apply custom transform based on field
   */
  private applyCustomTransform(value: unknown, fieldName: string): unknown {
    if (fieldName === 'qualificationScore') {
      // Convert score to CRM rating
      const score = Number(value);
      if (score >= 80) return 'Hot';
      if (score >= 60) return 'Warm';
      if (score >= 40) return 'Cold';
      return 'Unknown';
    }

    return value;
  }

  // ============================================
  // CRM API SIMULATION
  // ============================================

  /**
   * Create lead in CRM (simulated)
   */
  private async createCRMLead(data: Record<string, unknown>): Promise<string> {
    // In real implementation, would call CRM API
    const crmLeadId = `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return crmLeadId;
  }

  /**
   * Update lead in CRM (simulated)
   */
  private async updateCRMLead(crmLeadId: string, data: Record<string, unknown>): Promise<void> {
    // In real implementation, would call CRM API
  }

  /**
   * Get lead from CRM (simulated)
   */
  private async getCRMLead(crmLeadId: string): Promise<Record<string, unknown> | null> {
    // In real implementation, would call CRM API
    return null;
  }

  // ============================================
  // ACTIVITY LOGGING
  // ============================================

  /**
   * Log activity to CRM
   */
  async logActivity(
    leadId: string,
    type: CRMActivityType,
    details: {
      subject: string;
      description?: string;
      channel?: string;
      direction?: 'inbound' | 'outbound';
      duration?: number;
    }
  ): Promise<CRMActivity> {
    const id = `activity_${Date.now()}_${leadId}`;
    const now = new Date();
    const crmLeadId = this.leadCRMMapping.get(leadId);

    const activity: CRMActivity = {
      id,
      leadId,
      crmLeadId,
      type,
      subject: details.subject,
      description: details.description,
      channel: details.channel as CRMActivity['channel'],
      direction: details.direction,
      duration: details.duration,
      status: 'completed',
      completedAt: now,
      syncedToCRM: false,
      createdAt: now,
    };

    this.activities.set(id, activity);

    // Auto sync if enabled
    if (this.config.autoLogActivities && crmLeadId) {
      await this.syncActivityToCRM(activity);
    }

    logger.info('Activity logged', {
      activityId: id,
      leadId,
      type,
    });

    return activity;
  }

  /**
   * Sync activity to CRM
   */
  private async syncActivityToCRM(activity: CRMActivity): Promise<void> {
    if (!activity.crmLeadId) {
      activity.syncError = 'No CRM lead ID';
      return;
    }

    try {
      // In real implementation, would call CRM API
      const crmActivityId = await this.createCRMActivity(activity);
      
      activity.syncedToCRM = true;
      activity.crmActivityId = crmActivityId;
      activity.syncedAt = new Date();

      logger.info('Activity synced to CRM', {
        activityId: activity.id,
        crmActivityId,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      activity.syncError = err.message;
      
      logger.error('Activity sync failed', err, { activityId: activity.id });
    }
  }

  /**
   * Create activity in CRM (simulated)
   */
  private async createCRMActivity(activity: CRMActivity): Promise<string> {
    // In real implementation, would call CRM API
    return `crm_activity_${Date.now()}`;
  }

  /**
   * Get activities for lead
   */
  getLeadActivities(leadId: string): CRMActivity[] {
    return Array.from(this.activities.values())
      .filter(a => a.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ============================================
  // BULK SYNC
  // ============================================

  /**
   * Perform bulk sync
   */
  async bulkSync(leads: Lead[]): Promise<CRMSyncResult> {
    const result: CRMSyncResult = {
      success: true,
      syncedLeads: 0,
      syncedActivities: 0,
      errors: [],
      syncedAt: new Date(),
    };

    // Sync leads
    for (const lead of leads) {
      const syncResult = await this.syncLeadToCRM(lead);
      
      if (syncResult.success) {
        result.syncedLeads++;
      } else {
        result.errors.push({
          entityType: 'lead',
          entityId: lead.id,
          error: syncResult.error || 'Unknown error',
          retryable: true,
        });
      }
    }

    // Sync pending activities
    const pendingActivities = Array.from(this.activities.values())
      .filter(a => !a.syncedToCRM && a.crmLeadId);

    for (const activity of pendingActivities) {
      try {
        await this.syncActivityToCRM(activity);
        result.syncedActivities++;
      } catch (error) {
        result.errors.push({
          entityType: 'activity',
          entityId: activity.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        });
      }
    }

    result.success = result.errors.length === 0;
    this.lastSyncAt = result.syncedAt;

    logger.info('Bulk sync completed', {
      syncedLeads: result.syncedLeads,
      syncedActivities: result.syncedActivities,
      errors: result.errors.length,
    });

    return result;
  }

  // ============================================
  // STATUS MAPPING
  // ============================================

  /**
   * Map local status to CRM status
   */
  mapStatusToCRM(status: LeadStatus): string {
    const statusMap: Record<LeadStatus, string> = {
      new: 'New',
      contacted: 'Contacted',
      engaged: 'Engaged',
      qualified: 'Qualified',
      meeting_scheduled: 'Meeting Scheduled',
      meeting_completed: 'Meeting Completed',
      converted: 'Converted',
      disqualified: 'Disqualified',
      nurture: 'Nurture',
      recycled: 'Recycled',
      closed_lost: 'Closed Lost',
    };

    return statusMap[status] || 'Unknown';
  }

  /**
   * Map CRM status to local status
   */
  mapStatusFromCRM(crmStatus: string): LeadStatus {
    const statusMap: Record<string, LeadStatus> = {
      'New': 'new',
      'Contacted': 'contacted',
      'Engaged': 'engaged',
      'Qualified': 'qualified',
      'Meeting Scheduled': 'meeting_scheduled',
      'Meeting Completed': 'meeting_completed',
      'Converted': 'converted',
      'Disqualified': 'disqualified',
      'Nurture': 'nurture',
      'Recycled': 'recycled',
      'Closed Lost': 'closed_lost',
    };

    return statusMap[crmStatus] || 'new';
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Get CRM configuration
   */
  getConfig(): CRMServiceConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CRMServiceConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('CRM config updated', { updates: Object.keys(updates) });
  }

  /**
   * Add field mapping
   */
  addFieldMapping(mapping: CRMFieldMapping): void {
    const existingIndex = this.config.fieldMappings.findIndex(
      m => m.localField === mapping.localField
    );

    if (existingIndex >= 0) {
      this.config.fieldMappings[existingIndex] = mapping;
    } else {
      this.config.fieldMappings.push(mapping);
    }
  }

  /**
   * Remove field mapping
   */
  removeFieldMapping(localField: string): boolean {
    const index = this.config.fieldMappings.findIndex(
      m => m.localField === localField
    );

    if (index >= 0) {
      this.config.fieldMappings.splice(index, 1);
      return true;
    }

    return false;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get sync statistics
   */
  getStats(): {
    provider: CRMProvider;
    lastSyncAt?: Date;
    totalLeadsSynced: number;
    totalActivitiesSynced: number;
    pendingActivities: number;
    syncErrors: number;
  } {
    const activities = Array.from(this.activities.values());

    return {
      provider: this.config.provider,
      lastSyncAt: this.lastSyncAt,
      totalLeadsSynced: this.leadCRMMapping.size,
      totalActivitiesSynced: activities.filter(a => a.syncedToCRM).length,
      pendingActivities: activities.filter(a => !a.syncedToCRM && !a.syncError).length,
      syncErrors: activities.filter(a => a.syncError).length,
    };
  }

  /**
   * Get CRM lead ID for local lead
   */
  getCRMLeadId(leadId: string): string | undefined {
    return this.leadCRMMapping.get(leadId);
  }

  /**
   * Set CRM lead ID mapping
   */
  setCRMLeadId(leadId: string, crmLeadId: string): void {
    this.leadCRMMapping.set(leadId, crmLeadId);
  }
}

/**
 * Create CRM service
 */
export function createCRMService(config?: Partial<CRMServiceConfig>): CRMService {
  return new CRMService(config);
}

