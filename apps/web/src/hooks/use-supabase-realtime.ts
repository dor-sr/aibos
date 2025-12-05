'use client';

/**
 * React hook for Supabase Realtime subscriptions
 * 
 * Provides real-time subscriptions to database changes using Supabase Realtime.
 * Use this for live dashboard updates, presence tracking, and collaborative features.
 * 
 * Usage:
 * const { subscribe, unsubscribe, presence, channel } = useSupabaseRealtime({
 *   workspaceId: 'workspace-123',
 *   onInsert: (payload) => console.log('New record:', payload),
 *   onUpdate: (payload) => console.log('Updated record:', payload),
 *   onDelete: (payload) => console.log('Deleted record:', payload),
 * });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Supported table names for realtime subscriptions
type RealtimeTable =
  | 'ecommerce_orders'
  | 'ecommerce_customers'
  | 'ecommerce_products'
  | 'saas_subscriptions'
  | 'saas_invoices'
  | 'saas_customers'
  | 'anomalies'
  | 'reports'
  | 'insights'
  | 'notification_logs';

// Subscription configuration
interface SubscriptionConfig {
  table: RealtimeTable;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string; // e.g., 'workspace_id=eq.123'
}

// Presence state for collaborative features
interface PresenceState {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  page?: string;
  lastSeen: string;
}

// Hook options
interface UseSupabaseRealtimeOptions {
  workspaceId?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onPresenceSync?: (state: Record<string, PresenceState[]>) => void;
  onPresenceJoin?: (key: string, state: PresenceState) => void;
  onPresenceLeave?: (key: string, state: PresenceState) => void;
  enablePresence?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  currentPage?: string;
}

// Hook return type
interface UseSupabaseRealtimeReturn {
  subscribe: (config: SubscriptionConfig) => void;
  unsubscribe: (table: RealtimeTable) => void;
  unsubscribeAll: () => void;
  isConnected: boolean;
  error: string | null;
  presence: Record<string, PresenceState[]>;
  trackPresence: (page: string) => void;
  activeSubscriptions: RealtimeTable[];
}

export function useSupabaseRealtime(
  options: UseSupabaseRealtimeOptions = {}
): UseSupabaseRealtimeReturn {
  const {
    workspaceId,
    onInsert,
    onUpdate,
    onDelete,
    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    enablePresence = false,
    userId,
    userName,
    userEmail,
    currentPage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceState[]>>({});
  const [activeSubscriptions, setActiveSubscriptions] = useState<RealtimeTable[]>([]);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionsRef = useRef<Map<RealtimeTable, RealtimeChannel>>(new Map());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  // Initialize the main channel for the workspace
  useEffect(() => {
    if (!workspaceId) return;

    const supabase = supabaseRef.current;
    const channelName = `workspace:${workspaceId}`;

    // Create workspace channel
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        if (enablePresence) {
          const state = channel.presenceState<PresenceState>();
          const presenceMap: Record<string, PresenceState[]> = {};
          
          Object.entries(state).forEach(([key, value]) => {
            presenceMap[key] = value as PresenceState[];
          });
          
          setPresence(presenceMap);
          onPresenceSync?.(presenceMap);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (enablePresence && newPresences.length > 0) {
          onPresenceJoin?.(key, newPresences[0] as unknown as PresenceState);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (enablePresence && leftPresences.length > 0) {
          onPresenceLeave?.(key, leftPresences[0] as unknown as PresenceState);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);

          // Track presence if enabled
          if (enablePresence && userId) {
            const presenceState: PresenceState = {
              id: crypto.randomUUID(),
              userId,
              userName,
              userEmail,
              page: currentPage,
              lastSeen: new Date().toISOString(),
            };
            await channel.track(presenceState);
          }
        } else if (status === 'CHANNEL_ERROR') {
          setError('Failed to connect to realtime channel');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
    presenceChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      presenceChannelRef.current = null;
    };
  }, [workspaceId, enablePresence, userId, userName, userEmail, currentPage, onPresenceSync, onPresenceJoin, onPresenceLeave]);

  // Subscribe to a table
  const subscribe = useCallback(
    (config: SubscriptionConfig) => {
      if (!workspaceId) {
        setError('Workspace ID is required for subscriptions');
        return;
      }

      const { table, event = '*', filter } = config;
      const supabase = supabaseRef.current;

      // Check if already subscribed
      if (subscriptionsRef.current.has(table)) {
        return;
      }

      // Build the filter
      const tableFilter = filter || `workspace_id=eq.${workspaceId}`;
      const channelName = `table:${table}:${workspaceId}`;

      // Create table-specific channel with type assertion for Supabase Realtime API
      const channel = supabase.channel(channelName);
      
      // Subscribe to postgres changes
      (channel as any).on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter: tableFilter,
        },
        (payload: any) => {
          // Route to appropriate callback
          if (payload.eventType === 'INSERT') {
            onInsert?.(payload);
          } else if (payload.eventType === 'UPDATE') {
            onUpdate?.(payload);
          } else if (payload.eventType === 'DELETE') {
            onDelete?.(payload);
          }
        }
      ).subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setActiveSubscriptions((prev) => [...prev, table]);
        } else if (status === 'CHANNEL_ERROR') {
          setError(`Failed to subscribe to ${table}`);
        }
      });

      subscriptionsRef.current.set(table, channel);
    },
    [workspaceId, onInsert, onUpdate, onDelete]
  );

  // Unsubscribe from a table
  const unsubscribe = useCallback((table: RealtimeTable) => {
    const channel = subscriptionsRef.current.get(table);
    if (channel) {
      channel.unsubscribe();
      subscriptionsRef.current.delete(table);
      setActiveSubscriptions((prev) => prev.filter((t) => t !== table));
    }
  }, []);

  // Unsubscribe from all tables
  const unsubscribeAll = useCallback(() => {
    subscriptionsRef.current.forEach((channel) => {
      channel.unsubscribe();
    });
    subscriptionsRef.current.clear();
    setActiveSubscriptions([]);
  }, []);

  // Track presence on a specific page
  const trackPresence = useCallback(
    async (page: string) => {
      if (!enablePresence || !userId || !presenceChannelRef.current) return;

      const presenceState: PresenceState = {
        id: crypto.randomUUID(),
        userId,
        userName,
        userEmail,
        page,
        lastSeen: new Date().toISOString(),
      };

      await presenceChannelRef.current.track(presenceState);
    },
    [enablePresence, userId, userName, userEmail]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    isConnected,
    error,
    presence,
    trackPresence,
    activeSubscriptions,
  };
}

// Export types for consumers
export type {
  RealtimeTable,
  SubscriptionConfig,
  PresenceState,
  UseSupabaseRealtimeOptions,
  UseSupabaseRealtimeReturn,
};

// ===== HELPER HOOKS =====

/**
 * Hook for real-time order updates
 */
