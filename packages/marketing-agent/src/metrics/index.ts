/**
 * Marketing Metrics Module
 */

import { createLogger } from '@aibos/core';
import { db } from '@aibos/data-model';
import { adPerformance, adCampaigns, adAccounts } from '@aibos/data-model';
import { eq, and, gte, lte, sql, desc, sum } from 'drizzle-orm';
import type {
  MarketingChannel,
  ChannelPerformance,
  CampaignPerformance,
  MarketingMetricsSummary,
} from '../types';

const logger = createLogger('marketing-agent:metrics');

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

/**
 * Get date range for period
 */
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '14d':
      start.setDate(end.getDate() - 14);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case 'mtd':
      start.setDate(1);
      break;
    case 'qtd':
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      break;
    case 'ytd':
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }

  return { start, end };
}

/**
 * Get previous period date range for comparison
 */
function getPreviousPeriodRange(period: string): { start: Date; end: Date } {
  const { start: currentStart, end: currentEnd } = getDateRange(period);
  const duration = currentEnd.getTime() - currentStart.getTime();

  const end = new Date(currentStart.getTime() - 1);
  const start = new Date(end.getTime() - duration);

  return { start, end };
}

/**
 * Get overall marketing metrics summary
 */
export async function getMarketingMetricsSummary(
  workspaceId: string,
  period = '30d'
): Promise<MarketingMetricsSummary> {
  const { start, end } = getDateRange(period);
  const previous = getPreviousPeriodRange(period);

  logger.debug('Getting marketing metrics summary', { workspaceId, period, start, end });

  // Current period metrics
  const currentMetrics = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(${adPerformance.spend}::numeric), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${adPerformance.conversionValue}::numeric), 0)`,
      totalConversions: sql<number>`COALESCE(SUM(${adPerformance.conversions}), 0)`,
      totalImpressions: sql<number>`COALESCE(SUM(${adPerformance.impressions}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${adPerformance.clicks}), 0)`,
    })
    .from(adPerformance)
    .where(
      and(
        eq(adPerformance.workspaceId, workspaceId),
        gte(adPerformance.date, formatDateString(start)),
        lte(adPerformance.date, formatDateString(end))
      )
    );

  // Previous period metrics for comparison
  const previousMetrics = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(${adPerformance.spend}::numeric), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${adPerformance.conversionValue}::numeric), 0)`,
    })
    .from(adPerformance)
    .where(
      and(
        eq(adPerformance.workspaceId, workspaceId),
        gte(adPerformance.date, formatDateString(previous.start)),
        lte(adPerformance.date, formatDateString(previous.end))
      )
    );

  const current = currentMetrics[0] || {
    totalSpend: 0,
    totalRevenue: 0,
    totalConversions: 0,
    totalImpressions: 0,
    totalClicks: 0,
  };

  const prev = previousMetrics[0] || { totalSpend: 0, totalRevenue: 0 };

  // Calculate derived metrics
  const overallRoas = current.totalSpend > 0 ? current.totalRevenue / current.totalSpend : 0;
  const overallCpc = current.totalClicks > 0 ? current.totalSpend / current.totalClicks : 0;
  const overallCpm = current.totalImpressions > 0 ? (current.totalSpend / current.totalImpressions) * 1000 : 0;
  const overallCtr = current.totalImpressions > 0 ? (current.totalClicks / current.totalImpressions) * 100 : 0;
  const overallCpa = current.totalConversions > 0 ? current.totalSpend / current.totalConversions : 0;

  // Calculate changes
  const spendChange = prev.totalSpend > 0 ? ((current.totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : 0;
  const revenueChange = prev.totalRevenue > 0 ? ((current.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100 : 0;
  const prevRoas = prev.totalSpend > 0 ? prev.totalRevenue / prev.totalSpend : 0;
  const roasChange = prevRoas > 0 ? ((overallRoas - prevRoas) / prevRoas) * 100 : 0;

  // Get channel performance for top/worst
  const channelPerformance = await getChannelPerformance(workspaceId, period);
  const sortedByRoas = [...channelPerformance].sort((a, b) => b.roas - a.roas);

  return {
    totalSpend: Number(current.totalSpend),
    totalRevenue: Number(current.totalRevenue),
    totalConversions: Number(current.totalConversions),
    totalImpressions: Number(current.totalImpressions),
    totalClicks: Number(current.totalClicks),
    overallRoas,
    overallCpc,
    overallCpm,
    overallCtr,
    overallCpa,
    spendChange,
    revenueChange,
    roasChange,
    topPerformingChannel: sortedByRoas[0]?.channel,
    worstPerformingChannel: sortedByRoas[sortedByRoas.length - 1]?.channel,
    period,
  };
}

/**
 * Get performance by channel
 */
export async function getChannelPerformance(
  workspaceId: string,
  period = '30d'
): Promise<ChannelPerformance[]> {
  const { start, end } = getDateRange(period);

  const metrics = await db
    .select({
      channel: adPerformance.platform,
      spend: sql<number>`COALESCE(SUM(${adPerformance.spend}::numeric), 0)`,
      impressions: sql<number>`COALESCE(SUM(${adPerformance.impressions}), 0)`,
      clicks: sql<number>`COALESCE(SUM(${adPerformance.clicks}), 0)`,
      conversions: sql<number>`COALESCE(SUM(${adPerformance.conversions}), 0)`,
      revenue: sql<number>`COALESCE(SUM(${adPerformance.conversionValue}::numeric), 0)`,
    })
    .from(adPerformance)
    .where(
      and(
        eq(adPerformance.workspaceId, workspaceId),
        gte(adPerformance.date, formatDateString(start)),
        lte(adPerformance.date, formatDateString(end))
      )
    )
    .groupBy(adPerformance.platform);

  return metrics.map((m) => ({
    channel: m.channel as MarketingChannel,
    spend: Number(m.spend),
    impressions: Number(m.impressions),
    clicks: Number(m.clicks),
    conversions: Number(m.conversions),
    revenue: Number(m.revenue),
    roas: Number(m.spend) > 0 ? Number(m.revenue) / Number(m.spend) : 0,
    cpc: Number(m.clicks) > 0 ? Number(m.spend) / Number(m.clicks) : 0,
    cpm: Number(m.impressions) > 0 ? (Number(m.spend) / Number(m.impressions)) * 1000 : 0,
    ctr: Number(m.impressions) > 0 ? (Number(m.clicks) / Number(m.impressions)) * 100 : 0,
    cpa: Number(m.conversions) > 0 ? Number(m.spend) / Number(m.conversions) : 0,
    period,
    periodStart: start,
    periodEnd: end,
  }));
}

/**
 * Get campaign performance
 */
export async function getCampaignPerformance(
  workspaceId: string,
  period = '30d',
  channel?: MarketingChannel
): Promise<CampaignPerformance[]> {
  const { start, end } = getDateRange(period);

  let query = db
    .select({
      id: adCampaigns.id,
      name: adCampaigns.name,
      channel: adCampaigns.platform,
      status: adCampaigns.status,
      spend: sql<number>`COALESCE(SUM(${adPerformance.spend}::numeric), 0)`,
      impressions: sql<number>`COALESCE(SUM(${adPerformance.impressions}), 0)`,
      clicks: sql<number>`COALESCE(SUM(${adPerformance.clicks}), 0)`,
      conversions: sql<number>`COALESCE(SUM(${adPerformance.conversions}), 0)`,
      revenue: sql<number>`COALESCE(SUM(${adPerformance.conversionValue}::numeric), 0)`,
    })
    .from(adCampaigns)
    .leftJoin(adPerformance, eq(adCampaigns.id, adPerformance.campaignId))
    .where(
      and(
        eq(adCampaigns.workspaceId, workspaceId),
        // Only filter by channel if it's a valid ad platform (not email or sms)
        channel && ['meta_ads', 'google_ads', 'tiktok_ads', 'linkedin_ads', 'twitter_ads', 'pinterest_ads'].includes(channel)
          ? eq(adCampaigns.platform, channel as 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'linkedin_ads' | 'twitter_ads' | 'pinterest_ads')
          : undefined
      )
    )
    .groupBy(adCampaigns.id, adCampaigns.name, adCampaigns.platform, adCampaigns.status)
    .orderBy(desc(sql`SUM(${adPerformance.spend}::numeric)`));

  const campaigns = await query;

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel as MarketingChannel,
    status: c.status,
    spend: Number(c.spend),
    impressions: Number(c.impressions),
    clicks: Number(c.clicks),
    conversions: Number(c.conversions),
    revenue: Number(c.revenue),
    roas: Number(c.spend) > 0 ? Number(c.revenue) / Number(c.spend) : 0,
    cpc: Number(c.clicks) > 0 ? Number(c.spend) / Number(c.clicks) : 0,
    ctr: Number(c.impressions) > 0 ? (Number(c.clicks) / Number(c.impressions)) * 100 : 0,
    cpa: Number(c.conversions) > 0 ? Number(c.spend) / Number(c.conversions) : 0,
    period,
  }));
}

