import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db, connectors, webhookConfigs } from '@aibos/data-model';
import {
  webhookGateway,
  isProviderSupported,
  getSupportedProviders,
  getSupportedEvents,
  type WebhookProvider,
} from '@aibos/connectors';
import { eq, and } from 'drizzle-orm';

// Type for dynamic route params
type Props = {
  params: Promise<{ provider: string }>;
};

/**
 * POST /api/webhooks/[provider] - Unified webhook endpoint
 * 
 * Receives webhook events from external providers and processes them
 * through the webhook gateway.
 * 
 * Configuration:
 * 1. Set the webhook signing secret for each provider in the webhook_configs table
 *    or environment variables (e.g., STRIPE_WEBHOOK_SECRET, SHOPIFY_WEBHOOK_SECRET)
 * 2. Configure webhook endpoints in each provider's dashboard:
 *    - Stripe: https://yourdomain.com/api/webhooks/stripe
 *    - Shopify: https://yourdomain.com/api/webhooks/shopify
 */
export async function POST(request: Request, { params }: Props) {
  const { provider } = await params;
  
  // Validate provider
  if (!isProviderSupported(provider)) {
    console.warn(`Unsupported webhook provider: ${provider}`);
    return NextResponse.json(
      {
        error: 'Unsupported provider',
        supportedProviders: getSupportedProviders(),
      },
      { status: 400 }
    );
  }

  const webhookProvider = provider as WebhookProvider;

  // Get raw body for signature verification
  const rawBody = await request.text();
  
  // Get headers
  const headersList = await headers();
  const headersObj: Record<string, string> = {};
  headersList.forEach((value, key) => {
    headersObj[key.toLowerCase()] = value;
  });

  // Get signing secret
  const signingSecret = await getSigningSecret(webhookProvider);
  
  if (!signingSecret) {
    console.error(`No signing secret configured for ${provider}`);
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  // Process through gateway
  const result = await webhookGateway.handleWebhook(
    provider,
    rawBody,
    headersObj,
    signingSecret
  );

  // Return appropriate response
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
 * GET /api/webhooks/[provider] - Get webhook endpoint info
 * 
 * Returns information about the webhook endpoint including
 * supported events and configuration status.
 */
export async function GET(request: Request, { params }: Props) {
  const { provider } = await params;

  if (!isProviderSupported(provider)) {
    return NextResponse.json(
      {
        error: 'Unsupported provider',
        supportedProviders: getSupportedProviders(),
      },
      { status: 400 }
    );
  }

  const webhookProvider = provider as WebhookProvider;
  const signingSecret = await getSigningSecret(webhookProvider);

  return NextResponse.json({
    provider,
    status: signingSecret ? 'configured' : 'not_configured',
    supportedEvents: getSupportedEvents(webhookProvider),
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/${provider}`,
  });
}

/**
 * Get signing secret for a provider
 * Checks environment variables first, then webhook configs table
 */
async function getSigningSecret(provider: WebhookProvider): Promise<string | null> {
  // Check environment variables first
  const envKey = `${provider.toUpperCase()}_WEBHOOK_SECRET`;
  const envSecret = process.env[envKey];
  if (envSecret) {
    return envSecret;
  }

  // Check webhook configs table
  try {
    // Find the first active connector for this provider
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.type, provider),
        eq(connectors.isEnabled, true)
      ),
    });

    if (connector) {
      // Look for webhook config
      const config = await db.query.webhookConfigs.findFirst({
        where: eq(webhookConfigs.connectorId, connector.id),
      });

      if (config?.signingSecret) {
        return config.signingSecret;
      }
    }
  } catch {
    // Table might not exist yet
  }

  return null;
}




