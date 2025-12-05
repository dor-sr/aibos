/**
 * Marketing NLQ Handler
 */

import { createLogger } from '@aibos/core';
import { detectMarketingIntent } from './intent';
import {
  getMarketingMetricsSummary,
  getChannelPerformance,
  getCampaignPerformance,
  getTopCampaigns,
  getUnderperformingCampaigns,
  getSpendTrend,
} from '../metrics';
import { getBudgetRecommendations, detectCreativeFatigue } from '../recommendations';
import { formatCurrency, formatPercent, formatNumber } from './formatter';
import type { MarketingNLQResult, MarketingChannel } from '../types';

const logger = createLogger('marketing-agent:nlq');

export interface MarketingNLQRequest {
  question: string;
  workspaceId: string;
  currency?: string;
}

/**
 * Handle a marketing natural language question
 */
export async function handleMarketingNLQ(
  request: MarketingNLQRequest
): Promise<MarketingNLQResult> {
  const startTime = Date.now();
  const { question, workspaceId, currency = 'USD' } = request;

  logger.info('Processing marketing question', { workspaceId, question });

  try {
    // Detect intent
    const { intent, channel, period, confidence } = detectMarketingIntent(question);
    logger.debug('Intent detected', { intent, channel, period, confidence });

    let answer: string;
    let data: Record<string, unknown> = {};

    switch (intent) {
      case 'performance_overview':
        ({ answer, data } = await handlePerformanceOverview(workspaceId, period || '30d', currency));
        break;

      case 'channel_performance':
        ({ answer, data } = await handleChannelPerformance(workspaceId, period || '30d', channel, currency));
        break;

      case 'campaign_performance':
        ({ answer, data } = await handleCampaignPerformance(workspaceId, period || '30d', channel, currency));
        break;

      case 'spend_analysis':
        ({ answer, data } = await handleSpendAnalysis(workspaceId, period || '30d', currency));
        break;

      case 'roas_analysis':
        ({ answer, data } = await handleRoasAnalysis(workspaceId, period || '30d', channel, currency));
        break;

      case 'budget_recommendation':
        ({ answer, data } = await handleBudgetRecommendation(workspaceId, period || '30d', currency));
        break;

      case 'creative_fatigue':
        ({ answer, data } = await handleCreativeFatigue(workspaceId, period || '30d'));
        break;

      case 'top_performers':
        ({ answer, data } = await handleTopPerformers(workspaceId, period || '30d', currency));
        break;

      case 'underperformers':
        ({ answer, data } = await handleUnderperformers(workspaceId, period || '30d', currency));
        break;

      case 'trend_analysis':
        ({ answer, data } = await handleTrendAnalysis(workspaceId, period || '30d', currency));
        break;

      default:
        answer = "I'm not sure what you're asking about. Try asking about your marketing performance, channel comparison, campaign results, budget recommendations, or creative fatigue.";
    }

    const duration = Date.now() - startTime;
    logger.info('Marketing NLQ processed', { intent, duration });

    return {
      success: true,
      intent,
      answer,
      data,
      suggestions: getSuggestions(intent),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Marketing NLQ failed', error as Error, { duration });

    return {
      success: false,
      answer: 'Sorry, I encountered an error processing your question. Please try again.',
      error: (error as Error).message,
    };
  }
}

async function handlePerformanceOverview(
  workspaceId: string,
  period: string,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const summary = await getMarketingMetricsSummary(workspaceId, period);

  const answer = `Here's your marketing performance for the last ${period}:

**Total Spend:** ${formatCurrency(summary.totalSpend, currency)} (${formatPercent(summary.spendChange)} vs. previous period)
**Total Revenue:** ${formatCurrency(summary.totalRevenue, currency)} (${formatPercent(summary.revenueChange)} vs. previous period)
**ROAS:** ${summary.overallRoas.toFixed(2)}x (${formatPercent(summary.roasChange)} vs. previous period)
**Conversions:** ${formatNumber(summary.totalConversions)}
**CPC:** ${formatCurrency(summary.overallCpc, currency)}
**CTR:** ${formatPercent(summary.overallCtr)}

${summary.topPerformingChannel ? `Your best performing channel is **${formatChannelName(summary.topPerformingChannel)}**.` : ''}
${summary.worstPerformingChannel && summary.topPerformingChannel !== summary.worstPerformingChannel ? `Consider reviewing **${formatChannelName(summary.worstPerformingChannel)}** for optimization opportunities.` : ''}`;

  return { answer, data: { summary } };
}

async function handleChannelPerformance(
  workspaceId: string,
  period: string,
  channel: MarketingChannel | undefined,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const channels = await getChannelPerformance(workspaceId, period);

  if (channel) {
    const channelData = channels.find((c) => c.channel === channel);
    if (channelData) {
      const answer = `**${formatChannelName(channel)} Performance (${period}):**

- Spend: ${formatCurrency(channelData.spend, currency)}
- Revenue: ${formatCurrency(channelData.revenue, currency)}
- ROAS: ${channelData.roas.toFixed(2)}x
- Conversions: ${formatNumber(channelData.conversions)}
- CPC: ${formatCurrency(channelData.cpc, currency)}
- CTR: ${formatPercent(channelData.ctr)}`;

      return { answer, data: { channel: channelData } };
    }
  }

  // All channels comparison
  const sortedChannels = [...channels].sort((a, b) => b.roas - a.roas);
  const channelSummary = sortedChannels
    .map((c, i) => `${i + 1}. **${formatChannelName(c.channel)}**: ${formatCurrency(c.spend, currency)} spend, ${c.roas.toFixed(2)}x ROAS, ${formatNumber(c.conversions)} conversions`)
    .join('\n');

  const answer = `**Channel Performance Comparison (${period}):**

${channelSummary}

${sortedChannels.length > 1 && sortedChannels[0] ? `**${formatChannelName(sortedChannels[0].channel)}** is your best performing channel with ${sortedChannels[0].roas.toFixed(2)}x ROAS.` : ''}`;

  return { answer, data: { channels: sortedChannels } };
}

async function handleCampaignPerformance(
  workspaceId: string,
  period: string,
  channel: MarketingChannel | undefined,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const campaigns = await getCampaignPerformance(workspaceId, period, channel);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const topCampaigns = activeCampaigns.slice(0, 5);

  const campaignSummary = topCampaigns
    .map((c, i) => `${i + 1}. **${c.name}** (${formatChannelName(c.channel)}): ${formatCurrency(c.spend, currency)} spend, ${c.roas.toFixed(2)}x ROAS, ${formatNumber(c.conversions)} conversions`)
    .join('\n');

  const totalSpend = activeCampaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalConversions = activeCampaigns.reduce((sum, c) => sum + c.conversions, 0);

  const answer = `**Campaign Performance (${period}):**

You have **${activeCampaigns.length}** active campaigns with a total spend of ${formatCurrency(totalSpend, currency)} and ${formatNumber(totalConversions)} conversions.

**Top 5 by Spend:**
${campaignSummary}`;

  return { answer, data: { campaigns: topCampaigns, totalActive: activeCampaigns.length } };
}

async function handleSpendAnalysis(
  workspaceId: string,
  period: string,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const summary = await getMarketingMetricsSummary(workspaceId, period);
  const channels = await getChannelPerformance(workspaceId, period);

  const spendByChannel = channels
    .sort((a, b) => b.spend - a.spend)
    .map((c) => {
      const percent = summary.totalSpend > 0 ? (c.spend / summary.totalSpend) * 100 : 0;
      return `- **${formatChannelName(c.channel)}**: ${formatCurrency(c.spend, currency)} (${percent.toFixed(1)}%)`;
    })
    .join('\n');

  const answer = `**Spend Analysis (${period}):**

**Total Spend:** ${formatCurrency(summary.totalSpend, currency)}
${summary.spendChange !== 0 ? `(${formatPercent(summary.spendChange)} vs. previous period)` : ''}

**Breakdown by Channel:**
${spendByChannel}

**Efficiency Metrics:**
- Cost per Click: ${formatCurrency(summary.overallCpc, currency)}
- Cost per Conversion: ${formatCurrency(summary.overallCpa, currency)}
- ROAS: ${summary.overallRoas.toFixed(2)}x`;

  return { answer, data: { summary, channels } };
}

async function handleRoasAnalysis(
  workspaceId: string,
  period: string,
  channel: MarketingChannel | undefined,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const channels = await getChannelPerformance(workspaceId, period);
  const campaigns = await getCampaignPerformance(workspaceId, period, channel);

  const sortedChannels = [...channels].sort((a, b) => b.roas - a.roas);
  const topRoasCampaigns = [...campaigns]
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5);

  const channelRoas = sortedChannels
    .map((c) => `- **${formatChannelName(c.channel)}**: ${c.roas.toFixed(2)}x (${formatCurrency(c.revenue, currency)} revenue from ${formatCurrency(c.spend, currency)} spend)`)
    .join('\n');

  const campaignRoas = topRoasCampaigns
    .map((c) => `- **${c.name}**: ${c.roas.toFixed(2)}x`)
    .join('\n');

  const answer = `**ROAS Analysis (${period}):**

**By Channel:**
${channelRoas}

**Top 5 Campaigns by ROAS:**
${campaignRoas}

${sortedChannels[0] && sortedChannels[0].roas > 1 ? `Your best channel (${formatChannelName(sortedChannels[0].channel)}) is returning ${formatCurrency(sortedChannels[0].roas, currency)} for every $1 spent.` : 'Consider optimizing your campaigns to improve ROAS above 1x.'}`;

  return { answer, data: { channels: sortedChannels, topCampaigns: topRoasCampaigns } };
}

