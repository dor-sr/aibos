/**
 * MercadoLibre Webhook Verifier
 * 
 * MercadoLibre uses notification-based webhooks.
 * Verification is done by checking the user_id matches the configured user.
 */

import type { WebhookVerifier, VerificationResult, ParsedWebhookEvent } from '../types';

/**
 * MercadoLibre webhook verifier
 */
export class MercadoLibreWebhookVerifier implements WebhookVerifier {
  provider = 'mercadolibre' as const;

  getSignatureHeader(_headers: Record<string, string>): string | null {
    // MercadoLibre doesn't use signature headers
    return null;
  }

  async verifyAndParse(
    rawBody: string,
    _signature: string | null,
    secret: string // We use this as user_id for verification
  ): Promise<VerificationResult> {
    try {
      const payload = JSON.parse(rawBody) as {
        user_id?: number | string;
        topic?: string;
        resource?: string;
        application_id?: number | string;
        _id?: string;
        sent?: string;
        attempts?: number;
        [key: string]: unknown;
      };

      // Verify user_id matches if provided
      if (secret && payload.user_id) {
        if (String(payload.user_id) !== String(secret)) {
          return {
            valid: false,
            error: 'User ID mismatch',
          };
        }
      }

      // Extract event type from topic
      const eventType = payload.topic || 'unknown';

      const parsedEvent: ParsedWebhookEvent = {
        id: payload._id || `mercadolibre-${Date.now()}`,
        type: eventType,
        data: payload,
        timestamp: payload.sent ? new Date(payload.sent) : new Date(),
        rawPayload: payload,
      };

      return {
        valid: true,
        event: parsedEvent,
      };
    } catch (err) {
      return {
        valid: false,
        error: `Failed to parse MercadoLibre webhook: ${(err as Error).message}`,
      };
    }
  }
}

export const mercadolibreVerifier = new MercadoLibreWebhookVerifier();