/**
 * Get top performing campaigns
 */
export async function getTopCampaigns(
  workspaceId: string,
  period = '30d',
  metric: 'roas' | 'conversions' | 'revenue' | 'ctr' = 'roas',
  limit = 5
): Promise<CampaignPerformance[]> {
  const campaigns = await getCampaignPerformance(workspaceId, period);

  return campaigns
    .filter((c) => c.spend > 0) // Only campaigns with spend
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit);
}

/**
 * Get underperforming campaigns
 */
export async function getUnderperformingCampaigns(
  workspaceId: string,
  period = '30d',
  roasThreshold = 1.0
): Promise<CampaignPerformance[]> {
  const campaigns = await getCampaignPerformance(workspaceId, period);

  return campaigns
    .filter((c) => c.spend > 0 && c.roas < roasThreshold && c.status === 'active')
    .sort((a, b) => a.roas - b.roas);
}

/**
 * Calculate spend by day for trend analysis
 */
export async function getSpendTrend(
  workspaceId: string,
  period = '30d'
): Promise<Array<{ date: string; spend: number; revenue: number; roas: number }>> {
  const { start, end } = getDateRange(period);

  const dailyMetrics = await db
    .select({
      date: adPerformance.date,
      spend: sql<number>`COALESCE(SUM(${adPerformance.spend}::numeric), 0)`,
      revenue: sql<number>`COALESCE(SUM(${adPerformance.conversionValue}::numeric), 0)`,
    })
    .from(adPerformance)
    .where(
      and(
        eq(adPerformance.workspaceId, workspaceId),
        gte(adPerformance.date, formatDateString(start)),
        lte(adPerformance.date, formatDateString(end))
      )
    )
    .groupBy(adPerformance.date)
    .orderBy(adPerformance.date);

  return dailyMetrics.map((d) => ({
    date: d.date,
    spend: Number(d.spend),
    revenue: Number(d.revenue),
    roas: Number(d.spend) > 0 ? Number(d.revenue) / Number(d.spend) : 0,
  }));
}

export { getDateRange, getPreviousPeriodRange };
