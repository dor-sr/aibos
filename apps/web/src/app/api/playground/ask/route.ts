import { NextRequest, NextResponse } from 'next/server';
import { createAnalyticsAgent } from '@aibos/analytics-agent';
import type { VerticalType } from '@aibos/core';

interface PlaygroundRequest {
  question: string;
  config: {
    verticalType: VerticalType;
    currency: string;
    timezone: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PlaygroundRequest = await request.json();
    const { question, config } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required', success: false },
        { status: 400 }
      );
    }

    // Use a demo workspace ID for playground
    const workspaceId = 'playground-demo';

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Return demo response if no API key
      return NextResponse.json({
        success: true,
        answer: getDemoAnswer(question, config.verticalType),
        demo: true,
        intent: detectSimpleIntent(question),
        message: 'Demo mode - OpenAI API key not configured.',
      });
    }

    try {
      // Create analytics agent with playground config
      const agent = createAnalyticsAgent({
        workspaceId,
        verticalType: config.verticalType,
        currency: config.currency || 'USD',
        timezone: config.timezone || 'UTC',
      });

      // Ask the question
      const result = await agent.ask(question);

      return NextResponse.json({
        success: result.success,
        answer: result.answer,
        data: result.data,
        intent: result.intent,
        demo: false,
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      // Fall back to demo response
      return NextResponse.json({
        success: true,
        answer: getDemoAnswer(question, config.verticalType),
        demo: true,
        intent: detectSimpleIntent(question),
        message: 'AI processing unavailable, showing demo response.',
      });
    }
  } catch (error) {
    console.error('Playground API error:', error);
    return NextResponse.json(
      { error: 'Failed to process question', success: false },
      { status: 500 }
    );
  }
}

function detectSimpleIntent(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('revenue') || q.includes('sales')) return 'revenue';
  if (q.includes('product') || q.includes('selling')) return 'products';
  if (q.includes('customer') || q.includes('returning')) return 'customers';
  if (q.includes('order') || q.includes('aov')) return 'orders';
  if (q.includes('mrr') || q.includes('subscription')) return 'mrr';
  if (q.includes('churn')) return 'churn';
  return 'general';
}

function getDemoAnswer(question: string, vertical: VerticalType): string {
  const lowerQuestion = question.toLowerCase();

  if (vertical === 'saas') {
    if (lowerQuestion.includes('mrr')) {
      return `Current MRR: $45,200

MRR Breakdown:
- New MRR: $8,500 (from 42 new subscriptions)
- Expansion MRR: $3,200 (upgrades)
- Churned MRR: -$2,100 (12 cancellations)
- Net New MRR: $9,600 (+21% vs last month)

Your highest growth is coming from the Professional plan, which accounts for 58% of new signups.`;
    }

    if (lowerQuestion.includes('churn')) {
      return `Churn Analysis (Last 30 Days):

- Churn Rate: 4.2% (industry average: 5-7%)
- Churned Customers: 12
- Churned MRR: $2,100

Top Churn Reasons:
1. Switched to competitor (5)
2. Budget constraints (4)
3. Not using enough (3)

Recommendation: Consider reaching out to users with low engagement before they churn.`;
    }

    if (lowerQuestion.includes('subscription') || lowerQuestion.includes('plan')) {
      return `Subscription Distribution:

| Plan | Active | MRR | Avg LTV |
|------|--------|-----|---------|
| Starter | 145 | $7,250 | $290 |
| Professional | 89 | $22,250 | $1,120 |
| Enterprise | 23 | $15,700 | $4,200 |

The Professional plan has the best conversion rate from trial (34%), while Enterprise has the highest retention (98.5%).`;
    }

    // Default SaaS response
    return `SaaS Business Summary (Last 30 Days):

Key Metrics:
- MRR: $45,200 (+21% vs last month)
- Active Customers: 257
- New Trials: 156
- Trial to Paid: 28%
- Churn Rate: 4.2%
- Net Revenue Retention: 112%

Your SaaS is showing healthy growth with strong expansion revenue offsetting churn. Focus on improving trial conversion for even faster growth.`;
  }

  // Ecommerce responses
  if (lowerQuestion.includes('revenue')) {
    return `Revenue Analysis (Last 30 Days):

Total Revenue: $24,500
Previous Period: $21,780
Change: +12.5%

Revenue by Source:
- Direct: $10,290 (42%)
- Organic Search: $6,860 (28%)
- Paid Search: $4,410 (18%)
- Social: $1,960 (8%)
- Email: $980 (4%)

The growth was driven primarily by a 15% increase in average order value. Your top-performing product category was Electronics, contributing 34% of total revenue.`;
  }

  if (lowerQuestion.includes('product') || lowerQuestion.includes('selling')) {
    return `Top 5 Best-Selling Products (Last 30 Days):

| Rank | Product | Revenue | Units |
|------|---------|---------|-------|
| 1 | Wireless Headphones Pro | $5,200 | 52 |
| 2 | Smart Watch Series 5 | $4,100 | 41 |
| 3 | USB-C Hub 7-in-1 | $3,800 | 76 |
| 4 | Bluetooth Speaker X | $3,200 | 32 |
| 5 | Laptop Stand Deluxe | $2,900 | 58 |

Electronics and Home & Garden categories are performing particularly well this period. The USB-C Hub has the highest unit volume - consider bundling it with other products.`;
  }

  if (lowerQuestion.includes('customer') || lowerQuestion.includes('returning')) {
    return `Customer Analysis (Last 30 Days):

New Customers: 180 (40% of orders)
- Revenue: $9,800
- AOV: $54.44

Returning Customers: 120 (60% of orders)  
- Revenue: $14,700
- AOV: $122.50

Key Insights:
- Returning customers generate 2.2x more revenue per order
- Customer retention rate: 32%
- Repeat purchase rate: 28%

Recommendation: Implement a loyalty program to increase retention. Returning customers are significantly more valuable.`;
  }

  if (lowerQuestion.includes('order') || lowerQuestion.includes('aov')) {
    return `Order Metrics (Last 30 Days):

Total Orders: 356
Previous Period: 329
Change: +8.2%

Order Details:
- Average Order Value: $68.82 (+4.1%)
- Items per Order: 2.3 average
- Cart Abandonment: 68%

Peak Days:
- Tuesday: 62 orders (highest)
- Thursday: 58 orders
- Saturday: 52 orders

Slowest Day: Sunday (28 orders)

Consider targeted promotions on Sunday to balance weekly performance.`;
  }

  // Default ecommerce response
  return `Business Summary (Last 30 Days):

Key Metrics:
- Total Revenue: $24,500 (+12.5% vs previous period)
- Total Orders: 356 (+8.2%)
- Average Order Value: $68.82 (+4.1%)
- New Customers: 180
- Returning Customers: 120

Top Insights:
1. Revenue growth is outpacing order growth, indicating higher order values
2. Returning customers account for 60% of revenue
3. Electronics category driving 34% of sales
4. Tuesday and Thursday are peak sales days

Recommendations:
- Focus on customer retention programs
- Consider expanding Electronics inventory
- Run promotions on slower days (Sunday)`;
}
