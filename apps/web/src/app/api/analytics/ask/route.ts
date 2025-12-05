import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, workspaces, workspaceMemberships } from '@aibos/data-model';
import { eq } from 'drizzle-orm';
import { createAnalyticsAgent } from '@aibos/analytics-agent';
import type { VerticalType } from '@aibos/core';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Get workspace for user through membership
    const membership = await db
      .select({ workspace: workspaces })
      .from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(eq(workspaceMemberships.userId, user.id))
      .limit(1);

    const membershipData = membership[0];
    if (!membershipData) {
      // Return demo response if no workspace
      return NextResponse.json({
        success: true,
        answer: getDemoAnswer(question),
        demo: true,
      });
    }

    const workspaceData = membershipData.workspace;

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Return demo response if no API key
      return NextResponse.json({
        success: true,
        answer: getDemoAnswer(question),
        demo: true,
        message: 'AI features require OpenAI API key configuration.',
      });
    }

    try {
      // Create analytics agent
      const agent = createAnalyticsAgent({
        workspaceId: workspaceData.id,
        verticalType: workspaceData.verticalType as VerticalType,
        currency: workspaceData.currency || 'USD',
        timezone: workspaceData.timezone || 'UTC',
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
        answer: getDemoAnswer(question),
        demo: true,
        message: 'AI processing unavailable, showing demo response.',
      });
    }
  } catch (error) {
    console.error('Ask API error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

function getDemoAnswer(question: string): string {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('revenue')) {
    return `Based on your data from the last 30 days: Revenue totaled $24,500, which represents a 12.5% increase compared to the previous period. The growth was driven primarily by a 15% increase in average order value. Your top-performing product category was Electronics, contributing 34% of total revenue.`;
  }

  if (lowerQuestion.includes('product') || lowerQuestion.includes('selling')) {
    return `Your top 5 best-selling products in the last 30 days are:
1. Product A - $5,200 revenue (52 units)
2. Product B - $4,100 revenue (41 units)
3. Product C - $3,800 revenue (76 units)
4. Product D - $3,200 revenue (32 units)
5. Product E - $2,900 revenue (58 units)

Electronics and Home & Garden categories are performing particularly well this period.`;
  }

  if (lowerQuestion.includes('customer') || lowerQuestion.includes('returning')) {
    return `Customer analysis for the last 30 days:
- New customers: 180 (40% of orders, $9,800 revenue)
- Returning customers: 120 (60% of orders, $14,700 revenue)

Returning customers generate 60% more revenue per order on average. Consider implementing a loyalty program to increase retention.`;
  }

  if (lowerQuestion.includes('order') || lowerQuestion.includes('aov')) {
    return `Order metrics for the last 30 days:
- Total orders: 356 (up 8.2% from previous period)
- Average order value: $68.82 (up 4.1%)
- Items per order: 2.3 average

Peak ordering days are Tuesday and Thursday. Consider targeted promotions on slower days.`;
  }

  if (lowerQuestion.includes('channel') || lowerQuestion.includes('source')) {
    return `Channel performance for the last 30 days:
1. Direct - 42% of revenue ($10,290)
2. Organic Search - 28% ($6,860)
3. Paid Search - 18% ($4,410)
4. Social - 8% ($1,960)
5. Email - 4% ($980)

Organic search has shown the most growth (+23%) compared to last period.`;
  }

  // Default response
  return `Based on your data from the last 30 days: Revenue increased by 12.5% compared to the previous period, driven primarily by a 15% increase in average order value. Your top-performing product category was Electronics, contributing 34% of total revenue. Order volume is up 8.2%, with returning customers accounting for 60% of revenue.`;
}
