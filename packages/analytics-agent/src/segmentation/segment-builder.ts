/**
 * Segment Builder
 * 
 * Creates and manages customer segments based on various criteria.
 */

import { createLogger } from '@aibos/core';
import type {
  Segment,
  SegmentType,
  SegmentDefinition,
  SegmentRule,
  RFMCriteria,
  SegmentBuilderOptions,
} from './types';

const logger = createLogger('segmentation:builder');

// Predefined segment templates
export const SEGMENT_TEMPLATES: {
  name: string;
  description: string;
  type: SegmentType;
  definition: SegmentDefinition;
}[] = [
  // Value-based segments
  {
    name: 'High Value Customers',
    description: 'Customers in the top 20% by total spend',
    type: 'value',
    definition: {
      type: 'value',
      rules: [
        { field: 'total_spent_percentile', operator: 'gte', value: 80 },
      ],
    },
  },
  {
    name: 'Medium Value Customers',
    description: 'Customers between 40-80% by total spend',
    type: 'value',
    definition: {
      type: 'value',
      rules: [
        { field: 'total_spent_percentile', operator: 'between', value: [40, 80] },
      ],
    },
  },
  {
    name: 'Low Value Customers',
    description: 'Customers in the bottom 40% by total spend',
    type: 'value',
    definition: {
      type: 'value',
      rules: [
        { field: 'total_spent_percentile', operator: 'lt', value: 40 },
      ],
    },
  },
  // Lifecycle segments
  {
    name: 'New Customers',
    description: 'Customers acquired in the last 30 days',
    type: 'lifecycle',
    definition: {
      type: 'lifecycle',
      rules: [
        { field: 'days_since_first_purchase', operator: 'lte', value: 30 },
      ],
    },
  },
  {
    name: 'Active Customers',
    description: 'Customers with a purchase in the last 90 days',
    type: 'lifecycle',
    definition: {
      type: 'lifecycle',
      rules: [
        { field: 'days_since_last_purchase', operator: 'lte', value: 90 },
      ],
    },
  },
  {
    name: 'Lapsed Customers',
    description: 'Customers with no purchase in the last 180 days',
    type: 'lifecycle',
    definition: {
      type: 'lifecycle',
      rules: [
        { field: 'days_since_last_purchase', operator: 'between', value: [90, 180] },
      ],
    },
  },
  {
    name: 'Churned Customers',
    description: 'Customers with no purchase in over 180 days',
    type: 'lifecycle',
    definition: {
      type: 'lifecycle',
      rules: [
        { field: 'days_since_last_purchase', operator: 'gt', value: 180 },
      ],
    },
  },
  // Behavioral segments
  {
    name: 'Frequent Buyers',
    description: 'Customers with 5+ purchases',
    type: 'behavioral',
    definition: {
      type: 'behavioral',
      rules: [
        { field: 'order_count', operator: 'gte', value: 5 },
      ],
    },
  },
  {
    name: 'One-Time Buyers',
    description: 'Customers with exactly 1 purchase',
    type: 'behavioral',
    definition: {
      type: 'behavioral',
      rules: [
        { field: 'order_count', operator: 'eq', value: 1 },
      ],
    },
  },
  {
    name: 'Big Spenders',
    description: 'Customers with average order value > $200',
    type: 'behavioral',
    definition: {
      type: 'behavioral',
      rules: [
        { field: 'average_order_value', operator: 'gt', value: 200 },
      ],
    },
  },
  // RFM-based segments
  {
    name: 'VIP Customers',
    description: 'High recency, frequency, and monetary scores (RFM)',
    type: 'rfm',
    definition: {
      type: 'rfm',
      rfmCriteria: {
        recency: { min: 4 },
        frequency: { min: 4 },
        monetary: { min: 4 },
      },
    },
  },
  {
    name: 'At Risk VIPs',
    description: 'High value customers showing declining engagement',
    type: 'rfm',
    definition: {
      type: 'rfm',
      rfmCriteria: {
        recency: { max: 2 },
        monetary: { min: 4 },
      },
    },
  },
];

/**
 * Segment Builder class
 */