export function useRealtimeOrders(
  workspaceId: string,
  callbacks?: {
    onNewOrder?: (order: Record<string, unknown>) => void;
    onOrderUpdate?: (order: Record<string, unknown>) => void;
  }
) {
  const { subscribe, unsubscribe, isConnected, error } = useSupabaseRealtime({
    workspaceId,
    onInsert: (payload) => {
      callbacks?.onNewOrder?.(payload.new);
    },
    onUpdate: (payload) => {
      callbacks?.onOrderUpdate?.(payload.new);
    },
  });

  useEffect(() => {
    subscribe({ table: 'ecommerce_orders', event: '*' });
    return () => unsubscribe('ecommerce_orders');
  }, [subscribe, unsubscribe]);

  return { isConnected, error };
}

/**
 * Hook for real-time anomaly updates
 */
export function useRealtimeAnomalies(
  workspaceId: string,
  callbacks?: {
    onNewAnomaly?: (anomaly: Record<string, unknown>) => void;
    onAnomalyResolved?: (anomaly: Record<string, unknown>) => void;
  }
) {
  const { subscribe, unsubscribe, isConnected, error } = useSupabaseRealtime({
    workspaceId,
    onInsert: (payload) => {
      callbacks?.onNewAnomaly?.(payload.new);
    },
    onUpdate: (payload) => {
      if (payload.new && (payload.new as Record<string, unknown>).status === 'resolved') {
        callbacks?.onAnomalyResolved?.(payload.new);
      }
    },
  });

  useEffect(() => {
    subscribe({ table: 'anomalies', event: '*' });
    return () => unsubscribe('anomalies');
  }, [subscribe, unsubscribe]);

  return { isConnected, error };
}

/**
 * Hook for real-time insight updates
 */
export function useRealtimeInsights(
  workspaceId: string,
  callbacks?: {
    onNewInsight?: (insight: Record<string, unknown>) => void;
  }
) {
  const { subscribe, unsubscribe, isConnected, error } = useSupabaseRealtime({
    workspaceId,
    onInsert: (payload) => {
      callbacks?.onNewInsight?.(payload.new);
    },
  });

  useEffect(() => {
    subscribe({ table: 'insights', event: 'INSERT' });
    return () => unsubscribe('insights');
  }, [subscribe, unsubscribe]);

  return { isConnected, error };
}

/**
 * Hook for presence tracking (who's online)
 */
export function usePresence(
  workspaceId: string,
  user: {
    id: string;
    name?: string;
    email?: string;
  },
  currentPage?: string
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);

  const { isConnected, presence, trackPresence } = useSupabaseRealtime({
    workspaceId,
    enablePresence: true,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    currentPage,
    onPresenceSync: (state) => {
      const users: PresenceState[] = [];
      Object.values(state).forEach((presences) => {
        users.push(...presences);
      });
      setOnlineUsers(users);
    },
  });

  // Update presence when page changes
  useEffect(() => {
    if (currentPage) {
      trackPresence(currentPage);
    }
  }, [currentPage, trackPresence]);

  return {
    isConnected,
    onlineUsers,
    currentUserCount: onlineUsers.length,
    presence,
  };
}