async function handleBudgetRecommendation(
  workspaceId: string,
  period: string,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const recommendations = await getBudgetRecommendations(workspaceId, period);

  if (recommendations.length === 0) {
    return {
      answer: 'Not enough data to provide budget recommendations. Run your campaigns for at least a week to get meaningful insights.',
      data: { recommendations: [] },
    };
  }

  const recSummary = recommendations
    .map((r) => {
      const direction = r.changePercent > 0 ? 'Increase' : 'Decrease';
      return `- **${formatChannelName(r.channel)}**: ${direction} by ${Math.abs(r.changePercent).toFixed(0)}% (${formatCurrency(r.currentBudget, currency)} -> ${formatCurrency(r.recommendedBudget, currency)})\n  Reason: ${r.reason}\n  Projected ROAS: ${r.projectedRoas.toFixed(2)}x`;
    })
    .join('\n\n');

  const answer = `**Budget Allocation Recommendations:**

Based on your performance over the last ${period}, here are my recommendations:

${recSummary}

These recommendations are based on ROAS performance, conversion efficiency, and channel scalability.`;

  return { answer, data: { recommendations } };
}

async function handleCreativeFatigue(
  workspaceId: string,
  period: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const fatigued = await detectCreativeFatigue(workspaceId, period);

  if (fatigued.length === 0) {
    return {
      answer: 'No significant creative fatigue detected. Your ads appear to be performing consistently.',
      data: { fatigued: [] },
    };
  }

  const highPriority = fatigued.filter((f) => f.severity === 'high');
  const mediumPriority = fatigued.filter((f) => f.severity === 'medium');

  let answer = `**Creative Fatigue Analysis:**

Found ${fatigued.length} ads showing signs of fatigue.

`;

  if (highPriority.length > 0) {
    const highList = highPriority
      .map((f) => `- **${f.adName}** (${f.campaign}): CTR declined ${formatPercent(f.ctrDecline)}, running for ${f.daysSinceCreation} days`)
      .join('\n');
    answer += `**High Priority (Refresh Soon):**\n${highList}\n\n`;
  }

  if (mediumPriority.length > 0) {
    const mediumList = mediumPriority
      .map((f) => `- **${f.adName}** (${f.campaign}): ${f.recommendation}`)
      .join('\n');
    answer += `**Medium Priority (Monitor):**\n${mediumList}\n\n`;
  }

  answer += 'Consider refreshing creatives for high-priority ads to maintain performance.';

  return { answer, data: { fatigued } };
}

