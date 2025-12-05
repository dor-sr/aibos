/**
 * Real-time Event Emitter
 * In-memory pub/sub system for real-time events
 */

import { createLogger, generateId } from '@aibos/core';
import type {
  RealtimeEvent,
  RealtimeEventType,
  EventCallback,
  EventSubscription,
} from './types';

const logger = createLogger('realtime:emitter');

// Type-safe subscriber map
type SubscriberMap = Map<string, { callback: EventCallback; workspaceId?: string }>;

/**
 * Event Emitter for real-time events
 * Supports workspace-scoped and global subscriptions
 */
class RealtimeEventEmitter {
  // Subscribers per event type
  private subscribers: Map<RealtimeEventType | '*', SubscriberMap> = new Map();
  
  // Connection tracking for SSE
  private activeConnections: Map<string, Set<string>> = new Map(); // workspaceId -> Set<connectionId>

  constructor() {
    logger.info('RealtimeEventEmitter initialized');
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe(
    eventType: RealtimeEventType | '*',
    callback: EventCallback,
    workspaceId?: string
  ): EventSubscription {
    const subscriptionId = generateId();

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }

    const typeSubscribers = this.subscribers.get(eventType)!;
    typeSubscribers.set(subscriptionId, { callback, workspaceId });

    logger.debug('Event subscription created', {
      subscriptionId,
      eventType,
      workspaceId,
    });

    return {
      id: subscriptionId,
      unsubscribe: () => this.unsubscribe(eventType, subscriptionId),
    };
  }

  /**
   * Unsubscribe from events
   */
  private unsubscribe(eventType: RealtimeEventType | '*', subscriptionId: string): void {
    const typeSubscribers = this.subscribers.get(eventType);
    if (typeSubscribers) {
      typeSubscribers.delete(subscriptionId);
      logger.debug('Event subscription removed', { subscriptionId, eventType });
    }
  }

  /**
   * Emit an event to all relevant subscribers
   */
  async emit(event: RealtimeEvent): Promise<void> {
    logger.debug('Emitting event', {
      type: event.type,
      workspaceId: event.workspaceId,
    });

    const notifySubscribers = async (
      subscribers: SubscriberMap | undefined
    ): Promise<void> => {
      if (!subscribers) return;

      const promises: Promise<void>[] = [];

      for (const [id, { callback, workspaceId }] of subscribers) {
        // Check workspace filter
        if (workspaceId && workspaceId !== event.workspaceId) {
          continue;
        }

        promises.push(
          Promise.resolve()
            .then(() => callback(event))
            .catch((err) => {
              logger.error('Subscriber callback error', err as Error, {
                subscriptionId: id,
                eventType: event.type,
              });
            })
        );
      }

      await Promise.all(promises);
    };

    // Notify type-specific subscribers
    await notifySubscribers(this.subscribers.get(event.type));

    // Notify wildcard subscribers
    await notifySubscribers(this.subscribers.get('*'));
  }

  /**
   * Register an SSE connection
   */
  registerConnection(connectionId: string, workspaceId: string): void {
    if (!this.activeConnections.has(workspaceId)) {
      this.activeConnections.set(workspaceId, new Set());
    }
    this.activeConnections.get(workspaceId)!.add(connectionId);
    
    logger.debug('SSE connection registered', { connectionId, workspaceId });
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string, workspaceId: string): void {
    const connections = this.activeConnections.get(workspaceId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.activeConnections.delete(workspaceId);
      }
    }
    logger.debug('SSE connection removed', { connectionId, workspaceId });
  }

  /**
   * Get active connection count for a workspace
   */
  getConnectionCount(workspaceId: string): number {
    return this.activeConnections.get(workspaceId)?.size || 0;
  }

  /**
   * Get total active connection count
   */
  getTotalConnectionCount(): number {
    let total = 0;
    for (const connections of this.activeConnections.values()) {
      total += connections.size;
    }
    return total;
  }

  /**
   * Get subscriber count for debugging
   */
  getSubscriberCount(eventType?: RealtimeEventType | '*'): number {
    if (eventType) {
      return this.subscribers.get(eventType)?.size || 0;
    }
    let total = 0;
    for (const subscribers of this.subscribers.values()) {
      total += subscribers.size;
    }
    return total;
  }
}

// Export singleton instance
export const realtimeEmitter = new RealtimeEventEmitter();

// Export helper functions
export function emitRealtimeEvent(event: Omit<RealtimeEvent, 'id' | 'timestamp'>): void {
  const fullEvent: RealtimeEvent = {
    ...event,
    id: generateId(),
    timestamp: new Date(),
  };
  
  // Fire and forget - don't block the caller
  realtimeEmitter.emit(fullEvent).catch((err) => {
    logger.error('Failed to emit event', err as Error, { type: event.type });
  });
}

export function subscribeToEvents(
  eventType: RealtimeEventType | '*',
  callback: EventCallback,
  workspaceId?: string
): EventSubscription {
  return realtimeEmitter.subscribe(eventType, callback, workspaceId);
}



