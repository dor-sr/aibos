import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  webhookGateway,
  getSupportedEvents,
  STRIPE_SUPPORTED_EVENTS,
} from '@aibos/connectors';

/**
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 *
 * This is a provider-specific endpoint that delegates to the unified webhook gateway.
 * For new implementations, use /api/webhooks/[provider] instead.
 *
 * Configuration:
 * 1. Set STRIPE_WEBHOOK_SECRET in environment variables
 * 2. Configure webhook endpoint in Stripe Dashboard:
 *    URL: https://yourdomain.com/api/webhooks/stripe
 *    Events: See STRIPE_SUPPORTED_EVENTS list
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headersList = await headers();
  
  // Build headers object
  const headersObj: Record<string, string> = {};
  headersList.forEach((value, key) => {
    headersObj[key.toLowerCase()] = value;
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  // Delegate to webhook gateway
  const result = await webhookGateway.handleWebhook(
    'stripe',
    rawBody,
    headersObj,
    webhookSecret
  );

  if (result.success) {
    return NextResponse.json({
      received: true,
      eventId: result.eventId,
      action: result.action,
      objectId: result.objectId,
      message: result.message,
    });
  } else {
    return NextResponse.json(
      {
        error: result.error,
        eventId: result.eventId,
      },
      { status: result.status }
    );
  }
}

/**
 * GET /api/webhooks/stripe - Verify webhook endpoint (for testing)
 */
export async function GET() {
  return NextResponse.json({
    status: process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'not_configured',
    events: STRIPE_SUPPORTED_EVENTS,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/stripe`,
    message: 'Consider using /api/webhooks/stripe (unified endpoint) for consistency',
  });
}