async function handleTopPerformers(
  workspaceId: string,
  period: string,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const topByRoas = await getTopCampaigns(workspaceId, period, 'roas', 5);
  const topByRevenue = await getTopCampaigns(workspaceId, period, 'revenue', 5);

  const roasList = topByRoas
    .map((c, i) => `${i + 1}. **${c.name}**: ${c.roas.toFixed(2)}x ROAS, ${formatCurrency(c.revenue, currency)} revenue`)
    .join('\n');

  const revenueList = topByRevenue
    .map((c, i) => `${i + 1}. **${c.name}**: ${formatCurrency(c.revenue, currency)} revenue, ${c.roas.toFixed(2)}x ROAS`)
    .join('\n');

  const answer = `**Top Performing Campaigns (${period}):**

**By ROAS:**
${roasList}

**By Revenue:**
${revenueList}

Consider increasing budget on your top performers to scale success.`;

  return { answer, data: { topByRoas, topByRevenue } };
}

async function handleUnderperformers(
  workspaceId: string,
  period: string,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const underperformers = await getUnderperformingCampaigns(workspaceId, period, 1.0);

  if (underperformers.length === 0) {
    return {
      answer: 'Great news! All your active campaigns have ROAS above 1.0.',
      data: { underperformers: [] },
    };
  }

  const wastedSpend = underperformers.reduce((sum, c) => sum + (c.spend - c.revenue), 0);

  const list = underperformers
    .slice(0, 10)
    .map((c, i) => `${i + 1}. **${c.name}** (${formatChannelName(c.channel)}): ${c.roas.toFixed(2)}x ROAS, ${formatCurrency(c.spend - c.revenue, currency)} negative return`)
    .join('\n');

  const answer = `**Underperforming Campaigns (ROAS < 1.0):**

Found ${underperformers.length} campaigns with negative return.
**Total Potential Waste:** ${formatCurrency(wastedSpend, currency)}

${list}

**Recommendations:**
- Pause campaigns with consistently low ROAS
- Review targeting and creative for improvement opportunities
- Consider reallocating budget to top performers`;

  return { answer, data: { underperformers, wastedSpend } };
}

