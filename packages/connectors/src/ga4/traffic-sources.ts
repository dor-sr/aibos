/**
 * GA4 Traffic Sources Sync
 */

import { createLogger, generateId } from '@aibos/core';
import { db, ga4TrafficSources, ga4Channels, ga4UserAcquisition } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { GA4Client } from './client';
import type { GA4SyncOptions, GA4Row } from './types';

const logger = createLogger('ga4:traffic-sources');

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
 * Generate unique ID for traffic source record
 */
function generateTrafficSourceId(
  workspaceId: string,
  propertyId: string,
  date: string,
  source: string,
  medium: string,
  campaign: string
): string {
  const key = `${workspaceId}:${propertyId}:${date}:${source}:${medium}:${campaign}`;
  return generateId(key);
}

/**
 * Sync GA4 traffic source data
 */
export async function syncGA4TrafficSources(
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

  logger.info('Syncing GA4 traffic sources', { workspaceId, propertyId, startDate, endDate });

  try {
    const response = await client.getTrafficSources(startDate, endDate);
    
    if (!response.rows || response.rows.length === 0) {
      logger.info('No traffic source data found', { workspaceId, propertyId });
      return 0;
    }

    const dimensionNames = response.dimensionHeaders.map(h => h.name);
    const metricNames = response.metricHeaders.map(h => h.name);

    let processedCount = 0;

    for (const row of response.rows) {
      const data = parseGA4Row(row, dimensionNames, metricNames);
      const dateStr = getDateOrFallback(data);
      
      const trafficSourceId = generateTrafficSourceId(
        workspaceId,
        propertyId,
        dateStr,
        data.sessionSource || '(direct)',
        data.sessionMedium || '(none)',
        data.sessionCampaignName || ''
      );

      const trafficSourceData = {
        id: trafficSourceId,
        workspaceId,
        connectorId,
        propertyId,
        date: dateStr,
        sessionSource: data.sessionSource || '(direct)',
        sessionMedium: data.sessionMedium || '(none)',
        sessionCampaign: data.sessionCampaignName || null,
        sessions: parseInt(data.sessions || '0', 10),
        newUsers: parseInt(data.newUsers || '0', 10),
        totalUsers: parseInt(data.totalUsers || '0', 10),
        engagedSessions: parseInt(data.engagedSessions || '0', 10),
        bounceRate: parseFloat(data.bounceRate || '0'),
        conversions: parseInt(data.conversions || '0', 10),
        totalRevenue: parseFloat(data.totalRevenue || '0'),
        updatedAt: new Date(),
      };

      // Upsert the traffic source record
      await db
        .insert(ga4TrafficSources)
        .values({
          ...trafficSourceData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ga4TrafficSources.id,
          set: trafficSourceData,
        });

      processedCount++;
    }

    logger.info('GA4 traffic sources sync completed', {
      workspaceId,
      propertyId,
      processedCount,
    });

    return processedCount;
  } catch (error) {
    logger.error('Failed to sync GA4 traffic sources', error as Error);
    throw error;
  }
}

/**
 * Generate unique ID for channel record
 */
function generateChannelId(
  workspaceId: string,
  propertyId: string,
  date: string,
  channelGroup: string
): string {
  const key = `${workspaceId}:${propertyId}:${date}:${channelGroup}`;
  return generateId(key);
}

/**
 * Sync GA4 channel performance data
 */
