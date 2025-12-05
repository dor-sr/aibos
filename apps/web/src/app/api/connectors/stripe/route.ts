import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, connectors } from '@aibos/data-model';
import { StripeConnector, StripeClient } from '@aibos/connectors';
import { generateId } from '@aibos/core';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/connectors/stripe - Get Stripe connector status
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

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Check if Stripe connector exists for this workspace
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'stripe')
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
      },
    });
  } catch (error) {
    console.error('Error fetching Stripe connector:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe connector status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connectors/stripe - Connect Stripe with API key
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
    const { workspaceId, apiKey } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Stripe API key required' }, { status: 400 });
    }

    // Validate the API key by testing connection
    const client = new StripeClient({ apiKey });
    const isValid = await client.testConnection();

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Stripe API key. Please check your credentials.' },
        { status: 400 }
      );
    }

    // Check if connector already exists
    const existingConnector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.workspaceId, workspaceId),
        eq(connectors.type, 'stripe')
      ),
    });

    if (existingConnector) {
      // Update existing connector
      await db
        .update(connectors)
        .set({
          credentials: { apiKey },
          status: 'active',
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(connectors.id, existingConnector.id));

      return NextResponse.json({
        success: true,
        connector: {
          id: existingConnector.id,
          type: 'stripe',
          status: 'active',
        },
        message: 'Stripe connector updated successfully',
      });
    }

    // Create new connector
    const connectorId = generateId();
    await db
      .insert(connectors)
      .values({
        id: connectorId,
        workspaceId,
        type: 'stripe',
        credentials: { apiKey },
        status: 'active',
        isEnabled: true,
        settings: {
          syncInterval: 360, // 6 hours in minutes
        },
      });

    return NextResponse.json({
      success: true,
      connector: {
        id: connectorId,
        type: 'stripe',
        status: 'active',
      },
      message: 'Stripe connector created successfully',
    });
  } catch (error) {
    console.error('Error creating Stripe connector:', error);
    return NextResponse.json(
      { error: 'Failed to connect Stripe' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/connectors/stripe - Disconnect Stripe
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
          eq(connectors.type, 'stripe')
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Stripe connector disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting Stripe:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Stripe' },
      { status: 500 }
    );
  }
}
