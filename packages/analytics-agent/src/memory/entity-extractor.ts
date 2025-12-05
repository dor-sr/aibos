/**
 * Entity Extractor
 * 
 * Extracts entities from user messages for conversational context.
 */

import { createLogger } from '@aibos/core';
import type { ExtractedEntity, EntityType } from './types';

const logger = createLogger('memory:entity-extractor');

// Patterns for entity extraction
const PATTERNS: Record<string, { type: EntityType; pattern: RegExp; extract: (match: RegExpMatchArray) => string }[]> = {
  dates: [
    { type: 'date_range', pattern: /(?:from|between)\s+(\w+\s+\d+(?:st|nd|rd|th)?(?:\s+\d{4})?)\s+(?:to|and|until)\s+(\w+\s+\d+(?:st|nd|rd|th)?(?:\s+\d{4})?)/gi, extract: (m) => `${m[1] || ''} to ${m[2] || ''}` },
    { type: 'time_period', pattern: /(?:last|past|previous)\s+(\d+)?\s*(day|week|month|quarter|year)s?/gi, extract: (m) => `${m[1] || '1'} ${m[2] || 'day'}s` },
    { type: 'time_period', pattern: /this\s+(week|month|quarter|year)/gi, extract: (m) => `this ${m[1] || 'month'}` },
    { type: 'time_period', pattern: /(?:yesterday|today|this week|last week|this month|last month)/gi, extract: (m) => m[0] || '' },
  ],
  metrics: [
    { type: 'metric', pattern: /(?:total|average|avg|sum|count|number of)\s+(revenue|sales|orders|customers|users|subscribers|mrr|arr|aov|ltv|churn|retention)/gi, extract: (m) => m[0] || '' },
    { type: 'metric', pattern: /\b(revenue|sales|orders|customers|users|subscribers|mrr|arr|aov|ltv|churn rate|retention rate|conversion rate)\b/gi, extract: (m) => m[1] || '' },
  ],
  channels: [
    { type: 'channel', pattern: /(?:from|via|through|channel)\s+(google|facebook|instagram|email|organic|direct|referral|social|paid|affiliate)/gi, extract: (m) => m[1] || '' },
    { type: 'channel', pattern: /\b(google ads?|facebook ads?|instagram|tiktok|email marketing|organic search|direct traffic)\b/gi, extract: (m) => m[1] || '' },
  ],
  products: [
    { type: 'product', pattern: /(?:product|item|sku)\s+["\']?([^"'\s,]+)["\']?/gi, extract: (m) => m[1] || '' },
    { type: 'product', pattern: /\bsku\s*[:=]?\s*([A-Z0-9-]+)\b/gi, extract: (m) => m[1] || '' },
  ],
  customers: [
    { type: 'customer', pattern: /customer\s+(?:id|#)?\s*[:=]?\s*([A-Za-z0-9-]+)/gi, extract: (m) => m[1] || '' },
    { type: 'customer', pattern: /(?:customer|user)\s+["\']([^"']+)["\']?/gi, extract: (m) => m[1] || '' },
  ],
  numbers: [
    { type: 'number', pattern: /\$\s*([\d,]+(?:\.\d{2})?)/g, extract: (m) => m[1] || '' },
    { type: 'percentage', pattern: /(\d+(?:\.\d+)?)\s*%/g, extract: (m) => `${m[1] || '0'}%` },
    { type: 'number', pattern: /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:orders|customers|users|items)/gi, extract: (m) => m[1] || '' },
  ],
  segments: [
    { type: 'segment', pattern: /\b(champions?|loyal customers?|at risk|churned?|new customers?|vip|high value)\b/gi, extract: (m) => m[1] || '' },
  ],
};

/**
 * Entity Extractor class
 */
export class EntityExtractor {
  /**
   * Extract entities from text
   */
  extract(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, patterns] of Object.entries(PATTERNS)) {
      for (const { type, pattern, extract } of patterns) {
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
        
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const value = extract(match);
          if (value && value.trim()) {
            entities.push({
              type,
              value: value.trim(),
              confidence: this.calculateConfidence(type, value, lowerText),
              startIndex: match.index,
              endIndex: match.index + match[0].length,
            });
          }
        }
      }
    }

    // Deduplicate and prioritize
    return this.deduplicateEntities(entities);
  }

  /**
   * Merge entities from multiple messages
   */
  mergeEntities(existingEntities: ExtractedEntity[], newEntities: ExtractedEntity[]): ExtractedEntity[] {
    const merged = [...existingEntities];

    for (const entity of newEntities) {
      const existing = merged.find(
        (e) => e.type === entity.type && e.value.toLowerCase() === entity.value.toLowerCase()
      );

      if (!existing) {
        merged.push(entity);
      } else if (entity.confidence > existing.confidence) {
        const index = merged.indexOf(existing);
        merged[index] = entity;
      }
    }

    return merged;
  }

  /**
   * Get most relevant entities by type
   */
  getEntitiesByType(entities: ExtractedEntity[], type: EntityType): ExtractedEntity[] {
    return entities
      .filter((e) => e.type === type)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate entity confidence
   */
  private calculateConfidence(type: EntityType, value: string, context: string): number {
    let confidence = 0.7; // Base confidence

    // Boost for exact matches
    if (context.includes(value.toLowerCase())) {
      confidence += 0.1;
    }

    // Boost for specific entity types
    if (type === 'metric' && ['revenue', 'orders', 'customers', 'mrr'].includes(value.toLowerCase())) {
      confidence += 0.1;
    }

    if (type === 'time_period' && value.includes('last')) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Remove duplicate entities and prioritize by confidence
   */
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);

      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => {
        const typePriority = this.getTypePriority(a.type) - this.getTypePriority(b.type);
        if (typePriority !== 0) return typePriority;
        return b.confidence - a.confidence;
      });
  }

  /**
   * Get priority for entity type (lower = higher priority)
   */
  private getTypePriority(type: EntityType): number {
    const priorities: Record<EntityType, number> = {
      metric: 1,
      time_period: 2,
      date_range: 3,
      product: 4,
      customer: 5,
      segment: 6,
      channel: 7,
      campaign: 8,
      currency: 9,
      percentage: 10,
      number: 11,
    };
    return priorities[type] || 99;
  }
}

// Export singleton instance
export const entityExtractor = new EntityExtractor();

// Export factory function
export function createEntityExtractor(): EntityExtractor {
  return new EntityExtractor();
}

/**
 * Merge entities and remove duplicates
 */
export function mergeEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const instance = createEntityExtractor();
  return instance.mergeEntities([], entities);
}

/**
 * Get top entities by priority and confidence
 */
export function getTopEntities(entities: ExtractedEntity[], limit: number = 10): ExtractedEntity[] {
  return entities
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}
