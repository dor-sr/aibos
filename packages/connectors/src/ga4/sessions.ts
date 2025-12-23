/**
 * GA4 Sessions Sync
 */

import { createLogger, generateId } from '@aibos/core';
import { db, ga4Sessions } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { GA4Client } from './client';
import type { GA4SyncOptions, GA4Row } from './types';

const logger = createLogger('ga4:sessions');

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
 * Generate unique ID for session record
 */
function generateSessionId(
  workspaceId: string,
  propertyId: string,
  date: string,
  country: string,
  city: string,
  deviceCategory: string,
  browser: string,
  os: string
): string {
  const key = `${workspaceId}:${propertyId}:${date}:${country}:${city}:${deviceCategory}:${browser}:${os}`;
  return generateId(key);
}

/**
 * Sync GA4 sessions data
 */
export async function syncGA4Sessions(
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

  logger.info('Syncing GA4 sessions', { workspaceId, propertyId, startDate, endDate });

  try {
    const response = await client.getSessions(startDate, endDate);
    
    if (!response.rows || response.rows.length === 0) {
      logger.info('No session data found', { workspaceId, propertyId });
      return 0;
    }

    const dimensionNames = response.dimensionHeaders.map(h => h.name);
    const metricNames = response.metricHeaders.map(h => h.name);

    let processedCount = 0;

    for (const row of response.rows) {
      const data = parseGA4Row(row, dimensionNames, metricNames);
      const dateStr = getDateOrFallback(data);
      
      const sessionId = generateSessionId(
        workspaceId,
        propertyId,
        dateStr,
        data.country || '',
        data.city || '',
        data.deviceCategory || '',
        data.browser || '',
        data.operatingSystem || ''
      );

      const sessionData = {
        id: sessionId,
        workspaceId,
        connectorId,
        propertyId,
        date: dateStr,
        country: data.country || null,
        city: data.city || null,
        deviceCategory: data.deviceCategory || null,
        browser: data.browser || null,
        operatingSystem: data.operatingSystem || null,
        sessions: parseInt(data.sessions || '0', 10),
        engagedSessions: parseInt(data.engagedSessions || '0', 10),
        engagementRate: parseFloat(data.engagementRate || '0'),
        averageSessionDuration: parseFloat(data.averageSessionDuration || '0'),
        bounceRate: parseFloat(data.bounceRate || '0'),
        screenPageViews: parseInt(data.screenPageViews || '0', 10),
        updatedAt: new Date(),
      };

      // Upsert the session record
      await db
        .insert(ga4Sessions)
        .values({
          ...sessionData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ga4Sessions.id,
          set: sessionData,
        });

      processedCount++;
    }

    logger.info('GA4 sessions sync completed', {
      workspaceId,
      propertyId,
      processedCount,
    });

    return processedCount;
  } catch (error) {
    logger.error('Failed to sync GA4 sessions', error as Error);
    throw error;
  }
}






