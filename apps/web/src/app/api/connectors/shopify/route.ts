import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShopifyConnector } from '@aibos/connectors';

// GET /api/connectors/shopify - Initiate Shopify OAuth
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const workspaceId = searchParams.get('workspaceId');

    if (!shop) {
      return NextResponse.json({ error: 'Shop domain is required' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Validate shop domain format
    const shopDomain = shop.includes('.myshopify.com') 
      ? shop 
      : `${shop}.myshopify.com`;

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Shopify credentials not configured' },
        { status: 500 }
      );
    }

    // Create state with workspace info for callback
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl = ShopifyConnector.getAuthorizationUrl(
      {
        clientId,
        clientSecret,
        scopes: [
          'read_orders',
          'read_products',
          'read_customers',
          'read_inventory',
          'read_analytics',
        ],
        redirectUri: `${appUrl}/api/connectors/shopify/callback`,
      },
      state,
      shopDomain
    );

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Shopify OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Shopify connection' },
      { status: 500 }
    );
  }
}
