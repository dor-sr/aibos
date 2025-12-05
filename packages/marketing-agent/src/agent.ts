import { createLogger } from '@aibos/core';
import { createDefaultProvider, type LLMProviderInterface } from '@aibos/ai-runtime';
import type {
  MarketingAgentConfig,
  ChannelPerformance,
  CampaignPerformance,
  MarketingSuggestion,
  CreativeRequest,
  CreativeAsset,
  MarketingNLQResult,
  MarketingMetricsSummary,
  BudgetAllocation,
  CreativeFatigue,
} from './types';
import { handleMarketingNLQ } from './nlq';
import {
  getMarketingMetricsSummary,
  getChannelPerformance,
  getCampaignPerformance,
  getTopCampaigns,
  getUnderperformingCampaigns,
  getSpendTrend,
} from './metrics';
import {
  getBudgetRecommendations,
  detectCreativeFatigue,
  generateMarketingSuggestions,
} from './recommendations';
import { generateCreatives, generateAdVariations } from './generation';

const logger = createLogger('marketing-agent');

/**
 * Marketing Agent - Full Implementation
 *
 * Provides comprehensive marketing intelligence including:
 * - Natural language queries about marketing performance
 * - Channel and campaign performance analysis
 * - Budget allocation recommendations
 * - Creative fatigue detection
 * - Ad copy generation
 */
export class MarketingAgent {
  private config: MarketingAgentConfig;
  private provider: LLMProviderInterface;

  constructor(config: MarketingAgentConfig) {
    this.config = config;
    this.provider = createDefaultProvider();

    logger.info('Marketing Agent initialized', {
      workspaceId: config.workspaceId,
      channels: config.connectedChannels,
    });
  }

  /**
   * Ask a natural language question about marketing
   */
  async ask(question: string): Promise<MarketingNLQResult> {
    logger.info('Processing marketing question', {
      workspaceId: this.config.workspaceId,
      question,
    });

    return handleMarketingNLQ({
      question,
      workspaceId: this.config.workspaceId,
      currency: this.config.currency || 'USD',
    });
  }

  /**
   * Get overall marketing metrics summary
   */
  async getMetricsSummary(period = '30d'): Promise<MarketingMetricsSummary> {
    logger.info('Getting marketing metrics summary', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return getMarketingMetricsSummary(this.config.workspaceId, period);
  }

  /**
   * Get aggregated channel performance
   */
  async getChannelPerformance(period = '30d'): Promise<ChannelPerformance[]> {
    logger.info('Getting channel performance', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return getChannelPerformance(this.config.workspaceId, period);
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(period = '30d'): Promise<CampaignPerformance[]> {
    logger.info('Getting campaign performance', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return getCampaignPerformance(this.config.workspaceId, period);
  }

  /**
   * Get top performing campaigns
   */
  async getTopCampaigns(
    period = '30d',
    metric: 'roas' | 'conversions' | 'revenue' | 'ctr' = 'roas',
    limit = 5
  ): Promise<CampaignPerformance[]> {
    logger.info('Getting top campaigns', {
      workspaceId: this.config.workspaceId,
      period,
      metric,
    });

    return getTopCampaigns(this.config.workspaceId, period, metric, limit);
  }

  /**
   * Get underperforming campaigns
   */
  async getUnderperformingCampaigns(
    period = '30d',
    roasThreshold = 1.0
  ): Promise<CampaignPerformance[]> {
    logger.info('Getting underperforming campaigns', {
      workspaceId: this.config.workspaceId,
      period,
      roasThreshold,
    });

    return getUnderperformingCampaigns(this.config.workspaceId, period, roasThreshold);
  }

  /**
   * Get spend trend over time
   */
  async getSpendTrend(
    period = '30d'
  ): Promise<Array<{ date: string; spend: number; revenue: number; roas: number }>> {
    logger.info('Getting spend trend', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return getSpendTrend(this.config.workspaceId, period);
  }

  /**
   * Get budget allocation recommendations
   */
  async getBudgetRecommendations(period = '30d'): Promise<BudgetAllocation[]> {
    logger.info('Getting budget recommendations', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return getBudgetRecommendations(this.config.workspaceId, period);
  }

  /**
   * Detect creative fatigue
   */
  async detectCreativeFatigue(period = '30d'): Promise<CreativeFatigue[]> {
    logger.info('Detecting creative fatigue', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return detectCreativeFatigue(this.config.workspaceId, period);
  }

  /**
   * Get marketing suggestions
   */
  async getSuggestions(period = '30d'): Promise<MarketingSuggestion[]> {
    logger.info('Getting marketing suggestions', {
      workspaceId: this.config.workspaceId,
      period,
    });

    return generateMarketingSuggestions(this.config.workspaceId, period);
  }

  /**
   * Generate creative assets
   */
  async generateCreative(request: CreativeRequest): Promise<CreativeAsset[]> {
    logger.info('Generating creative', {
      workspaceId: this.config.workspaceId,
      type: request.type,
      count: request.count,
    });

    return generateCreatives(this.config.workspaceId, request, this.provider);
  }

  /**
   * Generate ad variations for A/B testing
   */
  async generateAdVariations(
    request: CreativeRequest,
    variationCount = 3
  ): Promise<{
    headlines: CreativeAsset[];
    descriptions: CreativeAsset[];
    fullCopy: CreativeAsset[];
  }> {
    logger.info('Generating ad variations', {
      workspaceId: this.config.workspaceId,
      variationCount,
    });

    return generateAdVariations(
      this.config.workspaceId,
      request,
      variationCount,
      this.provider
    );
  }

  /**
   * Get question suggestions based on context
   */
  getSuggestedQuestions(): string[] {
    const baseQuestions = [
      'How is my marketing performing?',
      'Which channel is giving the best ROAS?',
      'Show me my top campaigns',
      'Which campaigns should I pause?',
      'How should I allocate my budget?',
    ];

    if (this.config.connectedChannels.includes('meta_ads')) {
      baseQuestions.push('How are my Meta ads performing?');
    }

    if (this.config.connectedChannels.includes('google_ads')) {
      baseQuestions.push('How are my Google ads performing?');
    }

    return baseQuestions;
  }
}

/**
 * Create a Marketing Agent instance
 */
export function createMarketingAgent(config: MarketingAgentConfig): MarketingAgent {
  return new MarketingAgent(config);
}
