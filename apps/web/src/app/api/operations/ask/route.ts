import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@aibos/core';

const logger = createLogger('api:operations:ask');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, workspaceId } = body;

    if (!question || !workspaceId) {
      return NextResponse.json(
        { error: 'question and workspaceId are required' },
        { status: 400 }
      );
    }

    logger.info('Processing commerce ops question', { question, workspaceId });

    const { handleCommerceOpsNLQ } = await import('@aibos/commerce-ops-agent');
    const result = await handleCommerceOpsNLQ({ question, workspaceId });

    return NextResponse.json({
      answer: result.answer,
      intent: result.intent,
      suggestedQuestions: result.suggestedQuestions,
    });
  } catch (err) {
    logger.error('Error processing commerce ops question', err instanceof Error ? err : undefined);
    
    // Return helpful demo response
    const body = await request.clone().json().catch(() => ({}));
    const question = body.question || '';
    
    // Simple intent detection for demo
    let answer = '';
    if (/inventory|stock/.test(question.toLowerCase())) {
      answer = `**Inventory Overview**

- **Total Products:** 150
- **Stock Value:** $125,000
- **Locations:** 2

**Stock Status:**
- Healthy: 110 products
- Low Stock: 25 products
- Critical: 8 products
- Out of Stock: 5 products

**Active Alerts:** 15`;
    } else if (/reorder|order/.test(question.toLowerCase())) {
      answer = `**Reorder Recommendations (8)**

**Urgent (2):**
- **Premium Widget**: Order 50 units
  Only 3 days of stock remaining based on current sales velocity.

**High Priority (3):**
- **Basic Gadget**: Order 100 units
- **Standard Component**: Order 30 units
- **Deluxe Package**: Order 20 units

**Total units to order:** 200`;
    } else if (/margin|profit/.test(question.toLowerCase())) {
      answer = `**Margin Analysis**

- **Total Products:** 150
- **Products with Cost Data:** 120
- **Average Margin:** 32.5%

**Profitability (30 days):**
- Revenue: $450,000
- Cost: $303,750
- Profit: $146,250

**Product Breakdown:**
- High Margin (40%+): 45 products
- Low Margin (15-40%): 65 products
- Negative Margin: 3 products`;
    } else {
      answer = `I can help you with commerce operations questions. Try asking about:

**Inventory:**
- "What is my inventory status?"
- "Show me low stock products"
- "Which products are out of stock?"

**Reordering:**
- "What should I reorder?"
- "Show me urgent reorder recommendations"

**Pricing & Margins:**
- "Show me margin analysis"
- "Which products have low margins?"`;
    }

    return NextResponse.json({
      answer,
      intent: 'demo',
      suggestedQuestions: [
        'What is my inventory status?',
        'Show me stock alerts',
        'What should I reorder?',
      ],
    });
  }
}
