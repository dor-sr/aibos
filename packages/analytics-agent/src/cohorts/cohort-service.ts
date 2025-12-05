/**
 * Cohort Service
 * 
 * Main service for cohort analysis that combines building,
 * retention calculation, and LTV analysis.
 * Note: Database operations use stubs - implement with actual queries in production.
 */

import { createLogger } from '@aibos/core';
import type {
  Cohort,
  CohortCustomer,
  CohortType,
  CohortGranularity,
  RetentionCurve,
  RetentionMatrix,
  LTVCalculation,
  CohortComparison,
} from './types';
import { CohortBuilder, createCohortBuilder } from './cohort-builder';
import { RetentionCalculator, createRetentionCalculator } from './retention-calculator';
import { LTVCalculator, createLTVCalculator } from './ltv-calculator';

const logger = createLogger('cohorts:service');

export interface CohortAnalysisResult {
  cohorts: Cohort[];
  retentionMatrix: RetentionMatrix;
  ltvAnalysis: {
    byCohort: LTVCalculation[];
    overall: {
      weightedAverageLtv: number;
      simpleAverageLtv: number;
      totalCustomers: number;
      bestCohortLtv: { cohort: string; ltv: number };
      worstCohortLtv: { cohort: string; ltv: number };
    };
  };
  comparison: CohortComparison;
  benchmarks: {
    day30Retention: number;
    day60Retention: number;
    day90Retention: number;
    averageRetention: number;
    bestCohort: string;
    worstCohort: string;
  };
}

/**
 * Cohort Service class
 */
