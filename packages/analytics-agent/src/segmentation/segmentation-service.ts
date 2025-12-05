/**
 * Segmentation Service
 * 
 * Main service for customer segmentation that combines RFM analysis,
 * custom segments, and segment management.
 * Note: Database operations use stubs - implement with actual queries in production.
 */

import { createLogger } from '@aibos/core';
import type {
  Segment,
  SegmentType,
  SegmentDefinition,
  RFMAnalysisResult,
  CustomerRFM,
  SegmentComparison,
} from './types';
import { RFMCalculator, createRFMCalculator, CustomerData } from './rfm-calculator';
import { SegmentBuilder, createSegmentBuilder } from './segment-builder';

const logger = createLogger('segmentation:service');

export interface SegmentationResult {
  rfmAnalysis?: RFMAnalysisResult;
  segments: Segment[];
  comparison?: SegmentComparison;
}

/**
 * Segmentation Service class
 */
export class SegmentationService {
  private workspaceId: string;
  private rfmCalculator: RFMCalculator;
  private segmentBuilder: SegmentBuilder;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.rfmCalculator = createRFMCalculator();
    this.segmentBuilder = createSegmentBuilder(workspaceId);
  }

  /**
   * Run RFM segmentation analysis
   */
  async runRFMAnalysis(): Promise<RFMAnalysisResult> {
    logger.info('Running RFM analysis', { workspaceId: this.workspaceId });

    // Stub: In production, fetch actual customer data from database
    const customers: CustomerData[] = [];

    const result = this.rfmCalculator.analyze(customers);

    logger.info('RFM analysis complete', {
      workspaceId: this.workspaceId,
      customerCount: result.customerCount,
      segmentCount: result.segmentDistribution.length,
    });

    return result;
  }

  /**
   * Create a new segment
   */
  async createSegment(
    name: string,
    type: SegmentType,
    definition: SegmentDefinition,
    description?: string
  ): Promise<Segment> {
    const id = crypto.randomUUID();
    const now = new Date();

    const segment: Segment = {
      id,
      workspaceId: this.workspaceId,
      name,
      type,
      description: description || null,
      definition,
      customerCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Stub: In production, save to database

    logger.info('Segment created', {
      segmentId: id,
      name,
      type,
    });

    return segment;
  }

  /**
   * Get segment by ID
   */
  async getSegment(_segmentId: string): Promise<Segment | null> {
    // Stub: In production, fetch from database
    return null;
  }

  /**
   * Update segment
   */
  async updateSegment(
    segmentId: string,
    updates: {
      name?: string;
      description?: string;
      definition?: SegmentDefinition;
      isActive?: boolean;
    }
  ): Promise<Segment | null> {
    // Stub: In production, update in database
    logger.info('Segment updated', { segmentId, updates });
    return null;
  }

  /**
   * Delete segment
   */
  async deleteSegment(segmentId: string): Promise<boolean> {
    // Stub: In production, delete from database
    logger.info('Segment deleted', { segmentId });
    return true;
  }

  /**
   * Get all segments for workspace
   */
  async getSegments(): Promise<Segment[]> {
    // Stub: In production, fetch from database
    return [];
  }

  /**
   * Get customers in a segment
   */
  async getSegmentCustomers(_segmentId: string): Promise<CustomerRFM[]> {
    // Stub: In production, fetch from database with segment filter
    return [];
  }

  /**
   * Recalculate segment membership
   */
  async recalculateSegmentMembership(_segmentId: string): Promise<{
    added: number;
    removed: number;
    total: number;
  }> {
    // Stub: In production, recalculate based on segment rules
    return { added: 0, removed: 0, total: 0 };
  }

  /**
   * Compare two segments
   */
  async compareSegments(
    segmentId1: string,
    segmentId2: string
  ): Promise<SegmentComparison | null> {
    const segment1 = await this.getSegment(segmentId1);
    const segment2 = await this.getSegment(segmentId2);

    if (!segment1 || !segment2) {
      return null;
    }

    const customers1 = await this.getSegmentCustomers(segmentId1);
    const customers2 = await this.getSegmentCustomers(segmentId2);

    return this.generateComparison(segment1, segment2, customers1, customers2);
  }

  /**
   * Get segment from template
   */
  async createSegmentFromTemplate(templateName: string): Promise<Segment | null> {
    const template = this.segmentBuilder.getTemplates().find((t) => t.name === templateName);
    
    if (!template) {
      logger.warn('Template not found', { templateName });
      return null;
    }

    return this.createSegment(
      template.name,
      template.type,
      template.definition,
      template.description
    );
  }

  /**
   * Get available segment templates
   */
  getSegmentTemplates(): {
    name: string;
    type: SegmentType;
    description?: string;
    definition: SegmentDefinition;
  }[] {
    return this.segmentBuilder.getTemplates();
  }

  /**
   * Generate segment comparison
   */
  private generateComparison(
    segment1: Segment,
    segment2: Segment,
    customers1: CustomerRFM[],
    customers2: CustomerRFM[]
  ): SegmentComparison {
    const metrics1 = this.calculateSegmentMetrics(customers1);
    const metrics2 = this.calculateSegmentMetrics(customers2);

    return {
      segments: [
        {
          id: segment1.id,
          name: segment1.name,
          customerCount: customers1.length,
          metrics: metrics1,
        },
        {
          id: segment2.id,
          name: segment2.name,
          customerCount: customers2.length,
          metrics: metrics2,
        },
      ],
      differences: {
        customerCount: customers2.length - customers1.length,
        avgLtv: metrics2.avgLtv - metrics1.avgLtv,
        avgFrequency: metrics2.avgFrequency - metrics1.avgFrequency,
        avgRecency: metrics2.avgRecency - metrics1.avgRecency,
      },
      insights: this.generateComparisonInsights(segment1, segment2, metrics1, metrics2),
    };
  }

  /**
   * Calculate segment metrics from customers
   */
  private calculateSegmentMetrics(customers: CustomerRFM[]): {
    avgLtv: number;
    avgFrequency: number;
    avgRecency: number;
    totalRevenue: number;
  } {
    if (customers.length === 0) {
      return { avgLtv: 0, avgFrequency: 0, avgRecency: 0, totalRevenue: 0 };
    }

    const totalRevenue = customers.reduce((sum, c) => sum + c.monetary, 0);
    const totalFrequency = customers.reduce((sum, c) => sum + c.frequency, 0);
    const totalRecency = customers.reduce((sum, c) => sum + c.recencyDays, 0);

    return {
      avgLtv: totalRevenue / customers.length,
      avgFrequency: totalFrequency / customers.length,
      avgRecency: totalRecency / customers.length,
      totalRevenue,
    };
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(
    segment1: Segment,
    segment2: Segment,
    metrics1: ReturnType<typeof this.calculateSegmentMetrics>,
    metrics2: ReturnType<typeof this.calculateSegmentMetrics>
  ): string[] {
    const insights: string[] = [];

    if (metrics1.avgLtv > 0 && metrics2.avgLtv > 0) {
      const highestLtv = metrics1.avgLtv > metrics2.avgLtv ? segment1 : segment2;
      const lowestLtv = metrics1.avgLtv > metrics2.avgLtv ? segment2 : segment1;
      const diff = Math.abs(metrics1.avgLtv - metrics2.avgLtv) / Math.min(metrics1.avgLtv, metrics2.avgLtv) * 100;

      if (diff > 20) {
        insights.push(
          `${highestLtv.name} has ${diff.toFixed(0)}% higher LTV than ${lowestLtv.name}.`
        );
      }
    }

    if (metrics1.avgRecency !== metrics2.avgRecency) {
      const moreRecent = metrics1.avgRecency < metrics2.avgRecency ? segment1.name : segment2.name;
      insights.push(`${moreRecent} customers are more recently active.`);
    }

    return insights.length > 0 ? insights : ['Segments are relatively similar in key metrics.'];
  }
}

// Export factory function
export function createSegmentationService(workspaceId: string): SegmentationService {
  return new SegmentationService(workspaceId);
}

/**
 * Quick helper for RFM analysis
 */
export async function runRFMSegmentation(workspaceId: string): Promise<RFMAnalysisResult> {
  const service = createSegmentationService(workspaceId);
  return service.runRFMAnalysis();
}
