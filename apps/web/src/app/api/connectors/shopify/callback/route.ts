import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import { connectors, workspaceMemberships } from '@aibos/data-model/schema';
import { ShopifyConnector } from '@aibos/connectors';
import { eq, and } from 'drizzle-orm';

// GET /api/connectors/shopify/callback - Handle Shopify OAuth callback
export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');

    if (!code || !shop || !state) {
      return NextResponse.redirect(`${appUrl}/dashboard?error=missing_params`);
    }

    // Decode state
    let stateData: { workspaceId: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(`${appUrl}/dashboard?error=invalid_state`);
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(`${appUrl}/login?redirect=/dashboard/connectors`);
    }

    // Verify user has access to workspace
    const membership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, stateData.workspaceId)
      ),
    });

    if (!membership) {
      return NextResponse.redirect(`${appUrl}/dashboard?error=unauthorized`);
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/dashboard?error=config_error`);
    }

    // Exchange code for access token
    const oauthResult = await ShopifyConnector.handleOAuthCallback(
      {
        clientId,
        clientSecret,
        scopes: [],
        redirectUri: `${appUrl}/api/connectors/shopify/callback`,
      },
      code,
      shop
    );

    // Check if connector already exists for this shop
    const existingConnector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, stateData.workspaceId),
        eq(connectors.type, 'shopify')
      ),
    });

    if (existingConnector) {
      // Update existing connector
      await db
        .update(connectors)
        .set({
          credentials: {
            accessToken: oauthResult.accessToken,
            shopDomain: oauthResult.shopDomain,
            scope: oauthResult.scope,
          },
          status: 'connected',
          updatedAt: new Date(),
        })
        .where(eq(connectors.id, existingConnector.id));
    } else {
      // Create new connector
      await db.insert(connectors).values({
        id: crypto.randomUUID(),
        workspaceId: stateData.workspaceId,
        type: 'shopify',
        name: `Shopify - ${shop.replace('.myshopify.com', '')}`,
        status: 'connected',
        credentials: {
          accessToken: oauthResult.accessToken,
          shopDomain: oauthResult.shopDomain,
          scope: oauthResult.scope,
        },
        settings: {
          syncInterval: 60, // Sync every hour
          syncHistory: true,
        },
      });
    }

    return NextResponse.redirect(`${appUrl}/dashboard/connectors?success=shopify`);
  } catch (error) {
    console.error('Error handling Shopify callback:', error);
    return NextResponse.redirect(`${appUrl}/dashboard/connectors?error=connection_failed`);
  }
}