export class CohortService {
  private workspaceId: string;
  private builder: CohortBuilder;
  private retentionCalculator: RetentionCalculator;
  private ltvCalculator: LTVCalculator;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.builder = createCohortBuilder(workspaceId);
    this.retentionCalculator = createRetentionCalculator(workspaceId);
    this.ltvCalculator = createLTVCalculator();
  }

  /**
   * Run full cohort analysis
   */
  async runAnalysis(options: {
    type?: CohortType;
    granularity?: CohortGranularity;
    startDate?: Date;
    endDate?: Date;
    maxPeriods?: number;
  } = {}): Promise<CohortAnalysisResult> {
    const {
      type = 'first_purchase',
      granularity = 'month',
      startDate,
      endDate,
      maxPeriods = 12,
    } = options;

    logger.info('Running cohort analysis', {
      workspaceId: this.workspaceId,
      type,
      granularity,
    });

    // Build cohorts
    const cohortsData = await this.builder.buildCohorts({
      workspaceId: this.workspaceId,
      type,
      granularity,
      startDate,
      endDate,
      lookbackPeriods: maxPeriods,
    });

    // Get customers for each cohort (stub - returns empty arrays)
    const customersByCohort = new Map<string, CohortCustomer[]>();
    for (const cohort of cohortsData) {
      const customers = await this.builder.getCohortCustomers(
        type,
        cohort.startDate,
        cohort.endDate
      );
      customersByCohort.set(cohort.id, customers);
    }

    // Calculate retention matrix
    const retentionMatrix = await this.retentionCalculator.calculateRetentionMatrix(
      cohortsData,
      customersByCohort,
      { maxPeriods }
    );

    // Calculate LTV for each cohort
    const ltvByCohort: LTVCalculation[] = [];
    for (const cohort of cohortsData) {
      const customers = customersByCohort.get(cohort.id) || [];
      const curve = await this.retentionCalculator.calculateRetentionCurve(
        cohort,
        customers,
        { maxPeriods }
      );
      const ltv = this.ltvCalculator.calculateCohortLTV(cohort, customers, curve);
      ltvByCohort.push(ltv);
    }

    // Calculate overall LTV
    const overallLtv = this.ltvCalculator.calculateAverageLTVAcrossCohorts(ltvByCohort);

    // Calculate benchmarks
    const benchmarks = this.retentionCalculator.calculateBenchmarks(retentionMatrix);

    // Generate comparison
    const comparison = this.generateComparison(cohortsData, retentionMatrix, ltvByCohort);

    logger.info('Cohort analysis complete', {
      workspaceId: this.workspaceId,
      cohortCount: cohortsData.length,
    });

    return {
      cohorts: cohortsData,
      retentionMatrix,
      ltvAnalysis: {
        byCohort: ltvByCohort,
        overall: overallLtv,
      },
      comparison,
      benchmarks,
    };
  }

  /**
   * Get saved cohorts for workspace (stub)
   */
  async getSavedCohorts(): Promise<Cohort[]> {
    return [];
  }

  /**
   * Get cohort by ID (stub)
   */
  async getCohort(_cohortId: string): Promise<Cohort | null> {
    return null;
  }

  /**
   * Get retention curve for a saved cohort (stub)
   */
  async getCohortRetentionCurve(_cohortId: string): Promise<RetentionCurve | null> {
    return null;
  }

  /**
   * Generate cohort comparison
   */
  private generateComparison(
    cohortsData: Cohort[],
    retentionMatrix: RetentionMatrix,
    ltvByCohort: LTVCalculation[]
  ): CohortComparison {
    const cohortData = cohortsData.map((cohort, index) => {
      const retention = retentionMatrix.cohorts[index]?.retentionByPeriod || [];
      const ltv = ltvByCohort[index];

      return {
        id: cohort.id,
        name: cohort.name,
        customerCount: cohort.customerCount,
        averageLtv: ltv?.averageLtv || 0,
        retentionAt30Days: retention[1] || 0,
        retentionAt60Days: retention[2] || 0,
        retentionAt90Days: retention[3] || 0,
      };
    });

    const sorted = [...cohortData].sort((a, b) => b.averageLtv - a.averageLtv);
    const bestPerforming = sorted[0]?.name || '';
    const worstPerforming = sorted[sorted.length - 1]?.name || '';

    const insights = this.generateInsights(cohortData, retentionMatrix);

    return {
      cohorts: cohortData,
      bestPerforming,
      worstPerforming,
      insights,
    };
  }

  /**
   * Generate insights from cohort data
   */
  private generateInsights(
    cohortData: CohortComparison['cohorts'],
    retentionMatrix: RetentionMatrix
  ): string[] {
    const insights: string[] = [];

    if (cohortData.length < 2) {
      return ['Not enough cohorts for comparison analysis.'];
    }

    const sorted = [...cohortData].sort((a, b) => b.averageLtv - a.averageLtv);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best && worst && best.averageLtv > 0 && worst.averageLtv > 0) {
      const diff = ((best.averageLtv - worst.averageLtv) / worst.averageLtv) * 100;
      insights.push(
        `${best.name} customers have ${diff.toFixed(0)}% higher LTV than ${worst.name} customers.`
      );
    }

    const avgRetention = retentionMatrix.averageRetention;
    if (avgRetention.length > 3) {
      const early = avgRetention[1];
      const late = avgRetention[3];
      if (early && late && early > 0) {
        const dropoff = early - late;
        if (dropoff > 20) {
          insights.push(
            `Significant retention drop-off of ${dropoff.toFixed(0)}% between months 1 and 3. Focus on early engagement.`
          );
        } else if (late > 60) {
          insights.push(
            `Strong 90-day retention at ${late.toFixed(0)}%. Product-market fit indicators are positive.`
          );
        }
      }
    }

    return insights.length > 0 ? insights : ['Analysis complete. No significant patterns detected.'];
  }
}

// Export factory function
export function createCohortService(workspaceId: string): CohortService {
  return new CohortService(workspaceId);
}

/**
 * Quick helper to run cohort analysis
 */
export async function runCohortAnalysis(
  workspaceId: string,
  options?: {
    type?: CohortType;
    granularity?: CohortGranularity;
  }
): Promise<CohortAnalysisResult> {
  const service = createCohortService(workspaceId);
  return service.runAnalysis(options);
}
