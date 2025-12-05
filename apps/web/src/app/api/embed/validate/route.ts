// Embed token validation endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Token is required' },
      }, { status: 400 });
    }

    // Validate token format
    if (!token.startsWith('embed_') || token.length !== 70) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token format' },
      }, { status: 401 });
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Server configuration error' },
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash token for lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenPrefix = token.substring(0, 12);

    // Find token
    const { data: embedToken, error: lookupError } = await supabase
      .from('embed_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('token_prefix', tokenPrefix)
      .single();

    if (lookupError || !embedToken) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' },
      }, { status: 401 });
    }

    // Check status
    if (embedToken.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: { code: 'TOKEN_INACTIVE', message: `Token is ${embedToken.status}` },
      }, { status: 401 });
    }

    // Check expiration
    if (embedToken.expires_at && new Date(embedToken.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('embed_tokens')
        .update({ status: 'expired' })
        .eq('id', embedToken.id);

      return NextResponse.json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
      }, { status: 401 });
    }

    // Check domain if configured
    const allowedDomains = embedToken.allowed_domains as string[] || [];
    if (allowedDomains.length > 0) {
      const origin = request.headers.get('origin') || request.headers.get('referer');
      if (origin) {
        try {
          const originUrl = new URL(origin);
          const isAllowed = allowedDomains.some(
            (domain) =>
              originUrl.hostname === domain ||
              originUrl.hostname.endsWith(`.${domain}`)
          );

          if (!isAllowed) {
            return NextResponse.json({
              success: false,
              error: {
                code: 'DOMAIN_NOT_ALLOWED',
                message: 'Domain not allowed for this token',
              },
            }, { status: 403 });
          }
        } catch {
          // Invalid origin URL, continue
        }
      }
    }

    // Update last used and view count (non-blocking)
    supabase
      .from('embed_tokens')
      .update({
        last_used_at: new Date().toISOString(),
        view_count: (embedToken.view_count || 0) + 1,
      })
      .eq('id', embedToken.id)
      .then(() => {});

    // Log view (non-blocking)
    supabase
      .from('embed_views')
      .insert({
        token_id: embedToken.id,
        workspace_id: embedToken.workspace_id,
        embed_type: 'dashboard',
        referrer_domain: request.headers.get('origin') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        ip_address:
          request.headers.get('x-forwarded-for')?.split(',')[0] ||
          request.headers.get('x-real-ip') ||
          undefined,
      })
      .then(() => {});

    return NextResponse.json({
      success: true,
      data: {
        workspaceId: embedToken.workspace_id,
        permissions: embedToken.permissions,
        customization: embedToken.customization,
      },
    });
  } catch (error) {
    console.error('Embed validation error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    }, { status: 500 });
  }
}
