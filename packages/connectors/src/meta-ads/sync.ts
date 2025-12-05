/**
 * Meta Ads Sync Functions
 * Sync campaigns, ad sets, ads, and performance data from Meta Marketing API
 */

import { createLogger } from '@aibos/core';
import { db } from '@aibos/data-model';
import {
  adAccounts,
  adCampaigns,
  adSets,
  ads,
  adPerformance,
} from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { MetaAdsClient } from './client';
import type {
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsights,
  MetaAdsSyncOptions,
} from './types';
import {
  META_CAMPAIGN_OBJECTIVES,
  META_STATUS_MAP,
  META_ACCOUNT_STATUS,
} from './types';

const logger = createLogger('meta-ads:sync');

/**
 * Generate a unique ID for records
 */
function generateId(): string {
  return `meta_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

/**
 * Map Meta status to our status enum
 */
function mapStatus(metaStatus: string): string {
  return META_STATUS_MAP[metaStatus] || 'active';
}

/**
 * Map Meta objective to our objective enum
 */
function mapObjective(metaObjective: string): string {
  return META_CAMPAIGN_OBJECTIVES[metaObjective] || 'conversions';
}

/**
 * Extract action value from Meta actions array
 */
function getActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined,
  actionType: string
): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseInt(action.value, 10) : 0;
}

/**
 * Sync ad account details
 */
export async function syncMetaAdAccount(
  client: MetaAdsClient,
  workspaceId: string,
  connectorId: string
): Promise<string> {
  logger.info('Syncing Meta ad account', { workspaceId });

  const metaAccount = await client.getAdAccount();
  const accountId = `meta_account_${metaAccount.account_id}`;

  await db
    .insert(adAccounts)
    .values({
      id: accountId,
      workspaceId,
      platform: 'meta_ads',
      platformAccountId: metaAccount.account_id,
      name: metaAccount.name,
      currency: metaAccount.currency,
      timezone: metaAccount.timezone_name,
      status: META_ACCOUNT_STATUS[metaAccount.account_status] === 'active' ? 'active' : 'disabled',
      lastSyncAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adAccounts.id,
      set: {
        name: metaAccount.name,
        currency: metaAccount.currency,
        timezone: metaAccount.timezone_name,
        status: META_ACCOUNT_STATUS[metaAccount.account_status] === 'active' ? 'active' : 'disabled',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

  logger.info('Meta ad account synced', { accountId: metaAccount.account_id });
  return accountId;
}

/**
 * Sync campaigns
 */
export async function syncMetaCampaigns(
  client: MetaAdsClient,
  workspaceId: string,
  adAccountId: string
): Promise<number> {
  logger.info('Syncing Meta campaigns', { workspaceId, adAccountId });

  const campaigns = await client.getCampaigns();
  let synced = 0;

  for (const campaign of campaigns) {
    const campaignId = `meta_campaign_${campaign.id}`;

    await db
      .insert(adCampaigns)
      .values({
        id: campaignId,
        workspaceId,
        adAccountId,
        platform: 'meta_ads',
        platformCampaignId: campaign.id,
        name: campaign.name,
        status: mapStatus(campaign.effective_status) as 'active' | 'paused' | 'deleted' | 'archived' | 'draft',
        objective: mapObjective(campaign.objective) as 'awareness' | 'traffic' | 'engagement' | 'leads' | 'app_promotion' | 'sales' | 'conversions' | 'video_views' | 'reach' | 'brand_awareness' | 'store_traffic',
        budgetType: campaign.daily_budget ? 'daily' : campaign.lifetime_budget ? 'lifetime' : null,
        budget: campaign.daily_budget || campaign.lifetime_budget || null,
        budgetRemaining: campaign.budget_remaining || null,
        startDate: campaign.start_time ? campaign.start_time.split('T')[0] : null,
        endDate: campaign.stop_time ? campaign.stop_time.split('T')[0] : null,
      })
      .onConflictDoUpdate({
        target: adCampaigns.id,
        set: {
          name: campaign.name,
          status: mapStatus(campaign.effective_status) as 'active' | 'paused' | 'deleted' | 'archived' | 'draft',
          objective: mapObjective(campaign.objective) as 'awareness' | 'traffic' | 'engagement' | 'leads' | 'app_promotion' | 'sales' | 'conversions' | 'video_views' | 'reach' | 'brand_awareness' | 'store_traffic',
          budgetType: campaign.daily_budget ? 'daily' : campaign.lifetime_budget ? 'lifetime' : null,
          budget: campaign.daily_budget || campaign.lifetime_budget || null,
          budgetRemaining: campaign.budget_remaining || null,
          startDate: campaign.start_time ? campaign.start_time.split('T')[0] : null,
          endDate: campaign.stop_time ? campaign.stop_time.split('T')[0] : null,
          updatedAt: new Date(),
        },
      });

    synced++;
  }

  logger.info('Meta campaigns synced', { count: synced });
  return synced;
}

/**
 * Sync ad sets
 */
export async function syncMetaAdSets(
  client: MetaAdsClient,
  workspaceId: string
): Promise<number> {
  logger.info('Syncing Meta ad sets', { workspaceId });

  const metaAdSets = await client.getAdSets();
  let synced = 0;

  for (const adSet of metaAdSets) {
    const adSetId = `meta_adset_${adSet.id}`;
    const campaignId = `meta_campaign_${adSet.campaign_id}`;

    // Check if campaign exists
    const existingCampaign = await db
      .select({ id: adCampaigns.id })
      .from(adCampaigns)
      .where(eq(adCampaigns.id, campaignId))
      .limit(1);

    if (existingCampaign.length === 0) {
      logger.debug('Skipping ad set - campaign not found', { adSetId: adSet.id, campaignId: adSet.campaign_id });
      continue;
    }

    await db
      .insert(adSets)
      .values({
        id: adSetId,
        workspaceId,
        campaignId,
        platform: 'meta_ads',
        platformAdSetId: adSet.id,
        name: adSet.name,
        status: mapStatus(adSet.effective_status) as 'active' | 'paused' | 'deleted' | 'archived' | 'draft',
        budgetType: adSet.daily_budget ? 'daily' : adSet.lifetime_budget ? 'lifetime' : null,
        budget: adSet.daily_budget || adSet.lifetime_budget || null,
        bidStrategy: adSet.bid_strategy || null,
        bidAmount: adSet.bid_amount ? String(adSet.bid_amount) : null,
        targeting: adSet.targeting ? {
          ageMin: adSet.targeting.age_min,
          ageMax: adSet.targeting.age_max,
          genders: adSet.targeting.genders?.map(String),
          locations: adSet.targeting.geo_locations?.countries,
          interests: adSet.targeting.interests?.map((i) => i.name),
          behaviors: adSet.targeting.behaviors?.map((b) => b.name),
          placements: adSet.targeting.publisher_platforms,
          devices: adSet.targeting.device_platforms,
        } : null,
        startDate: adSet.start_time ? adSet.start_time.split('T')[0] : null,
        endDate: adSet.end_time ? adSet.end_time.split('T')[0] : null,
      })
      .onConflictDoUpdate({
        target: adSets.id,
        set: {
          name: adSet.name,
          status: mapStatus(adSet.effective_status) as 'active' | 'paused' | 'deleted' | 'archived' | 'draft',
          budgetType: adSet.daily_budget ? 'daily' : adSet.lifetime_budget ? 'lifetime' : null,
          budget: adSet.daily_budget || adSet.lifetime_budget || null,
          bidStrategy: adSet.bid_strategy || null,
          bidAmount: adSet.bid_amount ? String(adSet.bid_amount) : null,
          targeting: adSet.targeting ? {
            ageMin: adSet.targeting.age_min,
            ageMax: adSet.targeting.age_max,
            genders: adSet.targeting.genders?.map(String),
            locations: adSet.targeting.geo_locations?.countries,
            interests: adSet.targeting.interests?.map((i) => i.name),
            behaviors: adSet.targeting.behaviors?.map((b) => b.name),
            placements: adSet.targeting.publisher_platforms,
            devices: adSet.targeting.device_platforms,
          } : null,
          startDate: adSet.start_time ? adSet.start_time.split('T')[0] : null,
          endDate: adSet.end_time ? adSet.end_time.split('T')[0] : null,
          updatedAt: new Date(),
        },
      });

    synced++;
  }

  logger.info('Meta ad sets synced', { count: synced });
  return synced;
}

/**
 * Sync ads
 */
export async function syncMetaAds(
  client: MetaAdsClient,
  workspaceId: string
): Promise<number> {
  logger.info('Syncing Meta ads', { workspaceId });

  const metaAds = await client.getAds();
  let synced = 0;

  for (const ad of metaAds) {
    const adId = `meta_ad_${ad.id}`;
    const adSetId = `meta_adset_${ad.adset_id}`;

    // Check if ad set exists
    const existingAdSet = await db
      .select({ id: adSets.id })
      .from(adSets)
      .where(eq(adSets.id, adSetId))
      .limit(1);

    if (existingAdSet.length === 0) {
      logger.debug('Skipping ad - ad set not found', { adId: ad.id, adSetId: ad.adset_id });
      continue;
    }

    // Determine creative type
    let creativeType: 'image' | 'video' | 'carousel' | 'text' = 'image';
    if (ad.creative?.object_story_spec?.video_data) {
      creativeType = 'video';
    }

    // Extract creative data
    const linkData = ad.creative?.object_story_spec?.link_data;
    const videoData = ad.creative?.object_story_spec?.video_data;

    await db
      .insert(ads)
      .values({
        id: adId,
        workspaceId,
        adSetId,
        platform: 'meta_ads',
        platformAdId: ad.id,
        name: ad.name,
        status: mapStatus(ad.effective_status) as 'active' | 'paused' | 'deleted' | 'archived' | 'draft' | 'pending_review' | 'rejected',
        creativeType,
        headline: linkData?.name || videoData?.title || null,
        description: linkData?.description || videoData?.message || null,
        callToAction: linkData?.call_to_action?.type || videoData?.call_to_action?.type || null,
        destinationUrl: linkData?.link || linkData?.call_to_action?.value?.link || null,
        creative: ad.creative ? {
          imageUrl: ad.creative.image_url,
          thumbnailUrl: ad.creative.thumbnail_url,
        } : null,
      })
      .onConflictDoUpdate({
        target: ads.id,
        set: {
          name: ad.name,
          status: mapStatus(ad.effective_status) as 'active' | 'paused' | 'deleted' | 'archived' | 'draft' | 'pending_review' | 'rejected',
          creativeType,
          headline: linkData?.name || videoData?.title || null,
          description: linkData?.description || videoData?.message || null,
          callToAction: linkData?.call_to_action?.type || videoData?.call_to_action?.type || null,
          destinationUrl: linkData?.link || linkData?.call_to_action?.value?.link || null,
          creative: ad.creative ? {
            imageUrl: ad.creative.image_url,
            thumbnailUrl: ad.creative.thumbnail_url,
          } : null,
          updatedAt: new Date(),
        },
      });

    synced++;
  }

  logger.info('Meta ads synced', { count: synced });
  return synced;
}

/**
 * Sync performance data
 */
export async function syncMetaPerformance(
  client: MetaAdsClient,
  workspaceId: string,
  adAccountId: string,
  options: MetaAdsSyncOptions = {}
): Promise<number> {
  const endDate = options.endDate || new Date();
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default
  const level = options.level || 'ad';

  logger.info('Syncing Meta performance', {
    workspaceId,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    level,
  });

  const insights = await client.getInsights(
    formatDate(startDate),
    formatDate(endDate),
    level
  );

  let synced = 0;

  for (const insight of insights) {
    const performanceId = generateId();

    // Map IDs to our format
    const campaignId = insight.campaign_id ? `meta_campaign_${insight.campaign_id}` : null;
    const adSetIdMapped = insight.adset_id ? `meta_adset_${insight.adset_id}` : null;
    const adId = insight.ad_id ? `meta_ad_${insight.ad_id}` : null;

    // Extract conversion metrics from actions
    const conversions = getActionValue(insight.actions, 'omni_purchase') +
      getActionValue(insight.actions, 'purchase') +
      getActionValue(insight.actions, 'offsite_conversion.fb_pixel_purchase');
    
    const conversionValue = insight.action_values
      ? getActionValue(insight.action_values, 'omni_purchase') +
        getActionValue(insight.action_values, 'purchase') +
        getActionValue(insight.action_values, 'offsite_conversion.fb_pixel_purchase')
      : 0;

    const addToCart = getActionValue(insight.actions, 'omni_add_to_cart') +
      getActionValue(insight.actions, 'add_to_cart');

    const leads = getActionValue(insight.actions, 'lead') +
      getActionValue(insight.actions, 'omni_complete_registration');

    // Calculate ROAS
    const spend = parseFloat(insight.spend);
    const roas = spend > 0 && conversionValue > 0 ? conversionValue / spend : null;

    await db
      .insert(adPerformance)
      .values({
        id: performanceId,
        workspaceId,
        adAccountId,
        campaignId,
        adSetId: adSetIdMapped,
        adId,
        platform: 'meta_ads',
        date: insight.date_start,
        impressions: parseInt(insight.impressions, 10),
        clicks: parseInt(insight.clicks, 10),
        spend: insight.spend,
        reach: insight.reach ? parseInt(insight.reach, 10) : 0,
        frequency: insight.frequency || null,
        conversions,
        conversionValue: String(conversionValue),
        addToCart,
        purchases: conversions,
        purchaseValue: String(conversionValue),
        leads,
        videoViews: getActionValue(insight.video_play_actions, 'video_view'),
        videoViews25: getActionValue(insight.video_p25_watched_actions, 'video_view'),
        videoViews50: getActionValue(insight.video_p50_watched_actions, 'video_view'),
        videoViews75: getActionValue(insight.video_p75_watched_actions, 'video_view'),
        videoViews100: getActionValue(insight.video_p100_watched_actions, 'video_view'),
        ctr: insight.ctr || null,
        cpc: insight.cpc || null,
        cpm: insight.cpm || null,
        cpa: conversions > 0 ? String(spend / conversions) : null,
        roas: roas ? String(roas) : null,
        attributionWindow: insight.attribution_setting || '7d_click_1d_view',
      })
      .onConflictDoNothing();

    synced++;
  }

  logger.info('Meta performance synced', { count: synced });
  return synced;
}
