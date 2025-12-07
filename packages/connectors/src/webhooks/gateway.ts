/**
 * Webhook Gateway Service
 * Unified webhook processing for all providers
 */

import { createLogger, generateId } from '@aibos/core';
import { db, webhookEvents, connectors, type Connector } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type {
  WebhookProvider,
  WebhookGatewayConfig,
  WebhookProcessingResult,
  ParsedWebhookEvent,
} from './types';
import { DEFAULT_GATEWAY_CONFIG } from './types';
import { getVerifier, isProviderSupported } from './verifiers';
import { getEventProcessor } from './processors';

// Type for connector types that match both WebhookProvider and connector_type enum
type ConnectorType = Connector['type'];

const logger = createLogger('webhook:gateway');

/**
 * Webhook Gateway
 * Handles webhook reception, verification, logging, and processing
 */
export class WebhookGateway {
  private config: WebhookGatewayConfig;

  constructor(config: Partial<WebhookGatewayConfig> = {}) {
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
  }

  /**
   * Handle an incoming webhook request
   */
  async handleWebhook(
    provider: string,
    rawBody: string,
    headers: Record<string, string>,
    signingSecret: string
  ): Promise<WebhookGatewayResult> {
    const receivedAt = new Date();

    // Validate provider
    if (!isProviderSupported(provider)) {
      logger.warn('Unsupported webhook provider', { provider });
      return {
        success: false,
        status: 400,
        error: `Unsupported provider: ${provider}`,
      };
    }

    const webhookProvider = provider as WebhookProvider;
    const verifier = getVerifier(webhookProvider);

    if (!verifier) {
      logger.error('No verifier found for provider', undefined, { provider });
      return {
        success: false,
        status: 500,
        error: 'Internal configuration error',
      };
    }

    // Get signature from headers
    const signature = verifier.getSignatureHeader(headers);

    // Verify the webhook
    const verificationResult = await verifier.verifyAndParse(
      rawBody,
      signature,
      signingSecret,
      headers
    );

    if (!verificationResult.valid || !verificationResult.event) {
      logger.warn('Webhook verification failed', {
        provider,
        error: verificationResult.error,
      });
      return {
        success: false,
        status: 401,
        error: verificationResult.error || 'Verification failed',
      };
    }

    const event = verificationResult.event;

    // Check for idempotency (duplicate event)
    const existingEvent = await this.findExistingEvent(webhookProvider, event.id);
    if (existingEvent) {
      logger.info('Duplicate webhook event received, skipping', {
        provider,
        eventId: event.id,
        existingEventId: existingEvent.id,
      });
      return {
        success: true,
        status: 200,
        eventId: existingEvent.id,
        action: 'skipped',
        message: 'Duplicate event',
      };
    }

    // Find the connector for this webhook
    const connector = await this.findConnectorForEvent(webhookProvider, event);
    
    if (!connector) {
      logger.warn('No connector found for webhook event', {
        provider,
        eventType: event.type,
      });
      // Still log the event for debugging purposes
      const eventId = await this.logEvent({
        provider: webhookProvider,
        event,
        receivedAt,
        status: 'skipped',
        workspaceId: null,
        connectorId: null,
      });
      return {
        success: true,
        status: 200,
        eventId,
        action: 'skipped',
        message: 'No connector found',
      };
    }

    // Log the event
    const eventId = await this.logEvent({
      provider: webhookProvider,
      event,
      receivedAt,
      status: 'processing',
      workspaceId: connector.workspaceId,
      connectorId: connector.id,
    });

    // Process the event
    const processingResult = await this.processEvent(
      webhookProvider,
      event,
      connector.workspaceId,
      connector.id
    );

    // Update event status
    await this.updateEventStatus(eventId, processingResult);

    if (processingResult.success) {
      logger.info('Webhook processed successfully', {
        provider,
        eventType: event.type,
        eventId,
        objectId: processingResult.objectId,
        action: processingResult.action,
      });
      return {
        success: true,
        status: 200,
        eventId,
        action: processingResult.action,
        objectId: processingResult.objectId,
      };
    } else {
      logger.error('Webhook processing failed', undefined, {
        provider,
        eventType: event.type,
        eventId,
        errorMessage: processingResult.error,
      });
      return {
        success: false,
        status: 500,
        eventId,
        error: processingResult.error,
      };
    }
  }

