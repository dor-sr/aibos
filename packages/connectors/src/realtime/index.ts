/**
 * Real-time Data Pipeline
 * Exports for event streaming, metric updates, and anomaly detection
 */

// Types
export type {
  RealtimeEventType,
  RealtimeEvent,
  MetricUpdateData,
  AnomalyEventData,
  EventCallback,
  EventSubscription,
  EventBatch,
  BatchConfig,
  MetricRecalculationRequest,
  SSEConnection,
} from './types';

export { DEFAULT_BATCH_CONFIG } from './types';

// Event Emitter
export {
  realtimeEmitter,
  emitRealtimeEvent,
  subscribeToEvents,
} from './event-emitter';

// Event Batch Processor
export { EventBatchProcessor } from './event-batch-processor';

// Metric Service
export {
  metricService,
  triggerMetricRecalculation,
} from './metric-service';

// Anomaly Detector
export { realtimeAnomalyDetector } from './anomaly-detector';
