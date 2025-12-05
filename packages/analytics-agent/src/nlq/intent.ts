import type { VerticalType } from '@aibos/core';

/**
 * Intent types for analytics questions
 */
export type IntentType =
  | 'metric_value' // What is my revenue?
  | 'metric_trend' // How did revenue change?
  | 'metric_comparison' // Revenue vs last month
  | 'top_performers' // Top products, channels, etc.
  | 'segment_analysis' // New vs returning customers
  | 'anomaly_explanation' // Why did X change?
  | 'general_inquiry' // General question
  | 'unknown';

interface IntentPattern {
  intent: IntentType;
  patterns: RegExp[];
}

const intentPatterns: IntentPattern[] = [
  {
    intent: 'metric_value',
    patterns: [
      /what (is|are|was|were) (my|our|the) .*(revenue|orders|customers|mrr|aov|sales)/i,
      /how much .*(revenue|sales|mrr)/i,
      /total .*(revenue|orders|customers|sales)/i,
    ],
  },
  {
    intent: 'metric_trend',
    patterns: [
      /how (did|has|have) .*(change|changed|trend|grow|grown)/i,
      /(trend|growth|change) (of|in) .*/i,
      /.*over (time|the last|past)/i,
    ],
  },
  {
    intent: 'metric_comparison',
    patterns: [
      /.*(vs|versus|compared to|compare) .*(last|previous|same)/i,
      /.*(last|previous) (week|month|quarter|year)/i,
      /.*week over week|month over month/i,
    ],
  },
  {
    intent: 'top_performers',
    patterns: [
      /(top|best|highest|most) .*(product|customer|channel|campaign)/i,
      /best (selling|performing) .*/i,
      /which .*(best|most|highest)/i,
    ],
  },
  {
    intent: 'segment_analysis',
    patterns: [
      /(new|returning|repeat) .*(customer|user)/i,
      /segment .*(analysis|breakdown)/i,
      /.*by (channel|source|region|country)/i,
    ],
  },
  {
    intent: 'anomaly_explanation',
    patterns: [
      /why (did|has|is) .*(change|drop|increase|decrease|spike)/i,
      /what (caused|happened|explains) .*/i,
      /explain .*(change|drop|increase)/i,
    ],
  },
];

/**
 * Detect the intent of a question
 */
export function detectIntent(question: string, verticalType: VerticalType): IntentType {
  const normalizedQuestion = question.toLowerCase().trim();

  // Check against patterns
  for (const { intent, patterns } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuestion)) {
        return intent;
      }
    }
  }

  // Check for vertical-specific intents
  if (verticalType === 'saas') {
    if (/mrr|arr|churn|subscription/i.test(normalizedQuestion)) {
      return 'metric_value';
    }
  }

  if (verticalType === 'ecommerce') {
    if (/aov|cart|checkout|conversion/i.test(normalizedQuestion)) {
      return 'metric_value';
    }
  }

  // Default to general inquiry
  return 'general_inquiry';
}

/**
 * Get suggested intents for a vertical
 */
export function getSuggestedIntents(verticalType: VerticalType): IntentType[] {
  const common: IntentType[] = [
    'metric_value',
    'metric_trend',
    'metric_comparison',
    'top_performers',
  ];

  if (verticalType === 'ecommerce') {
    return [...common, 'segment_analysis'];
  }

  if (verticalType === 'saas') {
    return [...common, 'anomaly_explanation'];
  }

  return common;
}





