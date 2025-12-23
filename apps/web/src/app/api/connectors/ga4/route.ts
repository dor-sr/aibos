import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, connectors } from '@aibos/data-model';
import { GA4Connector, GA4Client } from '@aibos/connectors';
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
 * GET /api/connectors/ga4 - Get GA4 connector status or initiate OAuth
 */
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
    const workspaceId = searchParams.get('workspaceId');
    const action = searchParams.get('action');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // If action is 'auth', return the OAuth URL
    if (action === 'auth') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json(
          { error: 'Google OAuth not configured' },
          { status: 500 }
        );
      }

      // Generate state with workspace ID for callback
      const state = Buffer.from(
        JSON.stringify({ workspaceId, userId: user.id })
      ).toString('base64');

      const authUrl = GA4Client.getAuthorizationUrl(
        {
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          redirectUri: GOOGLE_REDIRECT_URI,
          scopes: GA4_SCOPES,
        },
        state
      );

      return NextResponse.json({ authUrl });
    }

    // Default: return connector status
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'ga4')
      ),
    });

    if (!connector) {
      return NextResponse.json({
        connected: false,
        connector: null,
      });
    }

    return NextResponse.json({
      connected: !!connector.credentials,
      connector: {
        id: connector.id,
        type: connector.type,
        status: connector.status,
        isEnabled: connector.isEnabled,
        lastSyncAt: connector.lastSyncAt,
        createdAt: connector.createdAt,
        propertyId: (connector.credentials as Record<string, unknown>)?.propertyId || null,
      },
    });
  } catch (error) {
    console.error('Error fetching GA4 connector:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 connector status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connectors/ga4 - Create or update GA4 connector with property ID
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, propertyId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'GA4 Property ID required' }, { status: 400 });
    }

    // Check if connector already exists and has valid tokens
    const existingConnector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'ga4')
      ),
    });

    if (!existingConnector) {
      return NextResponse.json(
        { error: 'Please connect your Google account first' },
        { status: 400 }
      );
    }

    const credentials = existingConnector.credentials as Record<string, unknown> | null;
    if (!credentials?.accessToken) {
      return NextResponse.json(
        { error: 'Please connect your Google account first' },
        { status: 400 }
      );
    }

    // Test connection with property ID
    const client = new GA4Client({
      accessToken: credentials.accessToken as string,
      refreshToken: credentials.refreshToken as string | undefined,
      propertyId,
    });

    const isValid = await client.testConnection();
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Property ID or insufficient permissions. Please check your GA4 property access.' },
        { status: 400 }
      );
    }

    // Update connector with property ID
    await db
      .update(connectors)
      .set({
        credentials: {
          ...credentials,
          propertyId,
        },
        status: 'active',
        isEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, existingConnector.id));

    return NextResponse.json({
      success: true,
      connector: {
        id: existingConnector.id,
        type: 'ga4',
        status: 'active',
        propertyId,
      },
      message: 'GA4 connector configured successfully',
    });
  } catch (error) {
    console.error('Error configuring GA4 connector:', error);
    return NextResponse.json(
      { error: 'Failed to configure GA4 connector' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/connectors/ga4 - Disconnect GA4
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    await db
      .delete(connectors)
      .where(
        and(
          eq(connectors.workspaceId, workspaceId),
          eq(connectors.type, 'ga4')
        )
      );

    return NextResponse.json({
      success: true,
      message: 'GA4 connector disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting GA4:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect GA4' },
      { status: 500 }
    );
  }
}






