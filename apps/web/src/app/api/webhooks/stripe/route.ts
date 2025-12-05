import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db, connectors } from '@aibos/data-model';
import { StripeClient, processWebhookEvent, STRIPE_WEBHOOK_EVENTS } from '@aibos/connectors';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 *
 * This endpoint receives webhook events from Stripe and processes them
 * to keep our data in sync in real-time.
 *
 * Configuration:
 * 1. Set STRIPE_WEBHOOK_SECRET in environment variables
 * 2. Configure webhook endpoint in Stripe Dashboard:
 *    URL: https://yourdomain.com/api/webhooks/stripe
 *    Events: See STRIPE_WEBHOOK_EVENTS list
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  // Get the workspace ID from the webhook metadata or account
  // For now, we'll look up connectors by checking all active Stripe connectors
  // In production, you might want to use a more efficient lookup method

  try {
    // First, find all active Stripe connectors
    const stripeConnectors = await db.query.connectors.findMany({
      where: and(
        eq(connectors.type, 'stripe'),
        eq(connectors.isEnabled, true)
      ),
    });

    if (stripeConnectors.length === 0) {
      console.warn('No active Stripe connectors found');
      // Return 200 to acknowledge the webhook (avoid Stripe retries)
      return NextResponse.json({ received: true, processed: false });
    }

    // Try to verify the webhook with each connector's API key
    // This handles multi-tenant scenarios where different workspaces might have different Stripe accounts
    for (const connector of stripeConnectors) {
      if (!connector.credentials?.apiKey) continue;

      try {
        const client = new StripeClient({
          apiKey: connector.credentials.apiKey as string,
        });

        // Verify the webhook signature
        const event = client.constructWebhookEvent(body, signature, webhookSecret);

        // Check if this is an event type we care about
        if (!STRIPE_WEBHOOK_EVENTS.includes(event.type)) {
          console.log(`Ignoring unhandled event type: ${event.type}`);
          return NextResponse.json({
            received: true,
            eventType: event.type,
            action: 'ignored',
          });
        }

        // Process the webhook event
        const result = await processWebhookEvent(event, connector.workspaceId);

        if (result.success) {
          console.log(`Processed Stripe webhook: ${event.type}`, {
            eventId: event.id,
            workspaceId: connector.workspaceId,
            objectId: result.objectId,
            action: result.action,
          });

          return NextResponse.json({
            received: true,
            eventType: event.type,
            eventId: event.id,
            objectId: result.objectId,
            action: result.action,
          });
        } else {
          console.error(`Failed to process Stripe webhook: ${event.type}`, {
            eventId: event.id,
            error: result.error,
          });

          return NextResponse.json(
            {
              error: 'Failed to process event',
              details: result.error,
            },
            { status: 500 }
          );
        }
      } catch (verificationError) {
        // If verification fails, try the next connector
        // This might not be the right account for this webhook
        continue;
      }
    }

    // If we get here, we couldn't verify the webhook with any connector
    console.error('Could not verify webhook signature with any connector');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/stripe - Verify webhook endpoint (for testing)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    events: STRIPE_WEBHOOK_EVENTS,
    configured: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}
