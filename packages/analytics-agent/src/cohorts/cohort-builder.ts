/**
 * Cohort Builder
 * 
 * Builds cohorts based on acquisition date, first purchase, or custom criteria.
 * Note: Database operations use stubs - implement with actual queries in production.
 */

import { createLogger } from '@aibos/core';
import type {
  Cohort,
  CohortType,
  CohortGranularity,
  CohortBuilderOptions,
  CohortCustomer,
} from './types';

const logger = createLogger('cohorts:builder');

/**
 * Cohort Builder class
 */
export class CohortBuilder {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Build cohorts for a date range
   */
  async buildCohorts(options: CohortBuilderOptions): Promise<Cohort[]> {
    const {
      type,
      granularity,
      startDate = this.getDefaultStartDate(granularity),
      endDate = new Date(),
      lookbackPeriods = 12,
    } = options;

    const cohorts: Cohort[] = [];
    const periods = this.generatePeriods(startDate, endDate, granularity, lookbackPeriods);

    for (const period of periods) {
      const cohort = await this.buildCohort(type, period.start, period.end, granularity);
      if (cohort.customerCount > 0) {
        cohorts.push(cohort);
      }
    }

    logger.info('Cohorts built', {
      workspaceId: this.workspaceId,
      type,
      granularity,
      count: cohorts.length,
    });

    return cohorts;
  }

  /**
   * Build a single cohort for a specific period
   */
  async buildCohort(
    type: CohortType,
    startDate: Date,
    endDate: Date,
    granularity: CohortGranularity
  ): Promise<Cohort> {
    const id = crypto.randomUUID();
    const name = this.generateCohortName(startDate, granularity);

    // Stub: In production, query actual customer count from database
    const customerCount = 0;

    const now = new Date();
    return {
      id,
      workspaceId: this.workspaceId,
      name,
      type,
      startDate,
      endDate,
      customerCount,
      definition: {
        type,
        dateField: this.getDateField(type),
        startDate,
        endDate,
        granularity,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get customers in a cohort
   * Stub implementation - returns empty array
   */
  async getCohortCustomers(
    _type: CohortType,
    _startDate: Date,
    _endDate: Date
  ): Promise<CohortCustomer[]> {
    // Stub: In production, query actual customers from database
    return [];
  }

  /**
   * Generate period boundaries for cohort building
   */
  private generatePeriods(
    startDate: Date,
    endDate: Date,
    granularity: CohortGranularity,
    maxPeriods: number
  ): { start: Date; end: Date }[] {
    const periods: { start: Date; end: Date }[] = [];
    let current = new Date(startDate);

    while (current < endDate && periods.length < maxPeriods) {
      const periodEnd = this.getNextPeriodStart(current, granularity);
      periodEnd.setMilliseconds(periodEnd.getMilliseconds() - 1);

      periods.push({
        start: new Date(current),
        end: new Date(Math.min(periodEnd.getTime(), endDate.getTime())),
      });

      current = this.getNextPeriodStart(current, granularity);
    }

    return periods;
  }

  /**
   * Get the start of the next period
   */
  private getNextPeriodStart(date: Date, granularity: CohortGranularity): Date {
    const next = new Date(date);
    switch (granularity) {
      case 'day':
        next.setDate(next.getDate() + 1);
        break;
      case 'week':
        next.setDate(next.getDate() + 7);
        break;
      case 'month':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarter':
        next.setMonth(next.getMonth() + 3);
        break;
    }
    return next;
  }

  /**
   * Generate cohort name from date
   */
  private generateCohortName(date: Date, granularity: CohortGranularity): string {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (granularity) {
      case 'day':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        break;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `Week ${weekNum}, ${date.getFullYear()}`;
      case 'month':
        options.year = 'numeric';
        options.month = 'long';
        break;
      case 'quarter':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `Q${quarter} ${date.getFullYear()}`;
    }

    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get week number of year
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get default start date based on granularity
   */
  private getDefaultStartDate(granularity: CohortGranularity): Date {
    const now = new Date();
    switch (granularity) {
      case 'day':
        now.setDate(now.getDate() - 30);
        break;
      case 'week':
        now.setDate(now.getDate() - 84);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 12);
        break;
      case 'quarter':
        now.setMonth(now.getMonth() - 24);
        break;
    }
    now.setHours(0, 0, 0, 0);
    return now;
  }

  /**
   * Get date field for cohort type
   */
  private getDateField(type: CohortType): string {
    switch (type) {
      case 'acquisition':
        return 'created_at';
      case 'first_purchase':
        return 'first_order_at';
      case 'subscription_start':
        return 'source_created_at';
      default:
        return 'created_at';
    }
  }
}

// Export factory function
export function createCohortBuilder(workspaceId: string): CohortBuilder {
  return new CohortBuilder(workspaceId);
}
