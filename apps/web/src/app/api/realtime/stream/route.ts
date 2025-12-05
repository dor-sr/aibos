/**
 * Server-Sent Events (SSE) endpoint for real-time dashboard updates
 * 
 * This endpoint streams real-time metric updates and anomaly alerts
 * to connected dashboard clients.
 * 
 * Usage:
 * - Connect from the dashboard: new EventSource('/api/realtime/stream')
 * - Events: 'metrics.updated', 'anomaly.detected'
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  db,
  workspaces,
  workspaceMemberships,
} from '@aibos/data-model';
import { eq } from 'drizzle-orm';
import { generateId } from '@aibos/core';
import {
  realtimeEmitter,
  subscribeToEvents,
  type RealtimeEvent,
} from '@aibos/connectors';

// Track active SSE connections for monitoring
const activeConnections = new Map<string, {
  workspaceId: string;
  connectedAt: Date;
}>();

export async function GET(request: NextRequest) {
  // Authenticate the request
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get workspace ID for the user
  const membership = await db
    .select({ workspace: workspaces })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .where(eq(workspaceMemberships.userId, user.id))
    .limit(1);

  const membershipData = membership[0];
  if (!membershipData) {
    return new Response('No workspace found', { status: 404 });
  }

  const workspaceId = membershipData.workspace.id;
  const connectionId = generateId();

  // Create SSE response stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = formatSSEMessage('connected', {
        connectionId,
        workspaceId,
        connectedAt: new Date().toISOString(),
      });
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Track this connection
      activeConnections.set(connectionId, {
        workspaceId,
        connectedAt: new Date(),
      });

      // Register with the event emitter
      realtimeEmitter.registerConnection(connectionId, workspaceId);

      // Subscribe to events for this workspace
      const subscription = subscribeToEvents('*', (event: RealtimeEvent) => {
        // Only send events for this workspace
        if (event.workspaceId !== workspaceId) return;

        try {
          const sseMessage = formatSSEMessage(event.type, {
            id: event.id,
            type: event.type,
            data: event.data,
            timestamp: event.timestamp.toISOString(),
          });
          controller.enqueue(new TextEncoder().encode(sseMessage));
        } catch {
          // Connection might be closed
        }
      }, workspaceId);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatSSEMessage('heartbeat', {
            timestamp: new Date().toISOString(),
            activeConnections: activeConnections.size,
          });
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        clearInterval(heartbeatInterval);
        activeConnections.delete(connectionId);
        realtimeEmitter.removeConnection(connectionId, workspaceId);
        controller.close();
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Format a Server-Sent Events message
 */
function formatSSEMessage(event: string, data: Record<string, unknown>): string {
  const eventLine = `event: ${event}\n`;
  const dataLine = `data: ${JSON.stringify(data)}\n\n`;
  return eventLine + dataLine;
}

/**
 * GET /api/realtime/stream/status - Get SSE connection status (for debugging)
 */
export async function POST(request: NextRequest) {
  // This endpoint is for debugging - returns active connection info
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const connectionInfo = Array.from(activeConnections.entries()).map(([id, info]) => ({
    connectionId: id,
    ...info,
    connectedAt: info.connectedAt.toISOString(),
  }));

  return Response.json({
    totalConnections: activeConnections.size,
    connections: connectionInfo,
    emitterStats: {
      totalConnections: realtimeEmitter.getTotalConnectionCount(),
      subscriberCount: realtimeEmitter.getSubscriberCount(),
    },
  });
}



