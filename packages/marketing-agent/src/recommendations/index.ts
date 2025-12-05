/**
 * Marketing Recommendations Engine
 */

import { createLogger } from '@aibos/core';
import { db } from '@aibos/data-model';
import { adPerformance, ads, adCampaigns, adSets } from '@aibos/data-model';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type {
  MarketingChannel,
  MarketingSuggestion,
  BudgetAllocation,
  CreativeFatigue,
} from '../types';
import {
  getChannelPerformance,
  getCampaignPerformance,
  getDateRange,
} from '../metrics';

const logger = createLogger('marketing-agent:recommendations');

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

/**
 * Generate budget allocation recommendations
 */
export async function getBudgetRecommendations(
  workspaceId: string,
  period = '30d'
): Promise<BudgetAllocation[]> {
  logger.debug('Generating budget recommendations', { workspaceId, period });

  const channels = await getChannelPerformance(workspaceId, period);

  if (channels.length === 0) {
    return [];
  }

  const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const recommendations: BudgetAllocation[] = [];

  // Calculate weighted ROAS for each channel
  const channelsWithWeight = channels.map((c) => ({
    ...c,
    weight: c.spend > 0 ? c.roas * (c.conversions > 0 ? 1 : 0.5) : 0,
    spendPercent: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0,
  }));

  const totalWeight = channelsWithWeight.reduce((sum, c) => sum + c.weight, 0);

  for (const channel of channelsWithWeight) {
    // Calculate recommended budget allocation based on performance
    const idealPercent = totalWeight > 0 ? (channel.weight / totalWeight) * 100 : 100 / channels.length;
    const idealBudget = (idealPercent / 100) * totalSpend;
    const changePercent = channel.spend > 0 ? ((idealBudget - channel.spend) / channel.spend) * 100 : 0;

    // Only recommend if change is significant (> 10%)
    if (Math.abs(changePercent) < 10) {
      continue;
    }

    let reason: string;
    if (changePercent > 0) {
      if (channel.roas > 2) {
        reason = `High ROAS of ${channel.roas.toFixed(2)}x indicates strong performance. Increasing budget could scale conversions.`;
      } else if (channel.roas > 1) {
        reason = `Positive ROAS of ${channel.roas.toFixed(2)}x. Consider gradual increase to test scalability.`;
      } else {
        reason = `Despite lower ROAS, conversion volume suggests potential with optimization.`;
      }
    } else {
      if (channel.roas < 0.5) {
        reason = `Low ROAS of ${channel.roas.toFixed(2)}x. Recommend reducing spend and optimizing before scaling.`;
      } else if (channel.roas < 1) {
        reason = `ROAS below 1x (${channel.roas.toFixed(2)}x). Review targeting and creative before continuing spend.`;
      } else {
        reason = `Better performing channels available. Recommend reallocating to maximize overall return.`;
      }
    }

    recommendations.push({
      channel: channel.channel,
      currentBudget: channel.spend,
      recommendedBudget: idealBudget,
      changePercent,
      reason,
      projectedRoas: channel.roas,
    });
  }

  return recommendations.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

/**
 * Detect creative fatigue
 */
export async function detectCreativeFatigue(
  workspaceId: string,
  period = '30d'
): Promise<CreativeFatigue[]> {
  logger.debug('Detecting creative fatigue', { workspaceId, period });

  const { start, end } = getDateRange(period);
  const midpoint = new Date((start.getTime() + end.getTime()) / 2);

  // Get ad performance for first half and second half of period
  const firstHalfPerformance = await db
    .select({
      adId: adPerformance.adId,
      impressions: sql<number>`SUM(${adPerformance.impressions})`,
      clicks: sql<number>`SUM(${adPerformance.clicks})`,
      frequency: sql<number>`AVG(${adPerformance.frequency}::numeric)`,
    })
    .from(adPerformance)
    .where(
      and(
        eq(adPerformance.workspaceId, workspaceId),
        gte(adPerformance.date, formatDateString(start)),
        lte(adPerformance.date, formatDateString(midpoint))
      )
    )
    .groupBy(adPerformance.adId);

  const secondHalfPerformance = await db
    .select({
      adId: adPerformance.adId,
      impressions: sql<number>`SUM(${adPerformance.impressions})`,
      clicks: sql<number>`SUM(${adPerformance.clicks})`,
      frequency: sql<number>`AVG(${adPerformance.frequency}::numeric)`,
    })
    .from(adPerformance)
    .where(
      and(
        eq(adPerformance.workspaceId, workspaceId),
        gte(adPerformance.date, formatDateString(midpoint)),
        lte(adPerformance.date, formatDateString(end))
      )
    )
    .groupBy(adPerformance.adId);

  // Create lookup for second half
  const secondHalfMap = new Map<string, typeof secondHalfPerformance[0]>();
  for (const perf of secondHalfPerformance) {
    if (perf.adId) {
      secondHalfMap.set(perf.adId, perf);
    }
  }

  const fatigued: CreativeFatigue[] = [];

  // Get ad details
  const adDetails = await db
    .select({
      id: ads.id,
      name: ads.name,
      platform: ads.platform,
      createdAt: ads.createdAt,
      adSetId: ads.adSetId,
    })
    .from(ads)
    .where(eq(ads.workspaceId, workspaceId));

  const adMap = new Map<string, typeof adDetails[0]>();
  for (const ad of adDetails) {
    adMap.set(ad.id, ad);
  }

  // Get campaign names via ad sets
  const adSetDetails = await db
    .select({
      id: adSets.id,
      campaignId: adSets.campaignId,
    })
    .from(adSets)
    .where(eq(adSets.workspaceId, workspaceId));

  const adSetMap = new Map<string, string>();
  for (const adSet of adSetDetails) {
    adSetMap.set(adSet.id, adSet.campaignId);
  }

  const campaignDetails = await db
    .select({
      id: adCampaigns.id,
      name: adCampaigns.name,
    })
    .from(adCampaigns)
    .where(eq(adCampaigns.workspaceId, workspaceId));

  const campaignMap = new Map<string, string>();
  for (const campaign of campaignDetails) {
    campaignMap.set(campaign.id, campaign.name);
  }

  for (const firstPerf of firstHalfPerformance) {
    if (!firstPerf.adId) continue;

    const secondPerf = secondHalfMap.get(firstPerf.adId);
    if (!secondPerf) continue;

    const firstCtr = Number(firstPerf.impressions) > 0
      ? (Number(firstPerf.clicks) / Number(firstPerf.impressions)) * 100
      : 0;
    const secondCtr = Number(secondPerf.impressions) > 0
      ? (Number(secondPerf.clicks) / Number(secondPerf.impressions)) * 100
      : 0;

    const ctrDecline = firstCtr > 0 ? ((firstCtr - secondCtr) / firstCtr) * 100 : 0;
    const frequencyIncrease = Number(firstPerf.frequency) > 0 && Number(secondPerf.frequency) > 0
      ? ((Number(secondPerf.frequency) - Number(firstPerf.frequency)) / Number(firstPerf.frequency)) * 100
      : 0;

    // Check for fatigue indicators
    const hasCtrDecline = ctrDecline > 15; // CTR dropped more than 15%
    const hasHighFrequency = Number(secondPerf.frequency) > 3; // Frequency above 3
    const hasFrequencyIncrease = frequencyIncrease > 20; // Frequency increased by 20%

    if (hasCtrDecline || (hasHighFrequency && hasFrequencyIncrease)) {
      const ad = adMap.get(firstPerf.adId);
      if (!ad) continue;

      const daysSinceCreation = Math.floor(
        (end.getTime() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get campaign name
      const campaignId = ad.adSetId ? adSetMap.get(ad.adSetId) : null;
      const campaignName = campaignId ? campaignMap.get(campaignId) || 'Unknown' : 'Unknown';

      let severity: 'low' | 'medium' | 'high' = 'low';
      let recommendation: string;

      if (ctrDecline > 30 && hasHighFrequency) {
        severity = 'high';
        recommendation = 'Refresh creative immediately. Severe performance decline detected.';
      } else if (ctrDecline > 20 || (hasCtrDecline && hasHighFrequency)) {
        severity = 'medium';
        recommendation = 'Consider refreshing creative or adjusting frequency caps.';
      } else {
        severity = 'low';
        recommendation = 'Monitor performance. Early signs of fatigue detected.';
      }

      fatigued.push({
        adId: firstPerf.adId,
        adName: ad.name,
        channel: ad.platform as MarketingChannel,
        campaign: campaignName,
        daysSinceCreation,
        ctrDecline,
        frequencyIncrease,
        severity,
        recommendation,
      });
    }
  }

  return fatigued.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate marketing suggestions
 */
export async function generateMarketingSuggestions(
  workspaceId: string,
  period = '30d'
): Promise<MarketingSuggestion[]> {
  logger.debug('Generating marketing suggestions', { workspaceId, period });

  const suggestions: MarketingSuggestion[] = [];

  // Get budget recommendations
  const budgetRecs = await getBudgetRecommendations(workspaceId, period);
  for (const rec of budgetRecs.slice(0, 3)) {
    const isIncrease = rec.changePercent > 0;
    suggestions.push({
      id: `budget_${rec.channel}_${Date.now()}`,
      type: 'budget',
      priority: Math.abs(rec.changePercent) > 30 ? 'high' : 'medium',
      title: `${isIncrease ? 'Increase' : 'Decrease'} ${rec.channel.replace('_', ' ')} budget`,
      description: rec.reason,
      impact: Math.abs(rec.changePercent) > 30 ? 'high' : 'medium',
      channel: rec.channel,
      metrics: {
        currentValue: rec.currentBudget,
        projectedValue: rec.recommendedBudget,
        changePercent: rec.changePercent,
      },
      createdAt: new Date(),
    });
  }

  // Get creative fatigue alerts
  const fatigued = await detectCreativeFatigue(workspaceId, period);
  const highFatigue = fatigued.filter((f) => f.severity === 'high');
  for (const ad of highFatigue.slice(0, 3)) {
    suggestions.push({
      id: `fatigue_${ad.adId}_${Date.now()}`,
      type: 'creative',
      priority: 'high',
      title: `Refresh creative for "${ad.adName}"`,
      description: ad.recommendation,
      impact: 'medium',
      channel: ad.channel,
      campaignName: ad.campaign,
      metrics: {
        currentValue: ad.ctrDecline,
        changePercent: -ad.ctrDecline,
      },
      createdAt: new Date(),
    });
  }

  // Get underperforming campaign alerts
  const campaigns = await getCampaignPerformance(workspaceId, period);
  const underperformers = campaigns
    .filter((c) => c.spend > 100 && c.roas < 0.5 && c.status === 'active')
    .slice(0, 3);

  for (const campaign of underperformers) {
    suggestions.push({
      id: `underperform_${campaign.id}_${Date.now()}`,
      type: 'alert',
      priority: 'high',
      title: `Review campaign "${campaign.name}"`,
      description: `This campaign has ${campaign.roas.toFixed(2)}x ROAS with $${campaign.spend.toFixed(0)} spend. Consider pausing or optimizing.`,
      impact: 'high',
      channel: campaign.channel,
      campaignId: campaign.id,
      campaignName: campaign.name,
      metrics: {
        currentValue: campaign.roas,
      },
      createdAt: new Date(),
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

