import type { CommerceOpsIntent } from '../types';

/**
 * Intent patterns for commerce operations questions
 */
const intentPatterns: { intent: CommerceOpsIntent; patterns: RegExp[] }[] = [
  {
    intent: 'inventory_status',
    patterns: [
      /inventory\s*(status|level|count|overview)?/i,
      /stock\s*(status|level|count|overview)?/i,
      /how\s+much\s+(stock|inventory)/i,
      /what('s|s|\s+is)\s*(my|the)?\s*(current)?\s*(inventory|stock)/i,
      /products?\s+in\s+stock/i,
      /available\s+stock/i,
    ],
  },
  {
    intent: 'stock_alerts',
    patterns: [
      /stock\s*alert/i,
      /inventory\s*alert/i,
      /low\s+stock/i,
      /out\s+of\s+stock/i,
      /critical\s+stock/i,
      /overstock/i,
      /running\s+low/i,
      /need\s+to\s+reorder/i,
      /products?\s+running\s+out/i,
    ],
  },
  {
    intent: 'demand_forecast',
    patterns: [
      /demand\s*forecast/i,
      /sales?\s*forecast/i,
      /predict(ed|ion)?\s+(demand|sales)/i,
      /future\s+(demand|sales)/i,
      /how\s+much\s+will\s+(i|we)\s+sell/i,
      /expected\s+(demand|sales)/i,
      /stockout\s+(risk|date)/i,
      /when\s+will\s+(i|we)\s+run\s+out/i,
    ],
  },
  {
    intent: 'reorder_recommendations',
    patterns: [
      /reorder\s*(recommendation|suggest)/i,
      /what\s+should\s+(i|we)\s+(reorder|order)/i,
      /need\s+to\s+(reorder|order)/i,
      /purchase\s*order\s*recommend/i,
      /what\s+to\s+order/i,
      /replenish(ment)?/i,
    ],
  },
  {
    intent: 'pricing_analysis',
    patterns: [
      /price\s*(analysis|history|trend|change)/i,
      /pricing\s*(analysis|strategy|suggest)/i,
      /product\s+price/i,
      /price\s+suggest/i,
      /adjust\s+price/i,
      /optimize\s+price/i,
    ],
  },
  {
    intent: 'margin_analysis',
    patterns: [
      /margin\s*(analysis|breakdown|overview)?/i,
      /profit\s*margin/i,
      /profitability/i,
      /which\s+products?\s+(are|have)\s+(profitable|highest\s+margin)/i,
      /low\s+margin\s+products?/i,
      /losing\s+money/i,
      /negative\s+margin/i,
    ],
  },
  {
    intent: 'multi_channel_inventory',
    patterns: [
      /multi[\s-]?channel\s*(inventory|stock)?/i,
      /channel\s+(inventory|stock|allocation)/i,
      /inventory\s+across\s+channels/i,
      /stock\s+by\s+channel/i,
      /allocat(e|ion)\s*(inventory|stock)/i,
      /shopify.*stock/i,
      /mercadolibre.*stock/i,
      /marketplace\s+inventory/i,
    ],
  },
  {
    intent: 'supplier_performance',
    patterns: [
      /supplier\s*(performance|rating|review)?/i,
      /vendor\s*(performance|rating|review)?/i,
      /which\s+supplier/i,
      /best\s+supplier/i,
      /on[\s-]?time\s+delivery/i,
      /lead\s+time/i,
    ],
  },
  {
    intent: 'purchase_orders',
    patterns: [
      /purchase\s*order/i,
      /pending\s*order/i,
      /orders?\s+(to|from)\s+supplier/i,
      /incoming\s+(inventory|stock)/i,
      /expected\s+delivery/i,
    ],
  },
];

/**
 * Detect intent from a commerce operations question
 */
export function detectCommerceOpsIntent(question: string): CommerceOpsIntent {
  const normalizedQuestion = question.toLowerCase().trim();

  for (const { intent, patterns } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuestion)) {
        return intent;
      }
    }
  }

  // Check for general commerce keywords
  if (/inventory|stock|product|price|supplier|order/i.test(normalizedQuestion)) {
    return 'general_commerce';
  }

  return 'unknown';
}

/**
 * Extract context from question
 */
export function extractQuestionContext(question: string): {
  productName?: string;
  sku?: string;
  platform?: string;
  timeframe?: string;
} {
  const context: {
    productName?: string;
    sku?: string;
    platform?: string;
    timeframe?: string;
  } = {};

  // Extract platform
  const platformMatch = question.match(/(shopify|tiendanube|mercadolibre|woocommerce|rappi)/i);
  if (platformMatch?.[1]) {
    context.platform = platformMatch[1].toLowerCase();
  }

  // Extract timeframe
  const timeframeMatch = question.match(/(today|yesterday|this\s+week|last\s+week|this\s+month|last\s+month|\d+\s+days?)/i);
  if (timeframeMatch?.[1]) {
    context.timeframe = timeframeMatch[1].toLowerCase();
  }

  // Extract SKU
  const skuMatch = question.match(/sku[:\s]*["']?([A-Z0-9-]+)["']?/i);
  if (skuMatch?.[1]) {
    context.sku = skuMatch[1];
  }

  return context;
}

/**
 * Get suggested questions based on intent
 */
export function getSuggestedQuestions(intent: CommerceOpsIntent): string[] {
  const suggestions: Record<CommerceOpsIntent, string[]> = {
    inventory_status: [
      'Which products are out of stock?',
      'Show me products with low inventory',
      'What is my total stock value?',
    ],
    stock_alerts: [
      'Show me all active stock alerts',
      'Which products need immediate attention?',
      'What products are critically low?',
    ],
    demand_forecast: [
      'Which products will run out first?',
      'Show me demand forecast for next 30 days',
      'What is the stockout risk for my top products?',
    ],
    reorder_recommendations: [
      'What should I reorder now?',
      'Show me urgent reorder recommendations',
      'Generate a purchase order for low stock items',
    ],
    pricing_analysis: [
      'Which products should I reprice?',
      'Show me pricing suggestions',
      'What is the price history for my products?',
    ],
    margin_analysis: [
      'Which products have the best margins?',
      'Show me products with negative margins',
      'What is my overall profit margin?',
    ],
    multi_channel_inventory: [
      'How is my inventory distributed across channels?',
      'Show me allocation recommendations',
      'Which products have channel inconsistencies?',
    ],
    supplier_performance: [
      'Which supplier has the best on-time delivery?',
      'Show me supplier performance rankings',
      'What is the average lead time by supplier?',
    ],
    purchase_orders: [
      'Show me pending purchase orders',
      'What deliveries are expected this week?',
      'What is the total value of pending orders?',
    ],
    general_commerce: [
      'Show me inventory overview',
      'What needs my attention today?',
      'Give me a commerce operations summary',
    ],
    unknown: [
      'What is my inventory status?',
      'Show me stock alerts',
      'What products should I reorder?',
    ],
  };

  return suggestions[intent] || suggestions.unknown;
}