async function handleTrendAnalysis(
  workspaceId: string,
  period: string,
  currency: string
): Promise<{ answer: string; data: Record<string, unknown> }> {
  const trend = await getSpendTrend(workspaceId, period);

  if (trend.length === 0) {
    return {
      answer: 'Not enough data for trend analysis.',
      data: { trend: [] },
    };
  }

  const avgSpend = trend.reduce((sum, t) => sum + t.spend, 0) / trend.length;
  const avgRoas = trend.reduce((sum, t) => sum + t.roas, 0) / trend.length;

  const recentDays = trend.slice(-7);
  const recentAvgRoas = recentDays.reduce((sum, t) => sum + t.roas, 0) / recentDays.length;

  const roasTrend = recentAvgRoas > avgRoas ? 'improving' : recentAvgRoas < avgRoas ? 'declining' : 'stable';

  const answer = `**Performance Trend Analysis (${period}):**

**Average Daily Spend:** ${formatCurrency(avgSpend, currency)}
**Average ROAS:** ${avgRoas.toFixed(2)}x

**Recent Trend (Last 7 Days):**
- Average ROAS: ${recentAvgRoas.toFixed(2)}x
- Trend: ${roasTrend.charAt(0).toUpperCase() + roasTrend.slice(1)}

${roasTrend === 'declining' ? 'Consider reviewing recent changes to campaigns or market conditions.' : roasTrend === 'improving' ? 'Your optimization efforts appear to be paying off!' : 'Performance is stable. Look for new optimization opportunities.'}`;

  return { answer, data: { trend, avgSpend, avgRoas, roasTrend } };
}

function formatChannelName(channel: MarketingChannel): string {
  const names: Record<MarketingChannel, string> = {
    meta_ads: 'Meta Ads',
    google_ads: 'Google Ads',
    tiktok_ads: 'TikTok Ads',
    linkedin_ads: 'LinkedIn Ads',
    email: 'Email',
    sms: 'SMS',
  };
  return names[channel] || channel;
}

function getSuggestions(intent: string): string[] {
  const defaultSuggestions = [
    'How is my marketing performing?',
    'Show me my top campaigns',
    'Which channels are underperforming?',
  ];
  
  const suggestionMap: Record<string, string[]> = {
    performance_overview: [
      'Which channel is performing best?',
      'Show me my top campaigns',
      'How should I allocate my budget?',
    ],
    channel_performance: [
      'Compare my campaigns',
      'What is my ROAS by channel?',
      'Which campaigns are underperforming?',
    ],
    campaign_performance: [
      'Show me top performing campaigns',
      'Which campaigns should I pause?',
      'How has performance changed this week?',
    ],
    spend_analysis: [
      'What is my ROAS?',
      'Which channel gives best return?',
      'How should I reallocate budget?',
    ],
  };

  return suggestionMap[intent] ?? defaultSuggestions;
}