export class SegmentBuilder {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Create a segment from a template
   */
  createFromTemplate(templateName: string): Segment | null {
    const template = SEGMENT_TEMPLATES.find(
      (t) => t.name.toLowerCase() === templateName.toLowerCase()
    );

    if (!template) {
      logger.warn('Template not found', { templateName });
      return null;
    }

    const now = new Date();
    return {
      id: crypto.randomUUID(),
      workspaceId: this.workspaceId,
      name: template.name,
      description: template.description || null,
      type: template.type,
      definition: template.definition,
      customerCount: 0, // Will be calculated
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a custom segment
   */
  createCustomSegment(
    name: string,
    description: string | null,
    rules: SegmentRule[]
  ): Segment {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      workspaceId: this.workspaceId,
      name,
      description,
      type: 'custom',
      definition: {
        type: 'custom',
        rules,
      },
      customerCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create an RFM-based segment
   */
  createRFMSegment(
    name: string,
    description: string | null,
    criteria: RFMCriteria
  ): Segment {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      workspaceId: this.workspaceId,
      name,
      description,
      type: 'rfm',
      definition: {
        type: 'rfm',
        rfmCriteria: criteria,
      },
      customerCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Evaluate if a customer matches segment rules
   */
  evaluateRules(
    customerData: Record<string, unknown>,
    rules: SegmentRule[]
  ): boolean {
    for (const rule of rules) {
      const value = customerData[rule.field];
      
      if (!this.evaluateRule(value, rule)) {
        return false;
      }

      // Handle nested AND rules
      if (rule.and && rule.and.length > 0) {
        if (!this.evaluateRules(customerData, rule.and)) {
          return false;
        }
      }

      // Handle nested OR rules
      if (rule.or && rule.or.length > 0) {
        const orMatch = rule.or.some((r) => this.evaluateRule(customerData[r.field], r));
        if (!orMatch) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(value: unknown, rule: SegmentRule): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    const numValue = typeof value === 'number' ? value : parseFloat(String(value));

    switch (rule.operator) {
      case 'eq':
        return value === rule.value;
      case 'ne':
        return value !== rule.value;
      case 'gt':
        return numValue > (rule.value as number);
      case 'gte':
        return numValue >= (rule.value as number);
      case 'lt':
        return numValue < (rule.value as number);
      case 'lte':
        return numValue <= (rule.value as number);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'between':
        if (Array.isArray(rule.value) && rule.value.length === 2) {
          return numValue >= rule.value[0] && numValue <= rule.value[1];
        }
        return false;
      case 'contains':
        return typeof value === 'string' && value.includes(String(rule.value));
      default:
        return false;
    }
  }

  /**
   * Evaluate RFM criteria
   */
  evaluateRFMCriteria(
    rfmScores: { recency: number; frequency: number; monetary: number },
    criteria: RFMCriteria
  ): boolean {
    // Check recency
    if (criteria.recency) {
      if (criteria.recency.min && rfmScores.recency < criteria.recency.min) return false;
      if (criteria.recency.max && rfmScores.recency > criteria.recency.max) return false;
    }

    // Check frequency
    if (criteria.frequency) {
      if (criteria.frequency.min && rfmScores.frequency < criteria.frequency.min) return false;
      if (criteria.frequency.max && rfmScores.frequency > criteria.frequency.max) return false;
    }

    // Check monetary
    if (criteria.monetary) {
      if (criteria.monetary.min && rfmScores.monetary < criteria.monetary.min) return false;
      if (criteria.monetary.max && rfmScores.monetary > criteria.monetary.max) return false;
    }

    return true;
  }

  /**
   * Get all available templates
   */
  getTemplates(): typeof SEGMENT_TEMPLATES {
    return SEGMENT_TEMPLATES;
  }

  /**
   * Validate segment definition
   */
  validateDefinition(definition: SegmentDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!definition.type) {
      errors.push('Segment type is required');
    }

    if (definition.type === 'rfm' && !definition.rfmCriteria) {
      errors.push('RFM criteria is required for RFM segments');
    }

    if (definition.type === 'custom' && (!definition.rules || definition.rules.length === 0)) {
      errors.push('Rules are required for custom segments');
    }

    if (definition.rules) {
      for (const rule of definition.rules) {
        if (!rule.field) {
          errors.push('Rule field is required');
        }
        if (!rule.operator) {
          errors.push('Rule operator is required');
        }
        if (rule.value === undefined) {
          errors.push('Rule value is required');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export factory function
export function createSegmentBuilder(workspaceId: string): SegmentBuilder {
  return new SegmentBuilder(workspaceId);
}
