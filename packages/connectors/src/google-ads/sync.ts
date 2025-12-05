/**
 * Google Ads Sync Functions
 * Sync campaigns, ad groups, ads, keywords, and performance data
 */

import { createLogger } from '@aibos/core';
import { db } from '@aibos/data-model';
import {
  adAccounts,
  adCampaigns,
  adSets,
  ads,
  adPerformance,
  keywordPerformance,
} from '@aibos/data-model';
import { eq } from 'drizzle-orm';
import { GoogleAdsClient } from './client';
import type { GoogleAdsRow, GoogleAdsSyncOptions } from './types';
import {
  GOOGLE_ADS_CAMPAIGN_STATUS,
  GOOGLE_ADS_AD_GROUP_STATUS,
  GOOGLE_ADS_AD_STATUS,
  GOOGLE_ADS_APPROVAL_STATUS,
  GOOGLE_ADS_CHANNEL_TYPE,
  GOOGLE_ADS_BIDDING_STRATEGY,
  GOOGLE_ADS_KEYWORD_MATCH_TYPE,
} from './types';

const logger = createLogger('google-ads:sync');

/**
 * Generate a unique ID for records
 */
function generateId(): string {
  return `gads_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

/**
 * Convert micros to decimal (Google Ads uses micros for currency)
 */
function microsToDecimal(micros: string | undefined): string | null {
  if (!micros) return null;
  return (parseInt(micros, 10) / 1000000).toFixed(2);
}

/**
 * Map campaign status
 */
function mapCampaignStatus(status: string): 'active' | 'paused' | 'deleted' | 'archived' | 'draft' {
  return (GOOGLE_ADS_CAMPAIGN_STATUS[status] || 'active') as 'active' | 'paused' | 'deleted' | 'archived' | 'draft';
}

/**
 * Map ad group status
 */
function mapAdGroupStatus(status: string): 'active' | 'paused' | 'deleted' | 'archived' | 'draft' {
  return (GOOGLE_ADS_AD_GROUP_STATUS[status] || 'active') as 'active' | 'paused' | 'deleted' | 'archived' | 'draft';
}

/**
 * Map ad status
 */
function mapAdStatus(status: string, approvalStatus?: string): 'active' | 'paused' | 'deleted' | 'archived' | 'draft' | 'pending_review' | 'rejected' {
  if (approvalStatus === 'DISAPPROVED') return 'rejected';
  if (approvalStatus === 'UNDER_REVIEW') return 'pending_review';
  return (GOOGLE_ADS_AD_STATUS[status] || 'active') as 'active' | 'paused' | 'deleted' | 'archived' | 'draft' | 'pending_review' | 'rejected';
}

/**
 * Map channel type to objective
 */
function mapChannelToObjective(channelType: string): 'awareness' | 'traffic' | 'engagement' | 'leads' | 'app_promotion' | 'sales' | 'conversions' | 'video_views' | 'reach' | 'brand_awareness' | 'store_traffic' | null {
  const mapping: Record<string, 'awareness' | 'traffic' | 'engagement' | 'leads' | 'app_promotion' | 'sales' | 'conversions' | 'video_views' | 'reach' | 'brand_awareness' | 'store_traffic'> = {
    SEARCH: 'conversions',
    DISPLAY: 'awareness',
    SHOPPING: 'sales',
    VIDEO: 'video_views',
    PERFORMANCE_MAX: 'conversions',
    DISCOVERY: 'awareness',
    LOCAL: 'store_traffic',
    SMART: 'conversions',
  };
  return mapping[channelType] || null;
}

/**
 * Sync ad account details
 */
export async function syncGoogleAdsAccount(
  client: GoogleAdsClient,
  workspaceId: string,
  connectorId: string
): Promise<string> {
  logger.info('Syncing Google Ads account', { workspaceId });

  const customers = await client.getCustomer();
  const customer = customers[0]?.customer;

  if (!customer) {
    throw new Error('No customer data found');
  }

  const accountId = `gads_account_${customer.id}`;

  await db
    .insert(adAccounts)
    .values({
      id: accountId,
      workspaceId,
      platform: 'google_ads',
      platformAccountId: customer.id,
      name: customer.descriptiveName,
      currency: customer.currencyCode,
      timezone: customer.timeZone,
      status: customer.status === 'ENABLED' ? 'active' : 'disabled',
      lastSyncAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adAccounts.id,
      set: {
        name: customer.descriptiveName,
        currency: customer.currencyCode,
        timezone: customer.timeZone,
        status: customer.status === 'ENABLED' ? 'active' : 'disabled',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

  logger.info('Google Ads account synced', { accountId: customer.id });
  return accountId;
}

/**
 * Sync campaigns
 */
export async function syncGoogleAdsCampaigns(
  client: GoogleAdsClient,
  workspaceId: string,
  adAccountId: string
): Promise<number> {
  logger.info('Syncing Google Ads campaigns', { workspaceId, adAccountId });

  const campaigns = await client.getCampaigns();
  const budgets = await client.getCampaignBudgets();
  
  // Create budget lookup
  const budgetMap = new Map<string, string>();
  for (const row of budgets) {
    if (row.campaign) {
      // Budget resource name format: customers/{customer_id}/campaignBudgets/{budget_id}
      budgetMap.set(row.campaign.campaignBudget || '', (row as { campaignBudget?: { amountMicros?: string } }).campaignBudget?.amountMicros || '0');
    }
  }

  let synced = 0;

  for (const row of campaigns) {
    const campaign = row.campaign;
    if (!campaign) continue;

    const campaignId = `gads_campaign_${campaign.id}`;
    const budgetMicros = campaign.campaignBudget ? budgetMap.get(campaign.campaignBudget) : null;

    await db
      .insert(adCampaigns)
      .values({
        id: campaignId,
        workspaceId,
        adAccountId,
        platform: 'google_ads',
        platformCampaignId: campaign.id,
        name: campaign.name,
        status: mapCampaignStatus(campaign.status),
        objective: mapChannelToObjective(campaign.advertisingChannelType),
        budgetType: 'daily', // Google Ads primarily uses daily budgets
        budget: microsToDecimal(budgetMicros || undefined),
        startDate: campaign.startDate || null,
        endDate: campaign.endDate || null,
        settings: {
          channelType: GOOGLE_ADS_CHANNEL_TYPE[campaign.advertisingChannelType] || campaign.advertisingChannelType,
          biddingStrategy: campaign.biddingStrategyType 
            ? GOOGLE_ADS_BIDDING_STRATEGY[campaign.biddingStrategyType] || campaign.biddingStrategyType
            : undefined,
          targetCpa: campaign.targetCpa?.targetCpaMicros 
            ? parseFloat(microsToDecimal(campaign.targetCpa.targetCpaMicros) || '0')
            : undefined,
          targetRoas: campaign.targetRoas?.targetRoas || undefined,
        },
      })
      .onConflictDoUpdate({
        target: adCampaigns.id,
        set: {
          name: campaign.name,
          status: mapCampaignStatus(campaign.status),
          objective: mapChannelToObjective(campaign.advertisingChannelType),
          budget: microsToDecimal(budgetMicros || undefined),
          startDate: campaign.startDate || null,
          endDate: campaign.endDate || null,
          settings: {
            channelType: GOOGLE_ADS_CHANNEL_TYPE[campaign.advertisingChannelType] || campaign.advertisingChannelType,
            biddingStrategy: campaign.biddingStrategyType 
              ? GOOGLE_ADS_BIDDING_STRATEGY[campaign.biddingStrategyType] || campaign.biddingStrategyType
              : undefined,
            targetCpa: campaign.targetCpa?.targetCpaMicros 
              ? parseFloat(microsToDecimal(campaign.targetCpa.targetCpaMicros) || '0')
              : undefined,
            targetRoas: campaign.targetRoas?.targetRoas || undefined,
          },
          updatedAt: new Date(),
        },
      });

    synced++;
  }

  logger.info('Google Ads campaigns synced', { count: synced });
  return synced;
}

/**
 * Sync ad groups (as ad sets)
 */
export async function syncGoogleAdsAdGroups(
  client: GoogleAdsClient,
  workspaceId: string
): Promise<number> {
  logger.info('Syncing Google Ads ad groups', { workspaceId });

  const adGroups = await client.getAdGroups();
  let synced = 0;

  for (const row of adGroups) {
    const adGroup = row.adGroup;
    if (!adGroup) continue;

    // Extract campaign ID from resource name
    const campaignIdMatch = adGroup.campaign?.match(/customers\/\d+\/campaigns\/(\d+)/);
    const platformCampaignId = campaignIdMatch ? campaignIdMatch[1] : null;
    
    if (!platformCampaignId) continue;

    const adSetId = `gads_adgroup_${adGroup.id}`;
    const campaignId = `gads_campaign_${platformCampaignId}`;

    // Check if campaign exists
    const existingCampaign = await db
      .select({ id: adCampaigns.id })
      .from(adCampaigns)
      .where(eq(adCampaigns.id, campaignId))
      .limit(1);

    if (existingCampaign.length === 0) {
      logger.debug('Skipping ad group - campaign not found', { adGroupId: adGroup.id });
      continue;
    }

    await db
      .insert(adSets)
      .values({
        id: adSetId,
        workspaceId,
        campaignId,
        platform: 'google_ads',
        platformAdSetId: adGroup.id,
        name: adGroup.name,
        status: mapAdGroupStatus(adGroup.status),
        bidAmount: microsToDecimal(adGroup.cpcBidMicros),
        targeting: {
          adGroupType: adGroup.type,
        },
      })
      .onConflictDoUpdate({
        target: adSets.id,
        set: {
          name: adGroup.name,
          status: mapAdGroupStatus(adGroup.status),
          bidAmount: microsToDecimal(adGroup.cpcBidMicros),
          targeting: {
            adGroupType: adGroup.type,
          },
          updatedAt: new Date(),
        },
      });

    synced++;
  }

  logger.info('Google Ads ad groups synced', { count: synced });
  return synced;
}

/**
 * Sync ads
 */
export async function syncGoogleAdsAds(
  client: GoogleAdsClient,
  workspaceId: string
): Promise<number> {
  logger.info('Syncing Google Ads ads', { workspaceId });

  const adsData = await client.getAds();
  let synced = 0;

  for (const row of adsData) {
    const adGroupAd = row.adGroupAd;
    if (!adGroupAd) continue;

    const ad = adGroupAd.ad;
    if (!ad) continue;

    // Extract ad group ID from resource name
    const adGroupIdMatch = adGroupAd.adGroup?.match(/customers\/\d+\/adGroups\/(\d+)/);
    const platformAdGroupId = adGroupIdMatch ? adGroupIdMatch[1] : null;
    
    if (!platformAdGroupId) continue;

    const adId = `gads_ad_${ad.id}`;
    const adSetId = `gads_adgroup_${platformAdGroupId}`;

    // Check if ad group exists
    const existingAdSet = await db
      .select({ id: adSets.id })
      .from(adSets)
      .where(eq(adSets.id, adSetId))
      .limit(1);

    if (existingAdSet.length === 0) {
      logger.debug('Skipping ad - ad group not found', { adId: ad.id });
      continue;
    }

    // Determine creative type
    let creativeType: 'responsive_search' | 'responsive_display' | 'text' | 'image' = 'text';
    if (ad.responsiveSearchAd) {
      creativeType = 'responsive_search';
    } else if (ad.responsiveDisplayAd) {
      creativeType = 'responsive_display';
    }

    // Extract headlines and descriptions
    let headlines: string[] = [];
    let descriptions: string[] = [];

    if (ad.responsiveSearchAd) {
      headlines = ad.responsiveSearchAd.headlines?.map((h) => h.text) || [];
      descriptions = ad.responsiveSearchAd.descriptions?.map((d) => d.text) || [];
    } else if (ad.responsiveDisplayAd) {
      headlines = ad.responsiveDisplayAd.headlines?.map((h) => h.text) || [];
      descriptions = ad.responsiveDisplayAd.descriptions?.map((d) => d.text) || [];
    } else if (ad.expandedTextAd) {
      headlines = [
        ad.expandedTextAd.headlinePart1,
        ad.expandedTextAd.headlinePart2,
        ad.expandedTextAd.headlinePart3,
      ].filter(Boolean) as string[];
      descriptions = [
        ad.expandedTextAd.description,
        ad.expandedTextAd.description2,
      ].filter(Boolean) as string[];
    }

    const approvalStatus = adGroupAd.policySummary?.approvalStatus;

    await db
      .insert(ads)
      .values({
        id: adId,
        workspaceId,
        adSetId,
        platform: 'google_ads',
        platformAdId: ad.id,
        name: `Ad ${ad.id}`,
        status: mapAdStatus(adGroupAd.status, approvalStatus),
        creativeType,
        headline: headlines[0] || null,
        description: descriptions[0] || null,
        destinationUrl: ad.finalUrls?.[0] || null,
        displayUrl: ad.displayUrl || null,
        creative: {
          headlines,
          descriptions,
          path1: ad.responsiveSearchAd?.path1 || ad.expandedTextAd?.path1,
          path2: ad.responsiveSearchAd?.path2 || ad.expandedTextAd?.path2,
        },
      })
      .onConflictDoUpdate({
        target: ads.id,
        set: {
          status: mapAdStatus(adGroupAd.status, approvalStatus),
          headline: headlines[0] || null,
          description: descriptions[0] || null,
          destinationUrl: ad.finalUrls?.[0] || null,
          displayUrl: ad.displayUrl || null,
          creative: {
            headlines,
            descriptions,
            path1: ad.responsiveSearchAd?.path1 || ad.expandedTextAd?.path1,
            path2: ad.responsiveSearchAd?.path2 || ad.expandedTextAd?.path2,
          },
          updatedAt: new Date(),
        },
      });

    synced++;
  }

  logger.info('Google Ads ads synced', { count: synced });
  return synced;
}

/**
 * Sync campaign performance
 */
export async function syncGoogleAdsPerformance(
  client: GoogleAdsClient,
  workspaceId: string,
  adAccountId: string,
  options: GoogleAdsSyncOptions = {}
): Promise<number> {
  const endDate = options.endDate || new Date();
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  logger.info('Syncing Google Ads performance', {
    workspaceId,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  });

  const performance = await client.getCampaignPerformance(
    formatDate(startDate),
    formatDate(endDate)
  );

  let synced = 0;

  for (const row of performance) {
    const campaign = row.campaign;
    const metrics = row.metrics;
    const segments = row.segments;

    if (!campaign || !metrics || !segments?.date) continue;

    const performanceId = generateId();
    const campaignId = `gads_campaign_${campaign.id}`;

    const spend = microsToDecimal(metrics.costMicros) || '0';
    const conversions = metrics.conversions || 0;
    const conversionValue = metrics.conversionsValue || 0;
    const roas = parseFloat(spend) > 0 && conversionValue > 0 
      ? conversionValue / parseFloat(spend) 
      : null;

    await db
      .insert(adPerformance)
      .values({
        id: performanceId,
        workspaceId,
        adAccountId,
        campaignId,
        platform: 'google_ads',
        date: segments.date,
        impressions: parseInt(metrics.impressions || '0', 10),
        clicks: parseInt(metrics.clicks || '0', 10),
        spend,
        conversions: Math.round(conversions),
        conversionValue: String(conversionValue),
        purchases: Math.round(conversions),
        purchaseValue: String(conversionValue),
        videoViews: metrics.videoViews ? parseInt(metrics.videoViews, 10) : 0,
        ctr: metrics.ctr ? String(metrics.ctr) : null,
        cpc: microsToDecimal(metrics.averageCpc),
        cpm: microsToDecimal(metrics.averageCpm),
        cpa: microsToDecimal(metrics.costPerConversion),
        roas: roas ? String(roas) : null,
      })
      .onConflictDoNothing();

    synced++;
  }

  logger.info('Google Ads performance synced', { count: synced });
  return synced;
}

/**
 * Sync keyword performance
 */
export async function syncGoogleAdsKeywords(
  client: GoogleAdsClient,
  workspaceId: string,
  adAccountId: string,
  options: GoogleAdsSyncOptions = {}
): Promise<number> {
  const endDate = options.endDate || new Date();
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  logger.info('Syncing Google Ads keywords', {
    workspaceId,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  });

  const keywords = await client.getKeywordPerformance(
    formatDate(startDate),
    formatDate(endDate)
  );

  let synced = 0;

  for (const row of keywords) {
    const criterion = row as unknown as {
      adGroupCriterion?: {
        criterionId?: string;
        keyword?: { text?: string; matchType?: string };
        qualityInfo?: { qualityScore?: number };
      };
      adGroup?: { id?: string; campaign?: string };
      metrics?: GoogleAdsRow['metrics'];
      segments?: GoogleAdsRow['segments'];
    };
    
    const adGroupCriterion = criterion.adGroupCriterion;
    const adGroup = criterion.adGroup;
    const metrics = criterion.metrics;
    const segments = criterion.segments;

    if (!adGroupCriterion?.keyword?.text || !metrics || !segments?.date) continue;

    const keywordId = generateId();

    // Extract campaign ID from resource name
    const campaignIdMatch = adGroup?.campaign?.match(/customers\/\d+\/campaigns\/(\d+)/);
    const platformCampaignId = campaignIdMatch ? campaignIdMatch[1] : null;
    const campaignId = platformCampaignId ? `gads_campaign_${platformCampaignId}` : null;
    const adSetId = adGroup?.id ? `gads_adgroup_${adGroup.id}` : null;

    const spend = microsToDecimal(metrics.costMicros) || '0';
    const conversions = metrics.conversions || 0;
    const conversionValue = metrics.conversionsValue || 0;

    await db
      .insert(keywordPerformance)
      .values({
        id: keywordId,
        workspaceId,
        adAccountId,
        campaignId,
        adSetId,
        keyword: adGroupCriterion.keyword.text,
        matchType: GOOGLE_ADS_KEYWORD_MATCH_TYPE[adGroupCriterion.keyword.matchType || ''] || 'broad',
        date: segments.date,
        impressions: parseInt(metrics.impressions || '0', 10),
        clicks: parseInt(metrics.clicks || '0', 10),
        spend,
        conversions: Math.round(conversions),
        conversionValue: String(conversionValue),
        qualityScore: adGroupCriterion.qualityInfo?.qualityScore,
        ctr: metrics.ctr ? String(metrics.ctr) : null,
        cpc: microsToDecimal(metrics.averageCpc),
      })
      .onConflictDoNothing();

    synced++;
  }

  logger.info('Google Ads keywords synced', { count: synced });
  return synced;
}
