/**
 * Real-time Data Pipeline Types
 * Types for event streaming, metric updates, and real-time processing
 */

// Event types that can trigger real-time updates
export type RealtimeEventType =
  | 'order.created'
  | 'order.updated'
  | 'customer.created'
  | 'customer.updated'
  | 'product.created'
  | 'product.updated'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'invoice.paid'
  | 'invoice.failed'
  | 'metrics.updated'
  | 'anomaly.detected';

// Real-time event payload
export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  workspaceId: string;
  connectorId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Metric update event data
export interface MetricUpdateData {
  metricName: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  period: string;
  currency?: string;
}

// Anomaly event data
export interface AnomalyEventData {
  anomalyId: string;
  metricName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
}

// Event subscriber callback
export type EventCallback = (event: RealtimeEvent) => void | Promise<void>;

// Subscription handle
export interface EventSubscription {
  id: string;
  unsubscribe: () => void;
}

// Event batch for processing
export interface EventBatch {
  id: string;
  workspaceId: string;
  events: RealtimeEvent[];
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Batch processor configuration
export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTimeMs: number;
  flushOnSize: boolean;
  flushOnTime: boolean;
}

// Default batch configuration
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 100,
  maxWaitTimeMs: 5000, // 5 seconds
  flushOnSize: true,
  flushOnTime: true,
};

// Metric recalculation request
export interface MetricRecalculationRequest {
  workspaceId: string;
  metricNames?: string[];
  triggeredBy: 'webhook' | 'manual' | 'scheduled';
  sourceEventId?: string;
  priority: 'high' | 'normal' | 'low';
}

// SSE connection info
export interface SSEConnection {
  id: string;
  workspaceId: string;
  connectedAt: Date;
  lastEventId?: string;
}


