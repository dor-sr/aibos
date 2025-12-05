'use client';

/**
 * React hook for real-time dashboard updates via Server-Sent Events
 * 
 * Usage:
 * const { metrics, anomalies, isConnected, error } = useRealtime();
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Event types from the SSE stream
interface RealtimeMetricUpdate {
  metricName: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  period: string;
  currency?: string;
}

interface RealtimeAnomaly {
  anomalyId: string;
  metricName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
}

interface SSEEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseRealtimeOptions {
  onMetricUpdate?: (metric: RealtimeMetricUpdate) => void;
  onAnomalyDetected?: (anomaly: RealtimeAnomaly) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  connectionId: string | null;
  metrics: Map<string, RealtimeMetricUpdate>;
  anomalies: RealtimeAnomaly[];
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

const DEFAULT_RECONNECT_DELAY_MS = 5000;
const MAX_ANOMALIES = 10; // Keep only recent anomalies

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const {
    onMetricUpdate,
    onAnomalyDetected,
    onConnected,
    onDisconnected,
    autoReconnect = true,
    reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Map<string, RealtimeMetricUpdate>>(new Map());
  const [anomalies, setAnomalies] = useState<RealtimeAnomaly[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Don't reconnect if manually disconnected
    if (isManualDisconnect.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const eventSource = new EventSource('/api/realtime/stream');
      eventSourceRef.current = eventSource;

      // Handle connection opened
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      // Handle connection event
      eventSource.addEventListener('connected', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setConnectionId(data.connectionId);
          setIsConnected(true);
          setError(null);
          onConnected?.();
        } catch (err) {
          console.error('Error parsing connected event:', err);
        }
      });

      // Handle metrics update
      eventSource.addEventListener('metrics.updated', (event: MessageEvent) => {
        try {
          const eventData: SSEEvent = JSON.parse(event.data);
          const metricUpdate = eventData.data as unknown as RealtimeMetricUpdate;

          setMetrics((prev) => {
            const newMetrics = new Map(prev);
            newMetrics.set(metricUpdate.metricName, metricUpdate);
            return newMetrics;
          });

          onMetricUpdate?.(metricUpdate);
        } catch (err) {
          console.error('Error parsing metrics update:', err);
        }
      });

      // Handle anomaly detected
      eventSource.addEventListener('anomaly.detected', (event: MessageEvent) => {
        try {
          const eventData: SSEEvent = JSON.parse(event.data);
          const anomaly = eventData.data as unknown as RealtimeAnomaly;

          setAnomalies((prev) => {
            const newAnomalies = [anomaly, ...prev].slice(0, MAX_ANOMALIES);
            return newAnomalies;
          });

          onAnomalyDetected?.(anomaly);
        } catch (err) {
          console.error('Error parsing anomaly event:', err);
        }
      });

      // Handle heartbeat (keep-alive)
      eventSource.addEventListener('heartbeat', () => {
        // Heartbeat received, connection is healthy
      });

      // Handle errors
      eventSource.onerror = () => {
        setIsConnected(false);
        setConnectionId(null);
        onDisconnected?.();

        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        // Auto reconnect if enabled
        if (autoReconnect && !isManualDisconnect.current) {
          setError('Connection lost. Reconnecting...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelayMs);
        } else {
          setError('Connection lost');
        }
      };
    } catch (err) {
      setError('Failed to connect to real-time stream');
      console.error('SSE connection error:', err);
    }
  }, [autoReconnect, reconnectDelayMs, onConnected, onDisconnected, onMetricUpdate, onAnomalyDetected]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionId(null);
    onDisconnected?.();
  }, [onDisconnected]);

  // Reconnect (reset manual disconnect flag)
  const reconnect = useCallback(() => {
    isManualDisconnect.current = false;
    connect();
  }, [connect]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    connectionId,
    metrics,
    anomalies,
    error,
    reconnect,
    disconnect,
  };
}

// Export types for consumers
export type { RealtimeMetricUpdate, RealtimeAnomaly, UseRealtimeOptions, UseRealtimeReturn };



