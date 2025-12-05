/**
 * LTV Calculator
 * 
 * Calculates Customer Lifetime Value based on cohort analysis.
 */

import { createLogger } from '@aibos/core';
import type {
  Cohort,
  CohortCustomer,
  RetentionCurve,
  LTVCalculation,
} from './types';

const logger = createLogger('cohorts:ltv');

export type LTVMethod = 'historical' | 'predictive' | 'cohort_based';

export interface LTVCalculatorOptions {
  method?: LTVMethod;
  projectionMonths?: number;
  discountRate?: number;
  churnRate?: number;
}

const DEFAULT_OPTIONS: LTVCalculatorOptions = {
  method: 'cohort_based',
  projectionMonths: 24,
  discountRate: 0.1,
};

/**
 * LTV Calculator class
 */
export class LTVCalculator {
  private options: LTVCalculatorOptions;

  constructor(options: LTVCalculatorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Calculate LTV for a cohort
   */
  calculateCohortLTV(
    cohort: Cohort,
    customers: CohortCustomer[],
    retentionCurve?: RetentionCurve
  ): LTVCalculation {
    if (customers.length === 0) {
      return this.emptyLTVCalculation(cohort);
    }

    const historicalLtvs = customers.map((c) => c.totalRevenue);
    historicalLtvs.sort((a, b) => a - b);

    const averageLtv = this.calculateAverage(historicalLtvs);
    const medianLtv = this.calculateMedian(historicalLtvs);
    const ltvDistribution = this.calculateDistribution(historicalLtvs);
    const ltvByPeriod = this.calculateLtvByPeriod(retentionCurve);

    let projectedLtv: number | undefined;
    if (retentionCurve && retentionCurve.periods.length > 3) {
      projectedLtv = this.projectFutureLTV(retentionCurve, this.options.projectionMonths || 24);
    }

    logger.debug('LTV calculated', {
      cohortId: cohort.id,
      averageLtv,
      medianLtv,
      projectedLtv,
    });

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      customerCount: customers.length,
      averageLtv,
      medianLtv,
      ltvDistribution,
      ltvByPeriod,
      projectedLtv,
    };
  }

  /**
   * Calculate average LTV across multiple cohorts
   */
  calculateAverageLTVAcrossCohorts(
    calculations: LTVCalculation[]
  ): {
    weightedAverageLtv: number;
    simpleAverageLtv: number;
    totalCustomers: number;
    bestCohortLtv: { cohort: string; ltv: number };
    worstCohortLtv: { cohort: string; ltv: number };
  } {
    if (calculations.length === 0) {
      return {
        weightedAverageLtv: 0,
        simpleAverageLtv: 0,
        totalCustomers: 0,
        bestCohortLtv: { cohort: '', ltv: 0 },
        worstCohortLtv: { cohort: '', ltv: 0 },
      };
    }

    let totalValue = 0;
    let totalCustomers = 0;
    let ltvSum = 0;

    for (const calc of calculations) {
      totalValue += calc.averageLtv * calc.customerCount;
      totalCustomers += calc.customerCount;
      ltvSum += calc.averageLtv;
    }

    const weightedAverageLtv = totalCustomers > 0 ? totalValue / totalCustomers : 0;
    const simpleAverageLtv = ltvSum / calculations.length;

    const sorted = [...calculations].sort((a, b) => b.averageLtv - a.averageLtv);
    const best = sorted[0] || { cohortName: '', averageLtv: 0 };
    const worst = sorted[sorted.length - 1] || { cohortName: '', averageLtv: 0 };

    return {
      weightedAverageLtv,
      simpleAverageLtv,
      totalCustomers,
      bestCohortLtv: { cohort: best.cohortName, ltv: best.averageLtv },
      worstCohortLtv: { cohort: worst.cohortName, ltv: worst.averageLtv },
    };
  }

