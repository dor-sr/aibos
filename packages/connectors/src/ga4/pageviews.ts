/**
 * GA4 Pageviews Sync
 */

import { createLogger, generateId } from '@aibos/core';
import { db, ga4Pageviews } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { GA4Client } from './client';
import type { GA4SyncOptions, GA4Row } from './types';

const logger = createLogger('ga4:pageviews');

/**
 * Format date for GA4 API (YYYY-MM-DD)
 */
function formatDateForGA4(date: Date): string {
  const isoDate = date.toISOString().split('T')[0];
  return isoDate ?? '';
}

/**
 * Get default date range (last 30 days)
 */
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  return {
    startDate: formatDateForGA4(startDate),
    endDate: formatDateForGA4(endDate),
  };
}

/**
 * Parse GA4 row to extract dimension and metric values
 */
function parseGA4Row(row: GA4Row, dimensionNames: string[], metricNames: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  
  dimensionNames.forEach((name, index) => {
    result[name] = row.dimensionValues[index]?.value ?? '';
  });
  
  metricNames.forEach((name, index) => {
    result[name] = row.metricValues[index]?.value ?? '0';
  });
  
  return result;
}

/**
 * Get date from data, with fallback to today
 */
function getDateOrFallback(data: Record<string, string>): string {
  const dateStr = data['date'] || data.date;
  if (dateStr && dateStr.length >= 8) {
    // Format YYYYMMDD to YYYY-MM-DD if needed
    if (dateStr.length === 8 && !dateStr.includes('-')) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  }
  return formatDateForGA4(new Date());
}

/**
 * Generate unique ID for pageview record
 */
function generatePageviewId(
  workspaceId: string,
  propertyId: string,
  date: string,
  pagePath: string
): string {
  const key = `${workspaceId}:${propertyId}:${date}:${pagePath}`;
  return generateId(key);
}

/**
 * Sync GA4 pageview data
 */
export async function syncGA4Pageviews(
  client: GA4Client,
  workspaceId: string,
  connectorId: string,
  options: GA4SyncOptions = {}
): Promise<number> {
  const propertyId = client.getPropertyId();
  const { startDate, endDate } = options.startDate && options.endDate
    ? {
        startDate: formatDateForGA4(options.startDate),
        endDate: formatDateForGA4(options.endDate),
      }
    : getDefaultDateRange();

  logger.info('Syncing GA4 pageviews', { workspaceId, propertyId, startDate, endDate });

  try {
    const response = await client.getPageviews(startDate, endDate);
    
    if (!response.rows || response.rows.length === 0) {
      logger.info('No pageview data found', { workspaceId, propertyId });
      return 0;
    }

    const dimensionNames = response.dimensionHeaders.map(h => h.name);
    const metricNames = response.metricHeaders.map(h => h.name);

    let processedCount = 0;

    for (const row of response.rows) {
      const data = parseGA4Row(row, dimensionNames, metricNames);
      const dateStr = getDateOrFallback(data);
      
      const pageviewId = generatePageviewId(
        workspaceId,
        propertyId,
        dateStr,
        data.pagePath || ''
      );

      const pageviewData = {
        id: pageviewId,
        workspaceId,
        connectorId,
        propertyId,
        date: dateStr,
        pagePath: data.pagePath || '',
        pageTitle: data.pageTitle || null,
        screenPageViews: parseInt(data.screenPageViews || '0', 10),
        activeUsers: parseInt(data.activeUsers || '0', 10),
        averageSessionDuration: parseFloat(data.averageSessionDuration || '0'),
        engagementRate: parseFloat(data.engagementRate || '0'),
        bounceRate: parseFloat(data.bounceRate || '0'),
        updatedAt: new Date(),
      };

      // Upsert the pageview record
      await db
        .insert(ga4Pageviews)
        .values({
          ...pageviewData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ga4Pageviews.id,
          set: pageviewData,
        });

      processedCount++;
    }

    logger.info('GA4 pageviews sync completed', {
      workspaceId,
      propertyId,
      processedCount,
    });

    return processedCount;
  } catch (error) {
    logger.error('Failed to sync GA4 pageviews', error as Error);
    throw error;
  }
}




