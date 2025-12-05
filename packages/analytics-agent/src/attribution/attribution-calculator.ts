/**
 * Attribution Calculator
 * 
 * Calculates channel attribution using various models.
 */

import { createLogger } from '@aibos/core';
import type {
  AttributionModel,
  Touchpoint,
  CustomerJourney,
  CustomerAttributionResult,
  ExtendedChannelAttribution,
  ModelComparison,
} from './types';

const logger = createLogger('attribution:calculator');

/**
 * Attribution Calculator class
 */
export class AttributionCalculator {
  /**
   * Calculate attribution for customer journeys
   */
  calculateAttribution(
    journeys: CustomerJourney[],
    model: AttributionModel
  ): CustomerAttributionResult[] {
    const results: CustomerAttributionResult[] = [];

    for (const journey of journeys) {
      if (journey.touchpoints.length === 0 || !journey.converted) {
        continue;
      }

      const attributions = this.calculateJourneyAttribution(journey, model);
      
      results.push({
        customerId: journey.customerId,
        conversionValue: journey.conversionValue,
        touchpointCount: journey.touchpoints.length,
        channelAttributions: attributions,
        model,
      });
    }

    logger.debug('Attribution calculated', {
      model,
      journeyCount: journeys.length,
      resultCount: results.length,
    });

    return results;
  }

  /**
   * Calculate attribution for a single journey
   */
  private calculateJourneyAttribution(
    journey: CustomerJourney,
    model: AttributionModel
  ): CustomerAttributionResult['channelAttributions'] {
    const touchpoints = journey.touchpoints;
    const weights = this.calculateWeights(touchpoints, model);

    const attributions: CustomerAttributionResult['channelAttributions'] = [];

    for (let i = 0; i < touchpoints.length; i++) {
      const tp = touchpoints[i];
      const weight = weights[i];

      if (tp && weight !== undefined) {
        attributions.push({
          channel: tp.channel,
          touchpointId: tp.id,
          contribution: weight,
          revenue: journey.conversionValue * weight,
          position: i + 1,
          timestamp: tp.timestamp,
        });
      }
    }

    return attributions;
  }

  /**
   * Calculate weights based on attribution model
   */
  private calculateWeights(touchpoints: Touchpoint[], model: AttributionModel): number[] {
    const n = touchpoints.length;
    if (n === 0) return [];

    switch (model) {
      case 'first_touch':
        return this.firstTouchWeights(n);

      case 'last_touch':
        return this.lastTouchWeights(n);

      case 'linear':
        return this.linearWeights(n);

      case 'time_decay':
        return this.timeDecayWeights(touchpoints);

      case 'position_based':
        return this.positionBasedWeights(n);

      case 'data_driven':
        // Simplified - would need ML model in production
        return this.linearWeights(n);

      default:
        return this.linearWeights(n);
    }
  }

  /**
   * First touch attribution - all credit to first touchpoint
   */
  private firstTouchWeights(n: number): number[] {
    const weights = new Array(n).fill(0);
    weights[0] = 1;
    return weights;
  }

  /**
   * Last touch attribution - all credit to last touchpoint
   */
  private lastTouchWeights(n: number): number[] {
    const weights = new Array(n).fill(0);
    weights[n - 1] = 1;
    return weights;
  }

  /**
   * Linear attribution - equal credit to all touchpoints
   */
  private linearWeights(n: number): number[] {
    return new Array(n).fill(1 / n);
  }

  /**
   * Time decay attribution - more credit to recent touchpoints
   */
  private timeDecayWeights(touchpoints: Touchpoint[]): number[] {
    if (touchpoints.length === 0) return [];
    if (touchpoints.length === 1) return [1];

    const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const lastTp = touchpoints[touchpoints.length - 1];
    const lastTime = lastTp ? lastTp.timestamp.getTime() : Date.now();

    const rawWeights = touchpoints.map((tp) => {
      const timeDiff = lastTime - tp.timestamp.getTime();
      return Math.pow(0.5, timeDiff / halfLife);
    });

    const total = rawWeights.reduce((a, b) => a + b, 0);
    return rawWeights.map((w) => w / total);
  }

  /**
   * Position based attribution - 40% first, 40% last, 20% middle
   */
  private positionBasedWeights(n: number): number[] {
    if (n === 1) return [1];
    if (n === 2) return [0.5, 0.5];

    const weights = new Array(n).fill(0);
    weights[0] = 0.4;
    weights[n - 1] = 0.4;

    const middleWeight = 0.2 / (n - 2);
    for (let i = 1; i < n - 1; i++) {
      weights[i] = middleWeight;
    }

    return weights;
  }

  /**
   * Compare multiple attribution models
   */
  compareModels(
    journeys: CustomerJourney[],
    models: AttributionModel[]
  ): ModelComparison {
    const modelResults: ModelComparison['modelResults'] = [];

    for (const model of models) {
      const results = this.calculateAttribution(journeys, model);
      const channelAttribution = this.aggregateByChannel(results);
      
      modelResults.push({
        model,
        channelAttribution,
      });
    }

    // Find channels with most variance
    const channelVariance = this.calculateChannelVariance(modelResults);

    return {
      modelResults,
      channelVariance,
      insights: [],
    };
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
        channel: channel as any,
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
   * Calculate channel variance across models
   */
  private calculateChannelVariance(
    modelResults: ModelComparison['modelResults']
  ): { channel: string; variance: number }[] {
    const channelPercentages = new Map<string, number[]>();

    for (const { channelAttribution } of modelResults) {
      for (const ca of channelAttribution) {
        const percentages = channelPercentages.get(ca.channel) || [];
        percentages.push(ca.percentageOfTotal);
        channelPercentages.set(ca.channel, percentages);
      }
    }

    const variance: { channel: string; variance: number }[] = [];

    for (const [channel, percentages] of channelPercentages) {
      if (percentages.length > 1) {
        const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        const v = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
        variance.push({ channel, variance: Math.sqrt(v) });
      }
    }

    return variance.sort((a, b) => b.variance - a.variance);
  }
}

// Export factory function
export function createAttributionCalculator(): AttributionCalculator {
  return new AttributionCalculator();
}
