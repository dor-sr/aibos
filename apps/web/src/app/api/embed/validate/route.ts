// Embed Token Validation API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Demo data for when database is not available
const DEMO_METRICS = {
  revenue: { value: '$24,500', change: '+12.5%', label: 'Total Revenue' },
  orders: { value: '156', change: '+8.2%', label: 'Orders' },
  aov: { value: '$157', change: '+3.8%', label: 'Average Order Value' },
  customers: { value: '1,234', change: '+15.1%', label: 'Customers' },
  mrr: { value: '$12,500', change: '+6.3%', label: 'Monthly Recurring Revenue' },
  churn: { value: '2.5%', change: '-0.5%', label: 'Churn Rate' },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const embedType = searchParams.get('type');

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_TOKEN', message: 'Embed token is required' } },
      { status: 400 }
    );
  }

  // Check for demo token
  if (token.startsWith('demo_')) {
    return NextResponse.json({
      success: true,
      data: {
        config: {
          workspaceId: 'demo',
          permissions: { metrics: Object.keys(DEMO_METRICS), charts: ['revenue', 'orders'] },
          customization: { theme: 'light', hideBranding: false },
        },
        data: DEMO_METRICS,
      },
    });
  }

  // Validate token format
  if (!token.startsWith('embed_') || token.length !== 70) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid embed token format' } },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // Return demo data if database is not configured
    return NextResponse.json({
      success: true,
      data: {
        config: {
          workspaceId: 'demo',
          permissions: { metrics: Object.keys(DEMO_METRICS) },
          customization: { theme: 'light' },
        },
        data: DEMO_METRICS,
      },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Hash token for lookup
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenPrefix = token.substring(0, 12);

  // Lookup token
  const { data: tokenRecord, error: lookupError } = await supabase
    .from('embed_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('token_prefix', tokenPrefix)
    .single();

  if (lookupError || !tokenRecord) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid embed token' } },
      { status: 401 }
    );
  }

  // Check status
  if (tokenRecord.status !== 'active') {
    return NextResponse.json(
      { success: false, error: { code: 'TOKEN_INACTIVE', message: `Embed token is ${tokenRecord.status}` } },
      { status: 401 }
    );
  }

  // Check expiration
  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    await supabase
      .from('embed_tokens')
      .update({ status: 'expired' })
      .eq('id', tokenRecord.id);

    return NextResponse.json(
      { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Embed token has expired' } },
      { status: 401 }
    );
  }

  // Check allowed domains
  const referer = request.headers.get('referer');
  if (referer && tokenRecord.allowed_domains && tokenRecord.allowed_domains.length > 0) {
    try {
      const refererDomain = new URL(referer).hostname;
      const isAllowed = tokenRecord.allowed_domains.some((domain: string) => {
        if (domain.startsWith('*.')) {
          return refererDomain.endsWith(domain.substring(1));
        }
        return refererDomain === domain;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: { code: 'DOMAIN_NOT_ALLOWED', message: 'Domain not allowed for this embed token' } },
          { status: 403 }
        );
      }
    } catch {
      // Invalid referer URL, skip check
    }
  }

  // Update last used and view count (non-blocking)
  supabase
    .from('embed_tokens')
    .update({
      last_used_at: new Date().toISOString(),
      view_count: (tokenRecord.view_count || 0) + 1,
    })
    .eq('id', tokenRecord.id)
    .then(() => {});

  // Log embed view (non-blocking)
  supabase
    .from('embed_views')
    .insert({
      token_id: tokenRecord.id,
      workspace_id: tokenRecord.workspace_id,
      embed_type: embedType || 'unknown',
      referrer_domain: referer ? new URL(referer).hostname : null,
      user_agent: request.headers.get('user-agent') || null,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
    })
    .then(() => {});

  // Fetch data based on permissions and type
  let embedData: unknown = DEMO_METRICS;

  // In a real implementation, fetch actual data from database
  // based on tokenRecord.permissions and embedType

  return NextResponse.json({
    success: true,
    data: {
      config: {
        workspaceId: tokenRecord.workspace_id,
        permissions: tokenRecord.permissions,
        customization: tokenRecord.customization,
      },
      data: embedData,
    },
  });
}
