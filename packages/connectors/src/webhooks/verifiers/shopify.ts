import crypto from 'crypto';
import type { WebhookVerifier, VerificationResult, ParsedWebhookEvent } from '../types';

/**
 * Shopify webhook verifier
 * Uses HMAC-SHA256 signature verification
 */
export class ShopifyWebhookVerifier implements WebhookVerifier {
  provider = 'shopify' as const;

  getSignatureHeader(headers: Record<string, string>): string | null {
    // Shopify uses 'X-Shopify-Hmac-SHA256' header
    return (
      headers['x-shopify-hmac-sha256'] ||
      headers['X-Shopify-Hmac-SHA256'] ||
      headers['X-Shopify-Hmac-Sha256'] ||
      null
    );
  }

  async verifyAndParse(
    rawBody: string,
    signature: string | null,
    secret: string,
    headers?: Record<string, string>
  ): Promise<VerificationResult> {
    if (!signature) {
      return {
        valid: false,
        error: 'Missing Shopify HMAC signature header',
      };
    }

    try {
      // Calculate HMAC
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody, 'utf8');
      const calculatedSignature = hmac.digest('base64');

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'Shopify HMAC signature verification failed',
        };
      }

      // Parse the body
      const payload = JSON.parse(rawBody) as Record<string, unknown>;

      // Extract topic from headers if available
      const topic = headers?.['x-shopify-topic'] || 
                    headers?.['X-Shopify-Topic'] || 
                    'unknown';

      // Extract shop domain from headers
      const shopDomain = headers?.['x-shopify-shop-domain'] ||
                         headers?.['X-Shopify-Shop-Domain'];

      // Generate a unique event ID from webhook ID or timestamp
      const eventId = (headers?.['x-shopify-webhook-id'] ||
                      headers?.['X-Shopify-Webhook-Id'] ||
                      `shopify_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);

      const parsedEvent: ParsedWebhookEvent = {
        id: eventId,
        type: topic,
        data: {
          ...payload,
          shopDomain,
        },
        timestamp: new Date(),
        rawPayload: payload,
      };

      return {
        valid: true,
        event: parsedEvent,
      };
    } catch (err) {
      return {
        valid: false,
        error: `Shopify webhook verification failed: ${(err as Error).message}`,
      };
    }
  }
}

export const shopifyVerifier = new ShopifyWebhookVerifier();


