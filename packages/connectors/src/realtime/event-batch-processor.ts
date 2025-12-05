/**
 * Event Batch Processor
 * Batches incoming events for efficient processing
 */

import { createLogger, generateId } from '@aibos/core';
import type {
  RealtimeEvent,
  EventBatch,
  BatchConfig,
} from './types';
import { DEFAULT_BATCH_CONFIG } from './types';

const logger = createLogger('realtime:batch');

// Batch processor callback
type BatchProcessorCallback = (batch: EventBatch) => Promise<void>;

/**
 * Event Batch Processor
 * Collects events and processes them in batches for efficiency
 */
export class EventBatchProcessor {
  private config: BatchConfig;
  private batches: Map<string, EventBatch> = new Map(); // workspaceId -> batch
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private processor: BatchProcessorCallback;
  private isShuttingDown = false;

  constructor(processor: BatchProcessorCallback, config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.processor = processor;
    logger.info('EventBatchProcessor initialized', { config: this.config });
  }

  /**
   * Add an event to the batch for its workspace
   */
  async addEvent(event: RealtimeEvent): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Batch processor shutting down, dropping event', { eventId: event.id });
      return;
    }

    const workspaceId = event.workspaceId;

    // Get or create batch for this workspace
    let batch = this.batches.get(workspaceId);
    if (!batch) {
      batch = this.createBatch(workspaceId);
      this.batches.set(workspaceId, batch);

      // Start timer for time-based flushing
      if (this.config.flushOnTime) {
        this.startTimer(workspaceId);
      }
    }

    // Add event to batch
    batch.events.push(event);

    logger.debug('Event added to batch', {
      workspaceId,
      batchId: batch.id,
      eventCount: batch.events.length,
    });

    // Check if we should flush based on size
    if (this.config.flushOnSize && batch.events.length >= this.config.maxBatchSize) {
      await this.flushBatch(workspaceId);
    }
  }

  /**
   * Create a new batch
   */
  private createBatch(workspaceId: string): EventBatch {
    return {
      id: generateId(),
      workspaceId,
      events: [],
      createdAt: new Date(),
      status: 'pending',
    };
  }

  /**
   * Start a timer for time-based flushing
   */
  private startTimer(workspaceId: string): void {
    // Clear any existing timer
    this.clearTimer(workspaceId);

    const timer = setTimeout(async () => {
      await this.flushBatch(workspaceId);
    }, this.config.maxWaitTimeMs);

    this.timers.set(workspaceId, timer);
  }

  /**
   * Clear timer for a workspace
   */
  private clearTimer(workspaceId: string): void {
    const timer = this.timers.get(workspaceId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(workspaceId);
    }
  }

  /**
   * Flush batch for a workspace
   */
  async flushBatch(workspaceId: string): Promise<void> {
    const batch = this.batches.get(workspaceId);
    if (!batch || batch.events.length === 0) {
      return;
    }

    // Clear timer
    this.clearTimer(workspaceId);

    // Remove batch from pending
    this.batches.delete(workspaceId);

    // Update batch status
    batch.status = 'processing';

    logger.info('Flushing batch', {
      workspaceId,
      batchId: batch.id,
      eventCount: batch.events.length,
    });

    try {
      await this.processor(batch);
      batch.status = 'completed';
      batch.processedAt = new Date();
      
      logger.info('Batch processed successfully', {
        batchId: batch.id,
        eventCount: batch.events.length,
        processingTimeMs: batch.processedAt.getTime() - batch.createdAt.getTime(),
      });
    } catch (err) {
      batch.status = 'failed';
      logger.error('Batch processing failed', err as Error, {
        batchId: batch.id,
        eventCount: batch.events.length,
      });
      throw err;
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAll(): Promise<void> {
    const workspaceIds = Array.from(this.batches.keys());
    
    logger.info('Flushing all batches', { count: workspaceIds.length });

    await Promise.all(
      workspaceIds.map((workspaceId) => this.flushBatch(workspaceId))
    );
  }

  /**
   * Shutdown the processor gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    logger.info('Shutting down batch processor');

    // Clear all timers
    for (const workspaceId of this.timers.keys()) {
      this.clearTimer(workspaceId);
    }

    // Flush all pending batches
    await this.flushAll();

    logger.info('Batch processor shutdown complete');
  }

  /**
   * Get pending batch count
   */
  getPendingBatchCount(): number {
    return this.batches.size;
  }

  /**
   * Get pending event count for a workspace
   */
  getPendingEventCount(workspaceId: string): number {
    return this.batches.get(workspaceId)?.events.length || 0;
  }

  /**
   * Get total pending event count
   */
  getTotalPendingEventCount(): number {
    let total = 0;
    for (const batch of this.batches.values()) {
      total += batch.events.length;
    }
    return total;
  }
}



