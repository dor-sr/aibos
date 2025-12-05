import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, connectors } from '@aibos/data-model';
import { GA4Client } from '@aibos/connectors';
import { generateId } from '@aibos/core';
import { eq, and } from 'drizzle-orm';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/connectors/ga4/callback`;

const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

/**
 * GET /api/connectors/ga4/callback - Handle Google OAuth callback
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/connectors?error=oauth_failed', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/connectors?error=missing_params', request.url)
      );
    }

    // Decode state to get workspace ID
    let stateData: { workspaceId: string; userId: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/connectors?error=invalid_state', request.url)
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await GA4Client.exchangeCodeForTokens(
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri: GOOGLE_REDIRECT_URI,
        scopes: GA4_SCOPES,
      },
      code
    );

    // Check if connector already exists
    const existingConnector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, stateData.workspaceId),
        eq(connectors.type, 'ga4')
      ),
    });

    const credentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope,
    };

    if (existingConnector) {
      // Update existing connector
      await db
        .update(connectors)
        .set({
          credentials,
          status: 'connected',
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(connectors.id, existingConnector.id));
    } else {
      // Create new connector
      const connectorId = generateId();
      await db.insert(connectors).values({
        id: connectorId,
        workspaceId: stateData.workspaceId,
        type: 'ga4',
        credentials,
        status: 'connected',
        isEnabled: true,
        settings: {
          syncInterval: 1440, // Daily sync in minutes
        },
      });
    }

    // Redirect back to connectors page with success message
    return NextResponse.redirect(
      new URL('/dashboard/connectors?success=ga4_connected', request.url)
    );
  } catch (error) {
    console.error('Error handling GA4 OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/connectors?error=callback_failed', request.url)
    );
  }
}

