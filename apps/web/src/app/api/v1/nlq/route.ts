// Public API v1 - Natural Language Query endpoint
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  withApiAuth, 
  ApiAuthContext 
} from '@/lib/api/auth';
import { 
  createApiSuccess, 
  createApiError,
} from '@/lib/api/response';

// Demo responses for when OpenAI is not configured
const DEMO_RESPONSES: Record<string, { answer: string; data?: unknown }> = {
  revenue: {
    answer: 'Your total revenue for this period is $24,500. This represents a 12% increase compared to the previous period.',
    data: {
      value: 24500,
      currency: 'USD',
      change: 12,
      changeType: 'increase',
    },
  },
  orders: {
    answer: 'You received 156 orders in this period, with an average order value of $157. Most orders came from returning customers (68%).',
    data: {
      count: 156,
      aov: 157,
      returningCustomerPercent: 68,
    },
  },
  customers: {
    answer: 'You have 1,234 total customers. 89 new customers joined in this period, and your customer retention rate is 85%.',
    data: {
      total: 1234,
      new: 89,
      retentionRate: 85,
    },
  },
  products: {
    answer: 'Your top selling product is "Premium Widget" with 45 units sold. The top 5 products account for 40% of total revenue.',
    data: {
      topProduct: 'Premium Widget',
      topProductUnits: 45,
      top5RevenuePercent: 40,
    },
  },
  mrr: {
    answer: 'Your current MRR is $12,500, with an ARR of $150,000. You added $1,200 in new MRR this month.',
    data: {
      mrr: 12500,
      arr: 150000,
      newMrr: 1200,
    },
  },
  churn: {
    answer: 'Your monthly churn rate is 2.5%, which is below the industry average of 5%. You lost 3 customers this month.',
    data: {
      churnRate: 2.5,
      industryAverage: 5,
      customersLost: 3,
    },
  },
};

// POST - Ask a natural language question
async function handler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  
  // Parse body
  let body: { question: string; vertical?: string };
  try {
    body = await request.json();
  } catch {
    return createApiError('Invalid JSON body', 'VALIDATION_ERROR', 400);
  }
  
  if (!body.question || body.question.trim().length === 0) {
    return createApiError('question is required', 'MISSING_PARAMETER', 400);
  }
  
  const question = body.question.trim().toLowerCase();
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get workspace vertical
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('vertical_type')
    .eq('id', workspaceId)
    .single();
  
  const vertical = body.vertical || workspace?.vertical_type || 'ecommerce';
  
  // Check if OpenAI is configured
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    // Return demo response based on question keywords
    let demoKey = 'revenue';
    
    if (question.includes('order')) demoKey = 'orders';
    else if (question.includes('customer')) demoKey = 'customers';
    else if (question.includes('product') || question.includes('selling')) demoKey = 'products';
    else if (question.includes('mrr') || question.includes('recurring')) demoKey = 'mrr';
    else if (question.includes('churn') || question.includes('cancel')) demoKey = 'churn';
    
    const demo = DEMO_RESPONSES[demoKey] || DEMO_RESPONSES['revenue']!;
    
    // Log question to history
    await supabase.from('question_history').insert({
      workspace_id: workspaceId,
      question: body.question,
      response: demo.answer,
      response_data: demo.data,
      is_demo: true,
    });
    
    return createApiSuccess({
      question: body.question,
      answer: demo.answer,
      data: demo.data,
      vertical,
      isDemo: true,
      message: 'Demo mode - Configure OPENAI_API_KEY for real responses',
    });
  }
  
  // Call OpenAI for real response
  try {
    const systemPrompt = `You are an AI analytics assistant for a ${vertical} business. 
Answer questions about business metrics, performance, and trends.
Be concise and data-driven in your responses.
When possible, include specific numbers and percentages.
Format currency values with $ symbol.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: body.question },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Unable to generate response.';
    
    // Log question to history
    await supabase.from('question_history').insert({
      workspace_id: workspaceId,
      question: body.question,
      response: answer,
      is_demo: false,
    });
    
    return createApiSuccess({
      question: body.question,
      answer,
      vertical,
      isDemo: false,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    });
  } catch (error) {
    console.error('NLQ error:', error);
    
    // Fallback to demo response
    const demo = DEMO_RESPONSES['revenue']!;
    
    return createApiSuccess({
      question: body.question,
      answer: demo.answer,
      data: demo.data,
      vertical,
      isDemo: true,
      message: 'Fallback to demo mode due to API error',
    });
  }
}

export const POST = withApiAuth(handler, {
  requiredScopes: ['nlq:query'],
});

