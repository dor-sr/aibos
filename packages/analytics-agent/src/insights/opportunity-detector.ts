/**
 * Opportunity Detector
 * 
 * Detects growth opportunities, untapped potential, and positive patterns
 * in business metrics.
 */

import type {
  GeneratedInsight,
  InsightPeriod,
  OpportunityPattern,
} from './types';

// Opportunity patterns for ecommerce
const ECOMMERCE_OPPORTUNITY_PATTERNS: OpportunityPattern[] = [
  {
    name: 'revenue_growth_momentum',
    category: 'revenue',
    condition: (m) => {
      const growth = m.revenue_change_percent || 0;
      const previousGrowth = m.previous_revenue_change_percent || 0;
      return growth > 15 && growth > previousGrowth;
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'revenue',
      title: 'Strong Revenue Growth Momentum',
      description: `Revenue is growing at ${m.revenue_change_percent?.toFixed(1)}%, accelerating from the previous period's ${m.previous_revenue_change_percent?.toFixed(1)}%.`,
      explanation: 'Accelerating revenue growth suggests strong market demand. This is an ideal time to invest in growth initiatives.',
      recommendedAction: 'Consider increasing marketing spend to capitalize on momentum. Evaluate inventory levels to prevent stockouts.',
      priority: 80,
      score: 0.85,
      metrics: {
        primaryMetric: {
          name: 'Revenue Growth',
          value: m.revenue_change_percent || 0,
          previousValue: m.previous_revenue_change_percent,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'Revenue', value: m.revenue || 0, unit: 'currency' },
          { name: 'Orders', value: m.orders || 0 },
        ],
      },
      period,
    }),
  },
  {
    name: 'aov_increase',
    category: 'orders',
    condition: (m) => {
      return (m.aov_change_percent || 0) > 10;
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'orders',
      title: 'Average Order Value Increasing',
      description: `Average order value has increased by ${m.aov_change_percent?.toFixed(1)}% to ${m.aov?.toFixed(2)}.`,
      explanation: 'Customers are spending more per order, indicating successful upselling or improved product mix.',
      recommendedAction: 'Analyze which products are driving AOV increase. Consider bundle offers to further capitalize on this trend.',
      priority: 70,
      score: 0.75,
      metrics: {
        primaryMetric: {
          name: 'Average Order Value',
          value: m.aov || 0,
          change: m.aov_change_percent,
          unit: 'currency',
        },
      },
      period,
    }),
  },
  {
    name: 'new_customer_surge',
    category: 'customers',
    condition: (m) => {
      return (m.new_customers_change_percent || 0) > 25;
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'customers',
      title: 'Surge in New Customer Acquisition',
      description: `New customer acquisition is up ${m.new_customers_change_percent?.toFixed(1)}% with ${m.new_customers} new customers.`,
      explanation: 'Significant increase in new customers suggests effective marketing or viral growth.',
      recommendedAction: 'Analyze acquisition channels to identify what\'s working. Implement retention strategies to convert new customers into repeat buyers.',
      priority: 75,
      score: 0.8,
      metrics: {
        primaryMetric: {
          name: 'New Customers',
          value: m.new_customers || 0,
          change: m.new_customers_change_percent,
        },
      },
      period,
    }),
  },
  {
    name: 'returning_customer_strength',
    category: 'customers',
    condition: (m) => {
      const returningRatio = (m.returning_customers || 0) / ((m.returning_customers || 0) + (m.new_customers || 1));
      return returningRatio > 0.6;
    },
    generateInsight: (m, period) => {
      const returningRatio = (m.returning_customers || 0) / ((m.returning_customers || 0) + (m.new_customers || 1));
      return {
        type: 'highlight',
        category: 'customers',
        title: 'Strong Customer Retention',
        description: `${(returningRatio * 100).toFixed(0)}% of customers are returning customers, indicating strong loyalty.`,
        explanation: 'High returning customer ratio demonstrates product-market fit and customer satisfaction.',
        recommendedAction: 'Launch a loyalty program to reward and retain your best customers. Consider referral incentives.',
        priority: 65,
        score: 0.7,
        metrics: {
          primaryMetric: {
            name: 'Returning Customer Ratio',
            value: returningRatio * 100,
            unit: '%',
          },
          relatedMetrics: [
            { name: 'Returning Customers', value: m.returning_customers || 0 },
            { name: 'New Customers', value: m.new_customers || 0 },
          ],
        },
        period,
      };
    },
  },
  {
    name: 'top_product_growth',
    category: 'products',
    condition: (m) => {
      return (m.top_product_growth || 0) > 30;
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'products',
      title: 'Top Product Showing Strong Growth',
      description: `Your best-selling product's revenue grew by ${m.top_product_growth?.toFixed(1)}%.`,
      explanation: 'Strong growth in top products suggests high demand that can be leveraged.',
      recommendedAction: 'Ensure sufficient inventory. Consider related product promotions or bundle deals.',
      priority: 60,
      score: 0.65,
      metrics: {
        primaryMetric: {
          name: 'Top Product Growth',
          value: m.top_product_growth || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
];

// Opportunity patterns for SaaS
const SAAS_OPPORTUNITY_PATTERNS: OpportunityPattern[] = [
  {
    name: 'mrr_growth_acceleration',
    category: 'revenue',
    condition: (m) => {
      const growth = m.mrr_change_percent || 0;
      return growth > 10;
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'revenue',
      title: 'MRR Growth Accelerating',
      description: `Monthly Recurring Revenue grew by ${m.mrr_change_percent?.toFixed(1)}% to ${m.mrr?.toLocaleString()}.`,
      explanation: 'Strong MRR growth indicates product-market fit and effective sales efforts.',
      recommendedAction: 'Analyze which plans are driving growth. Consider pricing optimization.',
      priority: 85,
      score: 0.9,
      metrics: {
        primaryMetric: {
          name: 'MRR Growth',
          value: m.mrr_change_percent || 0,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'MRR', value: m.mrr || 0, unit: 'currency' },
          { name: 'ARR', value: (m.mrr || 0) * 12, unit: 'currency' },
        ],
      },
      period,
    }),
  },
  {
    name: 'low_churn_opportunity',
    category: 'churn',
    condition: (m) => {
      return (m.churn_rate || 100) < 3;
    },
    generateInsight: (m, period) => ({
      type: 'highlight',
      category: 'churn',
      title: 'Excellent Customer Retention',
      description: `Churn rate is only ${m.churn_rate?.toFixed(1)}%, well below industry average.`,
      explanation: 'Low churn indicates strong product value and customer satisfaction.',
      recommendedAction: 'Survey happy customers for testimonials. Consider expansion revenue opportunities.',
      priority: 70,
      score: 0.75,
      metrics: {
        primaryMetric: {
          name: 'Churn Rate',
          value: m.churn_rate || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
  {
    name: 'expansion_revenue',
    category: 'growth',
    condition: (m) => {
      return (m.expansion_mrr || 0) > (m.churned_mrr || 0);
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'growth',
      title: 'Net Negative Churn Achieved',
      description: `Expansion revenue (${m.expansion_mrr?.toLocaleString()}) exceeds churned revenue (${m.churned_mrr?.toLocaleString()}).`,
      explanation: 'Net negative churn means existing customers are growing faster than lost revenue.',
      recommendedAction: 'Double down on customer success. Identify and replicate expansion patterns.',
      priority: 80,
      score: 0.85,
      metrics: {
        primaryMetric: {
          name: 'Net MRR Change',
          value: (m.expansion_mrr || 0) - (m.churned_mrr || 0),
          unit: 'currency',
        },
        relatedMetrics: [
          { name: 'Expansion MRR', value: m.expansion_mrr || 0, unit: 'currency' },
          { name: 'Churned MRR', value: m.churned_mrr || 0, unit: 'currency' },
        ],
      },
      period,
    }),
  },
  {
    name: 'trial_conversion_improvement',
    category: 'growth',
    condition: (m) => {
      return (m.trial_conversion_rate || 0) > 15;
    },
    generateInsight: (m, period) => ({
      type: 'opportunity',
      category: 'growth',
      title: 'Strong Trial Conversion Rate',
      description: `Trial to paid conversion rate is ${m.trial_conversion_rate?.toFixed(1)}%.`,
      explanation: 'High conversion rate indicates effective onboarding and product value demonstration.',
      recommendedAction: 'Increase trial signups through marketing. Analyze and optimize the onboarding flow.',
      priority: 75,
      score: 0.8,
      metrics: {
        primaryMetric: {
          name: 'Trial Conversion Rate',
          value: m.trial_conversion_rate || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
];

/**
 * Opportunity Detector class
 */
export class OpportunityDetector {
  private patterns: OpportunityPattern[];

  constructor(verticalType: 'ecommerce' | 'saas' | 'generic') {
    this.patterns = verticalType === 'saas' 
      ? SAAS_OPPORTUNITY_PATTERNS 
      : ECOMMERCE_OPPORTUNITY_PATTERNS;
  }

  /**
   * Detect opportunities from metrics
   */
  detect(
    metrics: Record<string, number>,
    period: InsightPeriod
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];

    for (const pattern of this.patterns) {
      try {
        if (pattern.condition(metrics)) {
          const insight = pattern.generateInsight(metrics, period);
          if (insight) {
            insights.push(insight);
          }
        }
      } catch {
        // Skip pattern if it fails
        continue;
      }
    }

    return insights;
  }

  /**
   * Add custom opportunity pattern
   */
  addPattern(pattern: OpportunityPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): OpportunityPattern[] {
    return [...this.patterns];
  }
}

// Export factory function
export function createOpportunityDetector(
  verticalType: 'ecommerce' | 'saas' | 'generic'
): OpportunityDetector {
  return new OpportunityDetector(verticalType);
}
