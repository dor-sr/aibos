import Stripe from 'stripe';
import type { WebhookVerifier, VerificationResult, ParsedWebhookEvent } from '../types';

/**
 * Stripe webhook verifier
 * Uses Stripe's built-in signature verification
 */
export class StripeWebhookVerifier implements WebhookVerifier {
  provider = 'stripe' as const;

  getSignatureHeader(headers: Record<string, string>): string | null {
    // Stripe uses 'stripe-signature' header
    return headers['stripe-signature'] || headers['Stripe-Signature'] || null;
  }

  async verifyAndParse(
    rawBody: string,
    signature: string | null,
    secret: string
  ): Promise<VerificationResult> {
    if (!signature) {
      return {
        valid: false,
        error: 'Missing Stripe signature header',
      };
    }

    try {
      // Construct the event using Stripe's verification
      const event = Stripe.webhooks.constructEvent(rawBody, signature, secret);

      const parsedEvent: ParsedWebhookEvent = {
        id: event.id,
        type: event.type,
        data: event.data.object as unknown as Record<string, unknown>,
        timestamp: new Date(event.created * 1000),
        rawPayload: event as unknown as Record<string, unknown>,
      };

      return {
        valid: true,
        event: parsedEvent,
      };
    } catch (err) {
      return {
        valid: false,
        error: `Stripe webhook verification failed: ${(err as Error).message}`,
      };
    }
  }
}

export const stripeVerifier = new StripeWebhookVerifier();
