/**
 * GA4 Conversions Sync
 */

import { createLogger, generateId } from '@aibos/core';
import { db, ga4Conversions } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { GA4Client } from './client';
import type { GA4SyncOptions, GA4Row } from './types';

const logger = createLogger('ga4:conversions');

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
 * Generate unique ID for conversion record
 */
function generateConversionId(
  workspaceId: string,
  propertyId: string,
  date: string,
  eventName: string,
  source: string,
  medium: string,
  landingPage: string,
  country: string,
  device: string
): string {
  const key = `conv:${workspaceId}:${propertyId}:${date}:${eventName}:${source}:${medium}:${landingPage}:${country}:${device}`;
  return generateId(key);
}

/**
 * Sync GA4 conversion data
 */
export async function syncGA4Conversions(
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

  logger.info('Syncing GA4 conversions', { workspaceId, propertyId, startDate, endDate });

  try {
    const response = await client.getConversions(startDate, endDate);
    
    if (!response.rows || response.rows.length === 0) {
      logger.info('No conversion data found', { workspaceId, propertyId });
      return 0;
    }

    const dimensionNames = response.dimensionHeaders.map(h => h.name);
    const metricNames = response.metricHeaders.map(h => h.name);

    let processedCount = 0;

    for (const row of response.rows) {
      const data = parseGA4Row(row, dimensionNames, metricNames);
      const dateStr = getDateOrFallback(data);
      
      const conversionId = generateConversionId(
        workspaceId,
        propertyId,
        dateStr,
        data.eventName || '',
        data.sessionSource || '',
        data.sessionMedium || '',
        data.landingPage || '',
        data.country || '',
        data.deviceCategory || ''
      );

      const conversionData = {
        id: conversionId,
        workspaceId,
        connectorId,
        propertyId,
        date: dateStr,
        eventName: data.eventName || '',
        sessionSource: data.sessionSource || null,
        sessionMedium: data.sessionMedium || null,
        landingPage: data.landingPage || null,
        country: data.country || null,
        deviceCategory: data.deviceCategory || null,
        conversions: parseInt(data.conversions || '0', 10),
        totalRevenue: parseFloat(data.totalRevenue || '0'),
        updatedAt: new Date(),
      };

      // Upsert the conversion record
      await db
        .insert(ga4Conversions)
        .values({
          ...conversionData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ga4Conversions.id,
          set: conversionData,
        });

      processedCount++;
    }

    logger.info('GA4 conversions sync completed', {
      workspaceId,
      propertyId,
      processedCount,
    });

    return processedCount;
  } catch (error) {
    logger.error('Failed to sync GA4 conversions', error as Error);
    throw error;
  }
}

/**
 * List of common conversion events in GA4
 */
export const GA4_CONVERSION_EVENTS = [
  'purchase',           // Ecommerce purchase
  'sign_up',            // User registration
  'generate_lead',      // Lead form submission
  'add_to_cart',        // Item added to cart
  'begin_checkout',     // Checkout started
  'add_payment_info',   // Payment info added
  'complete_registration', // Registration completed
  'subscribe',          // Newsletter/service subscription
  'first_open',         // First app open
  'in_app_purchase',    // In-app purchase
] as const;

export type GA4ConversionEvent = typeof GA4_CONVERSION_EVENTS[number];


