import type { DateRange, TimePeriod } from '../types/common';

/**
 * Get a date range for a given time period
 */
export function getDateRangeForPeriod(period: TimePeriod, referenceDate: Date = new Date()): DateRange {
  const now = new Date(referenceDate);
  now.setHours(23, 59, 59, 999);

  const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  switch (period) {
    case 'today': {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    }

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    }

    case 'last_7_days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }

    case 'last_30_days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }

    case 'last_90_days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 89);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }

    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3, 0);
      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }

    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    case 'custom':
    default: {
      // Return last 30 days as default
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }
  }
}

/**
 * Get the previous period for comparison
 */
export function getPreviousPeriod(range: DateRange): DateRange {
  const duration = range.end.getTime() - range.start.getTime();
  const previousEnd = new Date(range.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);

  return {
    start: previousStart,
    end: previousEnd,
  };
}

/**
 * Format a date for display
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options ?? defaultOptions);
}

/**
 * Format a date range for display
 */
export function formatDateRange(range: DateRange): string {
  return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}

/**
 * Get number of days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}