  /**
   * Calculate LTV to CAC ratio
   */
  calculateLTVtoCAC(averageLtv: number, cac: number): {
    ratio: number;
    assessment: 'excellent' | 'good' | 'acceptable' | 'poor';
    recommendation: string;
  } {
    if (cac <= 0) {
      return {
        ratio: 0,
        assessment: 'poor',
        recommendation: 'Unable to calculate - CAC data missing or invalid.',
      };
    }

    const ratio = averageLtv / cac;

    let assessment: 'excellent' | 'good' | 'acceptable' | 'poor';
    let recommendation: string;

    if (ratio >= 5) {
      assessment = 'excellent';
      recommendation = 'Excellent unit economics. Consider scaling acquisition spend.';
    } else if (ratio >= 3) {
      assessment = 'good';
      recommendation = 'Healthy unit economics. Continue optimizing both LTV and CAC.';
    } else if (ratio >= 1) {
      assessment = 'acceptable';
      recommendation = 'Marginal unit economics. Focus on improving retention or reducing CAC.';
    } else {
      assessment = 'poor';
      recommendation = 'Unsustainable unit economics. Urgently review acquisition strategy and retention.';
    }

    return { ratio, assessment, recommendation };
  }

  /**
   * Project future LTV based on retention patterns
   */
  private projectFutureLTV(retentionCurve: RetentionCurve, months: number): number {
    const periods = retentionCurve.periods;
    if (periods.length < 3) {
      return periods[periods.length - 1]?.cumulativeLtv || 0;
    }

    const recentPeriods = periods.slice(-3);
    let avgMonthlyValue = 0;
    for (let i = 1; i < recentPeriods.length; i++) {
      const curr = recentPeriods[i];
      const prev = recentPeriods[i - 1];
      if (curr && prev) {
        avgMonthlyValue += curr.cumulativeLtv - prev.cumulativeLtv;
      }
    }
    avgMonthlyValue /= (recentPeriods.length - 1);

    const retentionDecay = this.calculateRetentionDecay(periods);
    
    let projectedLtv = periods[periods.length - 1]?.cumulativeLtv || 0;
    let currentRetention = (periods[periods.length - 1]?.retentionRate || 100) / 100;
    const monthlyDiscountRate = (this.options.discountRate || 0.1) / 12;

    for (let m = periods.length; m < months; m++) {
      currentRetention *= (1 - retentionDecay);
      const discountFactor = Math.pow(1 + monthlyDiscountRate, -m);
      projectedLtv += avgMonthlyValue * currentRetention * discountFactor;
    }

    return projectedLtv;
  }

  /**
   * Calculate retention decay rate
   */
  private calculateRetentionDecay(periods: RetentionCurve['periods']): number {
    if (periods.length < 2) return 0.1;

    let totalDecay = 0;
    let decayCount = 0;

    for (let i = 1; i < periods.length; i++) {
      const prev = periods[i - 1];
      const curr = periods[i];
      
      if (prev && curr && prev.retentionRate > 0) {
        const decay = (prev.retentionRate - curr.retentionRate) / prev.retentionRate;
        if (decay > 0) {
          totalDecay += decay;
          decayCount++;
        }
      }
    }

    return decayCount > 0 ? totalDecay / decayCount : 0.1;
  }

  /**
   * Calculate LTV by period from retention curve
   */
  private calculateLtvByPeriod(retentionCurve?: RetentionCurve): LTVCalculation['ltvByPeriod'] {
    if (!retentionCurve || retentionCurve.periods.length === 0) {
      return [];
    }

    return retentionCurve.periods.map((period, index) => ({
      period: period.period,
      cumulativeLtv: period.cumulativeLtv,
      incrementalLtv: index === 0 
        ? period.cumulativeLtv 
        : period.cumulativeLtv - (retentionCurve.periods[index - 1]?.cumulativeLtv || 0),
    }));
  }

  /**
   * Calculate distribution percentiles
   */
  private calculateDistribution(values: number[]): { percentile: number; value: number }[] {
    const sorted = [...values].sort((a, b) => a - b);
    const percentiles = [10, 25, 50, 75, 90, 95, 99];
    
    return percentiles.map((p) => ({
      percentile: p,
      value: this.getPercentile(sorted, p),
    }));
  }

  /**
   * Get percentile value
   */
  private getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))] || 0;
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate median
   */
  private calculateMedian(sorted: number[]): number {
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid] || 0
      : ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2;
  }

  /**
   * Create empty LTV calculation
   */
  private emptyLTVCalculation(cohort: Cohort): LTVCalculation {
    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      customerCount: 0,
      averageLtv: 0,
      medianLtv: 0,
      ltvDistribution: [],
      ltvByPeriod: [],
    };
  }
}

// Export factory function
export function createLTVCalculator(options?: LTVCalculatorOptions): LTVCalculator {
  return new LTVCalculator(options);
}
