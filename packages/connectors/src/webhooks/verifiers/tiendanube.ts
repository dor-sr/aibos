/**
 * Tiendanube Webhook Verifier
 * 
 * Note: Tiendanube doesn't use signature-based verification.
 * Instead, we verify by checking that the store_id matches the configured store.
 */

import type { WebhookVerifier, VerificationResult, ParsedWebhookEvent } from '../types';

/**
 * Tiendanube webhook verifier
 */
export class TiendanubeWebhookVerifier implements WebhookVerifier {
  provider = 'tiendanube' as const;

  getSignatureHeader(_headers: Record<string, string>): string | null {
    // Tiendanube doesn't use signature headers
    return null;
  }

  async verifyAndParse(
    rawBody: string,
    _signature: string | null,
    secret: string // We use this as store_id for verification
  ): Promise<VerificationResult> {
    try {
      const payload = JSON.parse(rawBody) as {
        store_id?: number | string;
        event?: string;
        id?: number | string;
        [key: string]: unknown;
      };

      // Verify store_id matches if provided
      if (secret && payload.store_id) {
        if (String(payload.store_id) !== String(secret)) {
          return {
            valid: false,
            error: 'Store ID mismatch',
          };
        }
      }

      // Extract event type from payload
      const eventType = payload.event || 'unknown';

      const parsedEvent: ParsedWebhookEvent = {
        id: `tiendanube-${payload.id || Date.now()}`,
        type: eventType,
        data: payload,
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
        error: `Failed to parse Tiendanube webhook: ${(err as Error).message}`,
      };
    }
  }
}

export const tiendanubeVerifier = new TiendanubeWebhookVerifier();
