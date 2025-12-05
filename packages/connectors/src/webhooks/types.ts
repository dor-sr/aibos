/**
 * Webhook Gateway Types
 * Defines the interfaces for webhook processing across all providers
 */

// Supported webhook providers (must match connector_type enum in data-model)
export type WebhookProvider = 
  | 'stripe'
  | 'shopify'
  | 'tiendanube'
  | 'mercadolibre'
  | 'woocommerce'
  | 'meta_ads'
  | 'google_ads'
  | 'ga4';

// Webhook verification result
export interface VerificationResult {
  valid: boolean;
  workspaceId?: string;
  connectorId?: string;
  error?: string;
  event?: ParsedWebhookEvent;
}

// Parsed webhook event
export interface ParsedWebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp?: Date;
  rawPayload: Record<string, unknown>;
}

// Webhook processing result
export interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  objectId: string;
  action: string;
  message?: string;
  error?: string;
}

// Provider verifier interface
export interface WebhookVerifier {
  provider: WebhookProvider;
  
  /**
   * Verify the webhook signature and extract the event
   */
  verifyAndParse(
    rawBody: string,
    signature: string | null,
    secret: string,
    headers?: Record<string, string>
  ): Promise<VerificationResult>;
  
  /**
   * Get the signature from request headers
   */
  getSignatureHeader(headers: Record<string, string>): string | null;
}

// Event processor interface
export interface WebhookEventProcessor {
  provider: WebhookProvider;
  
  /**
   * Process a webhook event
   */
  processEvent(
    event: ParsedWebhookEvent,
    workspaceId: string,
    connectorId?: string
  ): Promise<WebhookProcessingResult>;
  
  /**
   * Get list of event types this processor handles
   */
  getSupportedEventTypes(): string[];
}

// Gateway configuration
export interface WebhookGatewayConfig {
  // Maximum retry attempts for failed events
  maxRetryAttempts: number;
  // Base delay for exponential backoff (ms)
  retryBaseDelayMs: number;
  // Maximum delay between retries (ms)
  retryMaxDelayMs: number;
  // Whether to log all events
  logAllEvents: boolean;
}

// Default gateway configuration
export const DEFAULT_GATEWAY_CONFIG: WebhookGatewayConfig = {
  maxRetryAttempts: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 60000,
  logAllEvents: true,
};


