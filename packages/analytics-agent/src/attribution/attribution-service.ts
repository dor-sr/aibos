/**
 * Attribution Service
 * 
 * Main service for attribution modeling that manages touchpoints,
 * conversions, and attribution calculations.
 * Note: Database operations use stubs - implement with actual queries in production.
 */

import { createLogger } from '@aibos/core';
import type {
  AttributionModel,
  MarketingChannel,
  Touchpoint,
  CustomerJourney,
  CustomerAttributionResult,
  ExtendedChannelAttribution,
  ModelComparison,
} from './types';
import { AttributionCalculator, createAttributionCalculator } from './attribution-calculator';

const logger = createLogger('attribution:service');

export interface AttributionAnalysisResult {
  model: AttributionModel;
  periodStart: Date;
  periodEnd: Date;
  totalConversions: number;
  totalRevenue: number;
  channelAttribution: ExtendedChannelAttribution[];
  insights: string[];
  recommendations: string[];
}

/**
 * Attribution Service class
 */
export class AttributionService {
  private workspaceId: string;
  private calculator: AttributionCalculator;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.calculator = createAttributionCalculator();
  }

  /**
   * Record a marketing touchpoint
   */
  async recordTouchpoint(
    customerId: string,
    channel: MarketingChannel,
    options: {
      campaign?: string;
      source?: string;
      medium?: string;
      content?: string;
      landingPage?: string;
    } = {}
  ): Promise<Touchpoint> {
    const id = crypto.randomUUID();
    const now = new Date();

    const touchpoint: Touchpoint = {
      id,
      customerId,
      channel,
      campaign: options.campaign,
      source: options.source,
      medium: options.medium,
      content: options.content,
      landingPage: options.landingPage,
      timestamp: now,
    };

    // Stub: In production, save to database

    logger.debug('Touchpoint recorded', {
      touchpointId: id,
      customerId,
      channel,
    });

    return touchpoint;
  }

  /**
   * Record a conversion
   */
  async recordConversion(
    customerId: string,
    conversionValue: number,
    conversionType: string = 'purchase'
  ): Promise<{ customerId: string; conversionValue: number; conversionType: string; timestamp: Date }> {
    const now = new Date();

    // Stub: In production, save conversion and update touchpoints

    logger.info('Conversion recorded', {
      customerId,
      conversionValue,
      conversionType,
    });

    return {
      customerId,
      conversionValue,
      conversionType,
      timestamp: now,
    };
  }

  /**
   * Run attribution analysis
   */
  async runAttribution(options: {
    model?: AttributionModel;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<AttributionAnalysisResult> {
    const {
      model = 'linear',
      startDate = this.getDefaultStartDate(),
      endDate = new Date(),
    } = options;

    logger.info('Running attribution analysis', {
      workspaceId: this.workspaceId,
      model,
    });

    // Stub: In production, fetch actual journeys from database
    const journeys: CustomerJourney[] = [];

    // Calculate attribution
    const results = this.calculator.calculateAttribution(journeys, model);

    // Generate channel summary
    const channelAttribution = this.aggregateByChannel(results);

    // Calculate totals
    const totalConversions = results.length;
    const totalRevenue = results.reduce((sum, r) => sum + r.conversionValue, 0);

    // Generate insights
    const insights = this.generateInsights(channelAttribution, totalConversions);

    // Generate recommendations
    const recommendations = this.generateRecommendations(channelAttribution);

    logger.info('Attribution analysis complete', {
      model,
      totalConversions,
    });

    return {
      model,
      periodStart: startDate,
      periodEnd: endDate,
      totalConversions,
      totalRevenue,
      channelAttribution,
      insights,
      recommendations,
    };
  }

  /**
   * Compare attribution models
   */
  async compareModels(options: {
    models?: AttributionModel[];
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<ModelComparison> {
    const {
      models = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'],
    } = options;

    // Stub: In production, fetch actual journeys
    const journeys: CustomerJourney[] = [];

    const comparison = this.calculator.compareModels(journeys, models);

    // Generate comparison insights
    const insights = this.generateComparisonInsights(comparison);

    return {
      ...comparison,
      insights,
    };
  }

  /**
   * Get customer journey
   */
  async getCustomerJourney(_customerId: string): Promise<CustomerJourney | null> {
    // Stub: In production, build journey from touchpoints and orders
    return null;
  }

  /**
   * Get top performing channels
   */
  async getTopChannels(
    model: AttributionModel = 'linear',
    limit: number = 5
  ): Promise<ExtendedChannelAttribution[]> {
    const analysis = await this.runAttribution({ model });
    return analysis.channelAttribution
      .sort((a, b) => b.attributedRevenue - a.attributedRevenue)
      .slice(0, limit);
  }

  /**
   * Aggregate attribution results by channel
   */
  private aggregateByChannel(results: CustomerAttributionResult[]): ExtendedChannelAttribution[] {
    const channelMap = new Map<string, {
      conversions: number;
      revenue: number;
      touchpoints: number;
    }>();

    for (const result of results) {
      for (const attribution of result.channelAttributions) {
        const existing = channelMap.get(attribution.channel) || {
          conversions: 0,
          revenue: 0,
          touchpoints: 0,
        };

        existing.conversions += attribution.contribution;
        existing.revenue += attribution.revenue;
        existing.touchpoints += 1;

        channelMap.set(attribution.channel, existing);
      }
    }

    const totalRevenue = results.reduce((sum, r) => sum + r.conversionValue, 0);
    const channelAttribution: ExtendedChannelAttribution[] = [];

    for (const [channel, data] of channelMap) {
      channelAttribution.push({
        channel: channel as MarketingChannel,
        conversions: data.conversions,
        revenue: data.revenue,
        attributedConversions: data.conversions,
        attributedRevenue: data.revenue,
        contribution: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        avgTouchpointsToConversion: data.conversions > 0 ? data.touchpoints / data.conversions : 0,
        percentageOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        touchpoints: data.touchpoints,
        avgTouchpointsPerConversion: data.conversions > 0 ? data.touchpoints / data.conversions : 0,
      });
    }

    return channelAttribution.sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  /**
   * Generate insights from attribution analysis
   */
  private generateInsights(
    channelAttribution: ExtendedChannelAttribution[],
    totalConversions: number
  ): string[] {
    const insights: string[] = [];

    if (channelAttribution.length === 0) {
      return ['No attribution data available for the selected period.'];
    }

    const topChannel = channelAttribution[0];
    if (topChannel) {
      insights.push(
        `${topChannel.channel} is the top performing channel with ${topChannel.percentageOfTotal.toFixed(1)}% of attributed revenue.`
      );
    }

    const bottomChannel = channelAttribution[channelAttribution.length - 1];
    if (bottomChannel && channelAttribution.length > 1) {
      insights.push(
        `${bottomChannel.channel} contributes only ${bottomChannel.percentageOfTotal.toFixed(1)}% - consider optimizing or reallocating budget.`
      );
    }

    if (totalConversions > 0) {
      const avgTouchpoints = channelAttribution.reduce((sum, c) => sum + c.avgTouchpointsPerConversion, 0) / channelAttribution.length;
      insights.push(
        `Average customer journey has ${avgTouchpoints.toFixed(1)} touchpoints before conversion.`
      );
    }

    return insights;
  }

  /**
   * Generate recommendations from attribution analysis
   */
  private generateRecommendations(channelAttribution: ExtendedChannelAttribution[]): string[] {
    const recommendations: string[] = [];

    if (channelAttribution.length === 0) {
      return ['Start tracking touchpoints to enable attribution analysis.'];
    }

    const topChannels = channelAttribution.slice(0, 3);
    const channels = topChannels.map((c) => c.channel).join(', ');
    recommendations.push(`Focus budget on top performers: ${channels}`);

    const lowPerformers = channelAttribution.filter((c) => c.percentageOfTotal < 5);
    if (lowPerformers.length > 0) {
      recommendations.push(
        `Review and optimize low-performing channels: ${lowPerformers.map((c) => c.channel).join(', ')}`
      );
    }

    recommendations.push('Compare multiple attribution models to get a complete picture.');

    return recommendations.slice(0, 4);
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(comparison: ModelComparison): string[] {
    const insights: string[] = [];

    // Find channels with biggest variance across models
    const channels = comparison.modelResults[0]?.channelAttribution.map((c: ExtendedChannelAttribution) => c.channel) || [];
    
    for (const channel of channels.slice(0, 3)) {
      const attributions = comparison.modelResults
        .map((m) => m.channelAttribution.find((c: ExtendedChannelAttribution) => c.channel === channel))
        .filter((a): a is ExtendedChannelAttribution => a !== undefined);

      if (attributions.length > 1) {
        const percentages = attributions.map((a) => a.percentageOfTotal);
        const variance = Math.max(...percentages) - Math.min(...percentages);
        
        if (variance > 10) {
          insights.push(
            `${channel} attribution varies by ${variance.toFixed(0)}% across models - consider multi-touch analysis.`
          );
        }
      }
    }

    return insights.length > 0 ? insights : ['Models show consistent attribution patterns.'];
  }

  /**
   * Get default start date (30 days ago)
   */
  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }
}

// Export factory function
export function createAttributionService(workspaceId: string): AttributionService {
  return new AttributionService(workspaceId);
}

/**
 * Quick helper for attribution analysis
 */
export async function runAttributionAnalysis(
  workspaceId: string,
  model?: AttributionModel
): Promise<AttributionAnalysisResult> {
  const service = createAttributionService(workspaceId);
  return service.runAttribution({ model });
}
