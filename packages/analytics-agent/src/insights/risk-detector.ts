/**
 * Risk Detector
 * 
 * Detects potential issues, declining metrics, and warning signs
 * in business data.
 */

import type {
  GeneratedInsight,
  InsightPeriod,
  RiskPattern,
  InsightPriority,
} from './types';

// Risk patterns for ecommerce
const ECOMMERCE_RISK_PATTERNS: RiskPattern[] = [
  {
    name: 'revenue_decline',
    category: 'revenue',
    severity: 'high',
    condition: (m) => {
      return (m.revenue_change_percent || 0) < -15;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'revenue',
      title: 'Significant Revenue Decline',
      description: `Revenue has dropped by ${Math.abs(m.revenue_change_percent || 0).toFixed(1)}% compared to the previous period.`,
      explanation: 'A significant drop in revenue may indicate market issues, competition, or operational problems.',
      recommendedAction: 'Analyze the decline by channel, product, and customer segment. Check for any technical issues or inventory problems.',
      priority: 90,
      score: 0.9,
      metrics: {
        primaryMetric: {
          name: 'Revenue Change',
          value: m.revenue_change_percent || 0,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'Current Revenue', value: m.revenue || 0, unit: 'currency' },
          { name: 'Previous Revenue', value: m.previous_revenue || 0, unit: 'currency' },
        ],
      },
      period,
    }),
  },
  {
    name: 'order_volume_drop',
    category: 'orders',
    severity: 'high',
    condition: (m) => {
      return (m.orders_change_percent || 0) < -20;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'orders',
      title: 'Order Volume Dropping Significantly',
      description: `Order volume has decreased by ${Math.abs(m.orders_change_percent || 0).toFixed(1)}%.`,
      explanation: 'Declining order volume often precedes revenue issues and may indicate demand problems.',
      recommendedAction: 'Check traffic levels and conversion rates. Review any recent changes to pricing or products.',
      priority: 85,
      score: 0.85,
      metrics: {
        primaryMetric: {
          name: 'Orders Change',
          value: m.orders_change_percent || 0,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'Current Orders', value: m.orders || 0 },
          { name: 'Previous Orders', value: m.previous_orders || 0 },
        ],
      },
      period,
    }),
  },
  {
    name: 'aov_decline',
    category: 'orders',
    severity: 'medium',
    condition: (m) => {
      return (m.aov_change_percent || 0) < -10;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'orders',
      title: 'Average Order Value Declining',
      description: `Average order value has dropped by ${Math.abs(m.aov_change_percent || 0).toFixed(1)}%.`,
      explanation: 'Declining AOV may indicate customers are finding less value or switching to cheaper products.',
      recommendedAction: 'Review product mix and pricing. Consider implementing cross-sell and upsell strategies.',
      priority: 70,
      score: 0.7,
      metrics: {
        primaryMetric: {
          name: 'AOV Change',
          value: m.aov_change_percent || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
  {
    name: 'new_customer_decline',
    category: 'customers',
    severity: 'high',
    condition: (m) => {
      return (m.new_customers_change_percent || 0) < -25;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'customers',
      title: 'New Customer Acquisition Dropping',
      description: `New customer acquisition is down ${Math.abs(m.new_customers_change_percent || 0).toFixed(1)}%.`,
      explanation: 'Declining new customer acquisition threatens long-term growth.',
      recommendedAction: 'Review marketing spend and effectiveness. Analyze acquisition channels for issues.',
      priority: 80,
      score: 0.8,
      metrics: {
        primaryMetric: {
          name: 'New Customers Change',
          value: m.new_customers_change_percent || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
  {
    name: 'high_cart_abandonment',
    category: 'operations',
    severity: 'medium',
    condition: (m) => {
      return (m.cart_abandonment_rate || 0) > 75;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'operations',
      title: 'High Cart Abandonment Rate',
      description: `Cart abandonment rate is ${m.cart_abandonment_rate?.toFixed(1)}%, above typical benchmarks.`,
      explanation: 'High abandonment may indicate checkout friction, shipping cost concerns, or trust issues.',
      recommendedAction: 'Review checkout flow for friction. Consider exit-intent offers or abandoned cart emails.',
      priority: 65,
      score: 0.65,
      metrics: {
        primaryMetric: {
          name: 'Cart Abandonment Rate',
          value: m.cart_abandonment_rate || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
  {
    name: 'low_returning_customers',
    category: 'customers',
    severity: 'medium',
    condition: (m) => {
      const returningRatio = (m.returning_customers || 0) / ((m.returning_customers || 0) + (m.new_customers || 1));
      return returningRatio < 0.3;
    },
    generateInsight: (m, period) => {
      const returningRatio = (m.returning_customers || 0) / ((m.returning_customers || 0) + (m.new_customers || 1));
      return {
        type: 'risk',
        category: 'customers',
        title: 'Low Customer Retention',
        description: `Only ${(returningRatio * 100).toFixed(0)}% of customers are returning customers.`,
        explanation: 'Low retention suggests product or service issues, or over-reliance on acquisition.',
        recommendedAction: 'Implement customer feedback surveys. Review product quality and post-purchase experience.',
        priority: 75,
        score: 0.75,
        metrics: {
          primaryMetric: {
            name: 'Returning Customer Ratio',
            value: returningRatio * 100,
            unit: '%',
          },
        },
        period,
      };
    },
  },
];

// Risk patterns for SaaS
const SAAS_RISK_PATTERNS: RiskPattern[] = [
  {
    name: 'high_churn',
    category: 'churn',
    severity: 'critical',
    condition: (m) => {
      return (m.churn_rate || 0) > 8;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'churn',
      title: 'Critical: High Churn Rate',
      description: `Churn rate is ${m.churn_rate?.toFixed(1)}%, significantly above healthy levels.`,
      explanation: 'High churn threatens business viability and indicates serious product or service issues.',
      recommendedAction: 'Urgently analyze churning customers for patterns. Implement save campaigns and improve onboarding.',
      priority: 95,
      score: 0.95,
      metrics: {
        primaryMetric: {
          name: 'Churn Rate',
          value: m.churn_rate || 0,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'Churned MRR', value: m.churned_mrr || 0, unit: 'currency' },
          { name: 'Churned Customers', value: m.churned_customers || 0 },
        ],
      },
      period,
    }),
  },
  {
    name: 'mrr_decline',
    category: 'revenue',
    severity: 'critical',
    condition: (m) => {
      return (m.mrr_change_percent || 0) < -5;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'revenue',
      title: 'MRR Declining',
      description: `Monthly Recurring Revenue has dropped by ${Math.abs(m.mrr_change_percent || 0).toFixed(1)}%.`,
      explanation: 'Declining MRR indicates churn exceeding new business and expansion.',
      recommendedAction: 'Identify source of decline: churn, downgrades, or slowing new sales. Prioritize retention.',
      priority: 90,
      score: 0.9,
      metrics: {
        primaryMetric: {
          name: 'MRR Change',
          value: m.mrr_change_percent || 0,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'Current MRR', value: m.mrr || 0, unit: 'currency' },
          { name: 'New MRR', value: m.new_mrr || 0, unit: 'currency' },
          { name: 'Churned MRR', value: m.churned_mrr || 0, unit: 'currency' },
        ],
      },
      period,
    }),
  },
  {
    name: 'low_trial_conversion',
    category: 'growth',
    severity: 'medium',
    condition: (m) => {
      return (m.trial_conversion_rate || 100) < 5;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'growth',
      title: 'Low Trial Conversion Rate',
      description: `Only ${m.trial_conversion_rate?.toFixed(1)}% of trials convert to paid.`,
      explanation: 'Low conversion indicates onboarding issues or product-market fit problems.',
      recommendedAction: 'Survey trial users who didn\'t convert. Improve onboarding and time-to-value.',
      priority: 75,
      score: 0.75,
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
  {
    name: 'new_subscription_decline',
    category: 'growth',
    severity: 'high',
    condition: (m) => {
      return (m.new_subscriptions_change_percent || 0) < -20;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'growth',
      title: 'New Subscription Growth Slowing',
      description: `New subscriptions are down ${Math.abs(m.new_subscriptions_change_percent || 0).toFixed(1)}%.`,
      explanation: 'Declining new subscriptions threatens growth trajectory.',
      recommendedAction: 'Review marketing funnel for bottlenecks. Analyze competitor activity.',
      priority: 80,
      score: 0.8,
      metrics: {
        primaryMetric: {
          name: 'New Subscriptions Change',
          value: m.new_subscriptions_change_percent || 0,
          unit: '%',
        },
      },
      period,
    }),
  },
  {
    name: 'high_downgrade_rate',
    category: 'revenue',
    severity: 'medium',
    condition: (m) => {
      return (m.downgrade_rate || 0) > 5;
    },
    generateInsight: (m, period) => ({
      type: 'risk',
      category: 'revenue',
      title: 'High Downgrade Rate',
      description: `${m.downgrade_rate?.toFixed(1)}% of customers downgraded their plans.`,
      explanation: 'Frequent downgrades suggest customers aren\'t getting expected value from higher tiers.',
      recommendedAction: 'Review value proposition of higher tiers. Consider plan restructuring or feature improvements.',
      priority: 70,
      score: 0.7,
      metrics: {
        primaryMetric: {
          name: 'Downgrade Rate',
          value: m.downgrade_rate || 0,
          unit: '%',
        },
        relatedMetrics: [
          { name: 'Downgrade MRR', value: m.downgrade_mrr || 0, unit: 'currency' },
        ],
      },
      period,
    }),
  },
];

/**
 * Risk Detector class
 */
export class RiskDetector {
  private patterns: RiskPattern[];

  constructor(verticalType: 'ecommerce' | 'saas' | 'generic') {
    this.patterns = verticalType === 'saas'
      ? SAAS_RISK_PATTERNS
      : ECOMMERCE_RISK_PATTERNS;
  }

  /**
   * Detect risks from metrics
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
   * Add custom risk pattern
   */
  addPattern(pattern: RiskPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get risk severity threshold
   */
  getSeverityThreshold(severity: InsightPriority): number {
    const thresholds: Record<InsightPriority, number> = {
      low: 40,
      medium: 60,
      high: 80,
      critical: 90,
    };
    return thresholds[severity];
  }

  /**
   * Filter risks by minimum severity
   */
  filterBySeverity(
    insights: GeneratedInsight[],
    minSeverity: InsightPriority
  ): GeneratedInsight[] {
    const threshold = this.getSeverityThreshold(minSeverity);
    return insights.filter((i) => i.priority >= threshold);
  }
}

// Export factory function
export function createRiskDetector(
  verticalType: 'ecommerce' | 'saas' | 'generic'
): RiskDetector {
  return new RiskDetector(verticalType);
}