  /**
   * Find an existing event by provider and external ID
   */
  private async findExistingEvent(
    provider: WebhookProvider,
    externalEventId: string
  ) {
    try {
      return await db.query.webhookEvents.findFirst({
        where: and(
          eq(webhookEvents.provider, provider),
          eq(webhookEvents.externalEventId, externalEventId)
        ),
      });
    } catch {
      // Table might not exist yet during development
      return null;
    }
  }

  /**
   * Find the connector for this webhook event
   */
  private async findConnectorForEvent(
    provider: WebhookProvider,
    _event: ParsedWebhookEvent
  ) {
    // For now, find the first active connector for this provider
    // In production, you might want to match based on event data (e.g., account ID)
    try {
      // Cast provider to ConnectorType since they share the same values
      const connectorType = provider as ConnectorType;
      return await db.query.connectors.findFirst({
        where: and(
          eq(connectors.type, connectorType),
          eq(connectors.isEnabled, true)
        ),
      });
    } catch {
      return null;
    }
  }

  /**
   * Log a webhook event to the database
   */
  private async logEvent(params: {
    provider: WebhookProvider;
    event: ParsedWebhookEvent;
    receivedAt: Date;
    status: 'pending' | 'processing' | 'skipped';
    workspaceId: string | null;
    connectorId: string | null;
  }): Promise<string> {
    const eventId = generateId();

    try {
      await db.insert(webhookEvents).values({
        id: eventId,
        workspaceId: params.workspaceId || 'unknown',
        connectorId: params.connectorId,
        provider: params.provider,
        externalEventId: params.event.id,
        eventType: params.event.type,
        payload: params.event.rawPayload,
        status: params.status,
        receivedAt: params.receivedAt,
        attempts: params.status === 'processing' ? 1 : 0,
      });
    } catch (err) {
      logger.error('Failed to log webhook event', err as Error, {
        provider: params.provider,
        eventId: params.event.id,
      });
    }

    return eventId;
  }

  /**
   * Process a webhook event
   */
  private async processEvent(
    provider: WebhookProvider,
    event: ParsedWebhookEvent,
    workspaceId: string,
    connectorId: string
  ): Promise<WebhookProcessingResult> {
    const processor = getEventProcessor(provider);

    if (!processor) {
      // No processor, but still a valid event - just acknowledge it
      return {
        success: true,
        eventType: event.type,
        objectId: 'unknown',
        action: 'acknowledged',
        message: 'No processor configured for this provider',
      };
    }

    try {
      return await processor.processEvent(event, workspaceId, connectorId);
    } catch (err) {
      return {
        success: false,
        eventType: event.type,
        objectId: 'unknown',
        action: 'error',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Update event status after processing
   */
  private async updateEventStatus(
    eventId: string,
    result: WebhookProcessingResult
  ): Promise<void> {
    try {
      await db
        .update(webhookEvents)
        .set({
          status: result.success ? 'completed' : 'failed',
          processedAt: new Date(),
          processingResult: {
            success: result.success,
            action: result.action,
            objectId: result.objectId,
            message: result.message,
          },
          lastError: result.error,
          updatedAt: new Date(),
        })
        .where(eq(webhookEvents.id, eventId));
    } catch (err) {
      logger.error('Failed to update event status', err as Error, { eventId });
    }
  }
}

// Result type for webhook handling
export interface WebhookGatewayResult {
  success: boolean;
  status: number;
  eventId?: string;
  action?: string;
  objectId?: string;
  message?: string;
  error?: string;
}

// Export singleton instance
export const webhookGateway = new WebhookGateway();