export async function syncGA4Channels(
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

  logger.info('Syncing GA4 channels', { workspaceId, propertyId, startDate, endDate });

  try {
    const response = await client.getChannelPerformance(startDate, endDate);
    
    if (!response.rows || response.rows.length === 0) {
      logger.info('No channel data found', { workspaceId, propertyId });
      return 0;
    }

    const dimensionNames = response.dimensionHeaders.map(h => h.name);
    const metricNames = response.metricHeaders.map(h => h.name);

    let processedCount = 0;

    for (const row of response.rows) {
      const data = parseGA4Row(row, dimensionNames, metricNames);
      const dateStr = getDateOrFallback(data);
      
      const channelId = generateChannelId(
        workspaceId,
        propertyId,
        dateStr,
        data.sessionDefaultChannelGroup || 'Unassigned'
      );

      const channelData = {
        id: channelId,
        workspaceId,
        connectorId,
        propertyId,
        date: dateStr,
        channelGroup: data.sessionDefaultChannelGroup || 'Unassigned',
        sessions: parseInt(data.sessions || '0', 10),
        newUsers: parseInt(data.newUsers || '0', 10),
        totalUsers: parseInt(data.totalUsers || '0', 10),
        engagementRate: parseFloat(data.engagementRate || '0'),
        bounceRate: parseFloat(data.bounceRate || '0'),
        conversions: parseInt(data.conversions || '0', 10),
        totalRevenue: parseFloat(data.totalRevenue || '0'),
        updatedAt: new Date(),
      };

      // Upsert the channel record
      await db
        .insert(ga4Channels)
        .values({
          ...channelData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ga4Channels.id,
          set: channelData,
        });

      processedCount++;
    }

    logger.info('GA4 channels sync completed', {
      workspaceId,
      propertyId,
      processedCount,
    });

    return processedCount;
  } catch (error) {
    logger.error('Failed to sync GA4 channels', error as Error);
    throw error;
  }
}

/**
 * Generate unique ID for user acquisition record
 */
function generateUserAcquisitionId(
  workspaceId: string,
  propertyId: string,
  date: string,
  source: string,
  medium: string,
  campaign: string
): string {
  const key = `acq:${workspaceId}:${propertyId}:${date}:${source}:${medium}:${campaign}`;
  return generateId(key);
}

/**
 * Sync GA4 user acquisition data (first-touch attribution)
 */
export async function syncGA4UserAcquisition(
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

  logger.info('Syncing GA4 user acquisition', { workspaceId, propertyId, startDate, endDate });

  try {
    const response = await client.getUserAcquisition(startDate, endDate);
    
    if (!response.rows || response.rows.length === 0) {
      logger.info('No user acquisition data found', { workspaceId, propertyId });
      return 0;
    }

    const dimensionNames = response.dimensionHeaders.map(h => h.name);
    const metricNames = response.metricHeaders.map(h => h.name);

    let processedCount = 0;

    for (const row of response.rows) {
      const data = parseGA4Row(row, dimensionNames, metricNames);
      const dateStr = getDateOrFallback(data);
      
      const acquisitionId = generateUserAcquisitionId(
        workspaceId,
        propertyId,
        dateStr,
        data.firstUserSource || '(direct)',
        data.firstUserMedium || '(none)',
        data.firstUserCampaignName || ''
      );

      const acquisitionData = {
        id: acquisitionId,
        workspaceId,
        connectorId,
        propertyId,
        date: dateStr,
        firstUserSource: data.firstUserSource || '(direct)',
        firstUserMedium: data.firstUserMedium || '(none)',
        firstUserCampaign: data.firstUserCampaignName || null,
        newUsers: parseInt(data.newUsers || '0', 10),
        totalUsers: parseInt(data.totalUsers || '0', 10),
        sessions: parseInt(data.sessions || '0', 10),
        engagedSessions: parseInt(data.engagedSessions || '0', 10),
        totalRevenue: parseFloat(data.totalRevenue || '0'),
        updatedAt: new Date(),
      };

      // Upsert the user acquisition record
      await db
        .insert(ga4UserAcquisition)
        .values({
          ...acquisitionData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ga4UserAcquisition.id,
          set: acquisitionData,
        });

      processedCount++;
    }

    logger.info('GA4 user acquisition sync completed', {
      workspaceId,
      propertyId,
      processedCount,
    });

    return processedCount;
  } catch (error) {
    logger.error('Failed to sync GA4 user acquisition', error as Error);
    throw error;
  }
}



