/**
 * Marketing Intent Detection
 */

import type { MarketingIntentType, MarketingChannel } from '../types';

interface IntentPattern {
  patterns: RegExp[];
  intent: MarketingIntentType;
  extractors?: {
    channel?: RegExp;
    period?: RegExp;
    metric?: RegExp;
  };
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Performance overview
  {
    patterns: [
      /how (are|is) (my |our )?(marketing|ads?|campaigns?|advertising) (doing|performing)/i,
      /marketing (overview|summary|performance)/i,
      /overall (ad|marketing|campaign) performance/i,
      /what('s| is) (my |our )?marketing (status|health)/i,
    ],
    intent: 'performance_overview',
  },
  // Channel performance
  {
    patterns: [
      /how (is|are) (meta|facebook|instagram|google|tiktok|linkedin) (ads?)? (doing|performing)/i,
      /(meta|facebook|instagram|google|tiktok|linkedin) (ads?|campaigns?) performance/i,
      /which channel (is|performs?) best/i,
      /compare (my |our )?channels/i,
      /channel (performance|comparison|breakdown)/i,
    ],
    intent: 'channel_performance',
    extractors: {
      channel: /(meta|facebook|instagram|google|tiktok|linkedin)/i,
    },
  },
  // Campaign performance
  {
    patterns: [
      /how (is|are) (my |our )?campaigns? (doing|performing)/i,
      /campaign (performance|results|metrics)/i,
      /show (me )?(my |our )?campaigns?/i,
    ],
    intent: 'campaign_performance',
  },
  // Spend analysis
  {
    patterns: [
      /how much (have i|did i|we) spen[dt]/i,
      /what('s| is) (my |our )?(total |ad )?spend/i,
      /spend (breakdown|by|analysis)/i,
      /where (is|am i|are we) spending (money|budget)/i,
      /budget (allocation|usage|spent)/i,
    ],
    intent: 'spend_analysis',
  },
  // ROAS analysis
  {
    patterns: [
      /what('s| is) (my |our )?roas/i,
      /return on ad spend/i,
      /roas (by|for|trend|analysis)/i,
      /which (channel|campaign)s? ha(ve|s) (the )?(best|highest|lowest) roas/i,
    ],
    intent: 'roas_analysis',
  },
  // CPC analysis
  {
    patterns: [
      /what('s| is) (my |our )?cpc/i,
      /cost per click/i,
      /cpc (by|for|trend)/i,
      /how much (am i|are we) paying per click/i,
    ],
    intent: 'cpc_analysis',
  },
  // Conversion analysis
  {
    patterns: [
      /how many conversions/i,
      /conversion (rate|count|analysis|trend)/i,
      /what('s| is) (my |our )?conversion/i,
      /which (channel|campaign)s? (drive|have|get) (the )?(most|best) conversions/i,
    ],
    intent: 'conversion_analysis',
  },
  // Budget recommendations
  {
    patterns: [
      /how should i allocate (my |our )?budget/i,
      /budget (recommendation|suggestion|advice|allocation)/i,
      /where should i (spend|invest|put) (more|less)/i,
      /optimize (my |our )?budget/i,
      /reallocate (my |our )?budget/i,
    ],
    intent: 'budget_recommendation',
  },
  // Creative fatigue
  {
    patterns: [
      /creative fatigue/i,
      /which ads? (are|is) (tired|fatigued|worn out)/i,
      /ad (fatigue|performance decline)/i,
      /should i refresh (my |our )?(ads?|creatives?)/i,
      /declining (ad|creative) performance/i,
    ],
    intent: 'creative_fatigue',
  },
  // Top performers
  {
    patterns: [
      /top (performing|campaigns?|ads?)/i,
      /best (performing|campaigns?|ads?)/i,
      /what('s| is|are) (my |our )?(top|best) (campaigns?|ads?)/i,
      /which (campaigns?|ads?) (are|is) (doing|performing) (well|best)/i,
      /highest (roas|converting|revenue)/i,
    ],
    intent: 'top_performers',
  },
  // Underperformers
  {
    patterns: [
      /(under|poor|worst|low)[ -]?perform(ing|ers?)/i,
      /which (campaigns?|ads?) (are|is) (not working|underperforming|failing)/i,
      /what should i (pause|stop|turn off)/i,
      /low(est)? roas/i,
      /wasting (money|budget|spend)/i,
    ],
    intent: 'underperformers',
  },
  // Comparison
  {
    patterns: [
      /compare .+ (to|vs|versus|with|and)/i,
      /difference between/i,
      /(vs|versus|compared to)/i,
      /how does .+ compare/i,
    ],
    intent: 'comparison',
  },
  // Trend analysis
  {
    patterns: [
      /trend(s|ing)?/i,
      /over time/i,
      /how (has|have) .+ changed/i,
      /week over week|month over month/i,
      /daily|weekly|monthly (performance|trend)/i,
    ],
    intent: 'trend_analysis',
  },
];

const CHANNEL_PATTERNS: Record<string, MarketingChannel> = {
  meta: 'meta_ads',
  facebook: 'meta_ads',
  instagram: 'meta_ads',
  fb: 'meta_ads',
  ig: 'meta_ads',
  google: 'google_ads',
  adwords: 'google_ads',
  tiktok: 'tiktok_ads',
  linkedin: 'linkedin_ads',
};

const PERIOD_PATTERNS: Record<string, string> = {
  'last 7 days': '7d',
  'last week': '7d',
  'past week': '7d',
  'last 14 days': '14d',
  'last 2 weeks': '14d',
  'last 30 days': '30d',
  'last month': '30d',
  'past month': '30d',
  'last 90 days': '90d',
  'last quarter': '90d',
  'this month': 'mtd',
  'month to date': 'mtd',
  'mtd': 'mtd',
  'this quarter': 'qtd',
  'quarter to date': 'qtd',
  'qtd': 'qtd',
  'this year': 'ytd',
  'year to date': 'ytd',
  'ytd': 'ytd',
};

/**
 * Detect intent from marketing question
 */
export function detectMarketingIntent(
  question: string
): {
  intent: MarketingIntentType;
  channel?: MarketingChannel;
  period?: string;
  confidence: number;
} {
  const normalizedQuestion = question.toLowerCase().trim();

  // Try to match intent patterns
  for (const { patterns, intent } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuestion)) {
        return {
          intent,
          channel: extractChannel(normalizedQuestion),
          period: extractPeriod(normalizedQuestion),
          confidence: 0.9,
        };
      }
    }
  }

  // Fallback to performance overview for generic questions
  if (/marketing|ads?|campaigns?|spend|budget|roas|cpc|conversion/i.test(normalizedQuestion)) {
    return {
      intent: 'performance_overview',
      channel: extractChannel(normalizedQuestion),
      period: extractPeriod(normalizedQuestion),
      confidence: 0.6,
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.3,
  };
}

/**
 * Extract channel from question
 */
function extractChannel(question: string): MarketingChannel | undefined {
  for (const [keyword, channel] of Object.entries(CHANNEL_PATTERNS)) {
    if (question.includes(keyword.toLowerCase())) {
      return channel;
    }
  }
  return undefined;
}

/**
 * Extract period from question
 */
function extractPeriod(question: string): string {
  for (const [keyword, period] of Object.entries(PERIOD_PATTERNS)) {
    if (question.includes(keyword.toLowerCase())) {
      return period;
    }
  }
  return '30d'; // Default to 30 days
}

export { CHANNEL_PATTERNS, PERIOD_PATTERNS };
