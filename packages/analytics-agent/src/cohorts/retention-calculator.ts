/**
 * Retention Calculator
 * 
 * Calculates retention curves and retention metrics for cohorts.
 * Note: Database operations use stubs - implement with actual queries in production.
 */

import { createLogger } from '@aibos/core';
import type {
  Cohort,
  CohortCustomer,
  RetentionPeriod,
  RetentionCurve,
  RetentionMatrix,
  RetentionCalculationOptions,
  CohortGranularity,
} from './types';

const logger = createLogger('cohorts:retention');

/**
 * Retention Calculator class
 */
export class RetentionCalculator {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Calculate retention curve for a cohort
   */
  async calculateRetentionCurve(
    cohort: Cohort,
    customers: CohortCustomer[],
    options: RetentionCalculationOptions = {}
  ): Promise<RetentionCurve> {
    const { maxPeriods = 12 } = options;

    const periods: RetentionPeriod[] = [];
    const totalCustomers = customers.length;

    if (totalCustomers === 0) {
      return {
        cohortId: cohort.id,
        cohortName: cohort.name,
        cohortStartDate: cohort.startDate,
        customerCount: 0,
        periods: [],
      };
    }

    // Generate retention periods
    for (let period = 0; period <= maxPeriods; period++) {
      const periodStart = this.getPeriodStartDate(cohort.startDate, period, cohort.definition?.granularity || 'month');
      
      if (periodStart > new Date()) {
        break;
      }

      // Stub: Calculate based on customer data (in production, query DB)
      const decayFactor = Math.pow(0.85, period); // 15% decay per period
      const activeCustomers = Math.round(totalCustomers * decayFactor);
      const retentionRate = (activeCustomers / totalCustomers) * 100;
      const revenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0) * decayFactor / maxPeriods;

      periods.push({
        period,
        periodLabel: `Month ${period}`,
        activeCustomers,
        totalCustomers,
        retentionRate,
        revenue,
        orders: Math.round(activeCustomers * 0.5),
        averageOrderValue: activeCustomers > 0 ? revenue / Math.max(1, activeCustomers * 0.5) : 0,
        cumulativeLtv: revenue * (period + 1),
      });
    }

    logger.debug('Retention curve calculated', {
      cohortId: cohort.id,
      periods: periods.length,
    });

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      cohortStartDate: cohort.startDate,
      customerCount: totalCustomers,
      periods,
    };
  }

  /**
   * Calculate retention matrix for multiple cohorts
   */
  async calculateRetentionMatrix(
    cohorts: Cohort[],
    customersByCohort: Map<string, CohortCustomer[]>,
    options: RetentionCalculationOptions = {}
  ): Promise<RetentionMatrix> {
    const { maxPeriods = 12 } = options;

    const cohortRetentions: RetentionMatrix['cohorts'] = [];
    const periodLabels = Array.from({ length: maxPeriods + 1 }, (_, i) => `Month ${i}`);

    for (const cohort of cohorts) {
      const customers = customersByCohort.get(cohort.id) || [];
      const curve = await this.calculateRetentionCurve(cohort, customers, options);

      cohortRetentions.push({
        name: cohort.name,
        startDate: cohort.startDate,
        customerCount: cohort.customerCount,
        retentionByPeriod: curve.periods.map((p) => p.retentionRate),
      });
    }

    const averageRetention = this.calculateAverageRetention(cohortRetentions, maxPeriods + 1);

    return {
      cohorts: cohortRetentions,
      periodLabels,
      averageRetention,
    };
  }

  /**
   * Calculate average retention across cohorts
   */
  private calculateAverageRetention(
    cohorts: RetentionMatrix['cohorts'],
    periodCount: number
  ): number[] {
    const averages: number[] = [];

    for (let i = 0; i < periodCount; i++) {
      const values = cohorts
        .map((c) => c.retentionByPeriod[i])
        .filter((v): v is number => v !== undefined && !isNaN(v));

      if (values.length > 0) {
        averages.push(values.reduce((a, b) => a + b, 0) / values.length);
      } else {
        averages.push(0);
      }
    }

    return averages;
  }

  /**
   * Get period start date
   */
  private getPeriodStartDate(
    cohortStart: Date,
    period: number,
    granularity: CohortGranularity
  ): Date {
    const date = new Date(cohortStart);
    
    switch (granularity) {
      case 'day':
        date.setDate(date.getDate() + period);
        break;
      case 'week':
        date.setDate(date.getDate() + period * 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + period);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() + period * 3);
        break;
    }

    return date;
  }

  /**
   * Calculate retention benchmarks
   */
  calculateBenchmarks(matrix: RetentionMatrix): {
    day30Retention: number;
    day60Retention: number;
    day90Retention: number;
    averageRetention: number;
    bestCohort: string;
    worstCohort: string;
  } {
    const avgRetention = matrix.averageRetention;

    let bestCohort = '';
    let worstCohort = '';
    let bestAvg = 0;
    let worstAvg = 100;

    for (const cohort of matrix.cohorts) {
      const rates = cohort.retentionByPeriod.filter((r): r is number => r !== undefined && !isNaN(r));
      if (rates.length === 0) continue;

      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      
      if (avg > bestAvg) {
        bestAvg = avg;
        bestCohort = cohort.name;
      }
      if (avg < worstAvg) {
        worstAvg = avg;
        worstCohort = cohort.name;
      }
    }

    return {
      day30Retention: avgRetention[1] || 0,
      day60Retention: avgRetention[2] || 0,
      day90Retention: avgRetention[3] || 0,
      averageRetention: avgRetention.length > 0
        ? avgRetention.reduce((a, b) => a + b, 0) / avgRetention.length
        : 0,
      bestCohort,
      worstCohort,
    };
  }
}

// Export factory function
export function createRetentionCalculator(workspaceId: string): RetentionCalculator {
  return new RetentionCalculator(workspaceId);
}
