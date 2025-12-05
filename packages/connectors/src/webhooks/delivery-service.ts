// Outbound Webhook Delivery Service
// Handles sending webhooks to external endpoints with retry logic

import crypto from 'crypto';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secretHash: string;
  events: string[];
  isActive: boolean;
  maxRetries: number;
  retryDelaySeconds: number;
  customHeaders?: Record<string, string>;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  workspaceId: string;
  data: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTimeMs: number;
  error?: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  workspaceId: string;
  eventType: string;
  eventId: string;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatusCode?: number;
  responseBody?: string;
  responseTimeMs?: number;
  errorMessage?: string;
  createdAt: Date;
  deliveredAt?: Date;
}

// Sign webhook payload with HMAC
export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signatureBase = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signatureBase)
    .digest('hex');
}

// Create webhook headers
export function createWebhookHeaders(
  webhookId: string,
  signature: string,
  timestamp: number,
  customHeaders?: Record<string, string>
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
    'X-Webhook-ID': webhookId,
    'X-Webhook-Timestamp': timestamp.toString(),
    'User-Agent': 'AIBOS-Webhook/1.0',
    ...customHeaders,
  };
}

// Verify webhook signature (for receivers to use)
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300 // 5 minutes
): boolean {
  // Parse signature header
  const parts = signatureHeader.split(',');
  const timestamp = parseInt(parts.find(p => p.startsWith('t='))?.substring(2) || '0', 10);
  const signature = parts.find(p => p.startsWith('v1='))?.substring(3);

  if (!timestamp || !signature) {
    return false;
  }

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  // Verify signature
  const expectedSignature = signWebhookPayload(payload, secret, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Calculate next retry delay with exponential backoff
export function calculateRetryDelay(
  attempt: number,
  baseDelaySeconds: number = 60
): number {
  // Exponential backoff: 1min, 2min, 4min, 8min, 16min (capped at 16min)
  const multiplier = Math.min(Math.pow(2, attempt - 1), 16);
  return baseDelaySeconds * multiplier * 1000; // Return milliseconds
}

// Deliver webhook to endpoint
export async function deliverWebhook(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload,
  eventId: string
): Promise<DeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(payloadString, endpoint.secretHash, timestamp);
  
  const headers = createWebhookHeaders(
    endpoint.id,
    signature,
    timestamp,
    endpoint.customHeaders
  );

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;
    const responseBody = await response.text();

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        responseBody: responseBody.substring(0, 1000),
        responseTimeMs,
      };
    }

    return {
      success: false,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000),
      responseTimeMs,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          responseTimeMs,
          error: 'Request timeout (30s)',
        };
      }
      return {
        success: false,
        responseTimeMs,
        error: error.message,
      };
    }

    return {
      success: false,
      responseTimeMs,
      error: 'Unknown error',
    };
  }
}

// Process delivery with retry logic
export async function processWebhookDelivery(
  endpoint: WebhookEndpoint,
  delivery: WebhookDelivery,
  onUpdate: (delivery: Partial<WebhookDelivery>) => Promise<void>
): Promise<boolean> {
  // Check if we should attempt delivery
  if (!endpoint.isActive) {
    await onUpdate({
      status: 'failed',
      errorMessage: 'Endpoint is inactive',
    });
    return false;
  }

  // Check max retries
  if (delivery.attempts >= endpoint.maxRetries) {
    await onUpdate({
      status: 'failed',
      errorMessage: `Max retries (${endpoint.maxRetries}) exceeded`,
    });
    return false;
  }

  // Attempt delivery
  const result = await deliverWebhook(
    endpoint,
    delivery.payload,
    delivery.eventId
  );

  if (result.success) {
    await onUpdate({
      status: 'success',
      attempts: delivery.attempts + 1,
      lastAttemptAt: new Date(),
      responseStatusCode: result.statusCode,
      responseBody: result.responseBody,
      responseTimeMs: result.responseTimeMs,
      deliveredAt: new Date(),
    });
    return true;
  }

  // Failed - schedule retry if attempts remain
  const newAttempts = delivery.attempts + 1;
  
  if (newAttempts < endpoint.maxRetries) {
    const retryDelay = calculateRetryDelay(newAttempts, endpoint.retryDelaySeconds);
    const nextRetryAt = new Date(Date.now() + retryDelay);

    await onUpdate({
      status: 'retrying',
      attempts: newAttempts,
      lastAttemptAt: new Date(),
      nextRetryAt,
      responseStatusCode: result.statusCode,
      responseBody: result.responseBody,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.error,
    });
    return false;
  }

  // No more retries
  await onUpdate({
    status: 'failed',
    attempts: newAttempts,
    lastAttemptAt: new Date(),
    responseStatusCode: result.statusCode,
    responseBody: result.responseBody,
    responseTimeMs: result.responseTimeMs,
    errorMessage: result.error,
  });
  return false;
}

// Event types that can trigger webhooks
export const WEBHOOK_EVENT_TYPES = {
  'anomaly.detected': {
    description: 'Triggered when an anomaly is detected in your metrics',
    payload: {
      anomaly_id: 'string',
      metric_name: 'string',
      severity: 'high | medium | low',
      deviation_percent: 'number',
    },
  },
  'report.generated': {
    description: 'Triggered when a new report is generated',
    payload: {
      report_id: 'string',
      report_type: 'weekly | monthly',
      period_start: 'ISO date string',
      period_end: 'ISO date string',
    },
  },
  'sync.completed': {
    description: 'Triggered when a connector sync completes successfully',
    payload: {
      connector_id: 'string',
      connector_type: 'string',
      records_synced: 'number',
      duration_ms: 'number',
    },
  },
  'sync.failed': {
    description: 'Triggered when a connector sync fails',
    payload: {
      connector_id: 'string',
      connector_type: 'string',
      error_message: 'string',
    },
  },
  'insight.created': {
    description: 'Triggered when a new insight is generated',
    payload: {
      insight_id: 'string',
      type: 'opportunity | risk | general',
      priority: 'high | medium | low',
      title: 'string',
    },
  },
  'metric.threshold_exceeded': {
    description: 'Triggered when a metric exceeds a configured threshold',
    payload: {
      metric_name: 'string',
      threshold: 'number',
      current_value: 'number',
      direction: 'above | below',
    },
  },
  'connector.connected': {
    description: 'Triggered when a new connector is successfully connected',
    payload: {
      connector_id: 'string',
      connector_type: 'string',
    },
  },
  'connector.disconnected': {
    description: 'Triggered when a connector is disconnected',
    payload: {
      connector_id: 'string',
      connector_type: 'string',
      reason: 'string',
    },
  },
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENT_TYPES;
