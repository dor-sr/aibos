/**
 * Chat Widget Channel
 * 
 * Embeddable chat widget for AI employees.
 */

import { createLogger } from '@aibos/core';
import type {
  ChannelProvider,
  UnifiedMessage,
  SendMessageInput,
  Conversation,
  WidgetChannelConfig,
} from '../../types';

const logger = createLogger('communication:widget');

// Message types for WebSocket communication
export interface WidgetClientMessage {
  type: 'message' | 'typing' | 'read' | 'file_upload' | 'close';
  sessionId: string;
  content?: string;
  fileData?: {
    name: string;
    mimeType: string;
    data: string; // base64
  };
  messageId?: string;
}

export interface WidgetServerMessage {
  type: 'message' | 'typing' | 'read' | 'connected' | 'error';
  messageId?: string;
  content?: string;
  employeeName?: string;
  employeeAvatar?: string;
  timestamp: string;
  error?: string;
}

export interface WidgetSession {
  id: string;
  workspaceId: string;
  visitorId?: string;
  visitorName?: string;
  visitorEmail?: string;
  pageUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  status: 'active' | 'closed';
  assignedEmployeeId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Widget Channel Provider
 */
export class WidgetChannel implements ChannelProvider {
  readonly channel = 'widget' as const;
  private config: WidgetChannelConfig | null = null;
  private initialized = false;
  private sessions: Map<string, WidgetSession> = new Map();
  private messageHandlers: Map<string, (message: WidgetClientMessage) => void> = new Map();

  /**
   * Initialize the widget channel
   */
  async initialize(config: WidgetChannelConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    
    logger.info('Widget channel initialized', {
      allowedOrigins: config.allowedOrigins,
    });
  }

  /**
   * Send a message through the widget
   */
  async send(input: SendMessageInput): Promise<UnifiedMessage> {
    if (!this.isConfigured()) {
      throw new Error('Widget channel not configured');
    }

    const id = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sessionId = input.metadata?.widget?.sessionId;
    if (!sessionId) {
      throw new Error('No widget session specified');
    }

    // Get session
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Widget session not found: ${sessionId}`);
    }

    const message: UnifiedMessage = {
      id,
      workspaceId: input.workspaceId,
      employeeId: input.employeeId,
      contactId: input.contactId,
      channel: 'widget',
      direction: 'outbound',
      status: 'sent',
      priority: input.priority || 'normal',
      content: input.content,
      htmlContent: input.htmlContent,
      threadId: sessionId,
      metadata: {
        widget: {
          sessionId,
          visitorId: session.visitorId,
        },
      },
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // The actual sending is done via WebSocket in the API layer
    // This just creates the message record

    logger.info('Widget message prepared', {
      id,
      sessionId,
    });

    return message;
  }

  /**
   * Receive message from widget (via WebSocket)
   */
  async receive(clientMessage: WidgetClientMessage): Promise<UnifiedMessage | null> {
    if (clientMessage.type !== 'message') {
      // Handle typing indicators, read receipts, etc.
      logger.debug('Widget event received', { type: clientMessage.type });
      return null;
    }

    const id = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Get or create session
    let session = this.sessions.get(clientMessage.sessionId);
    if (!session) {
      session = this.createSession(clientMessage.sessionId);
    }

    // Update session activity
    session.lastActivityAt = now;

    const message: UnifiedMessage = {
      id,
      workspaceId: '', // Will be resolved by inbox
      channel: 'widget',
      direction: 'inbound',
      status: 'delivered',
      priority: 'normal',
      content: clientMessage.content || '',
      threadId: clientMessage.sessionId,
      attachments: clientMessage.fileData
        ? [
            {
              id: `file_${Date.now()}`,
              name: clientMessage.fileData.name,
              url: '', // Will be uploaded and URL added
              mimeType: clientMessage.fileData.mimeType,
              size: 0,
            },
          ]
        : undefined,
      metadata: {
        widget: {
          sessionId: clientMessage.sessionId,
          visitorId: session.visitorId,
          pageUrl: session.pageUrl,
          userAgent: session.userAgent,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    logger.info('Widget message received', {
      id,
      sessionId: clientMessage.sessionId,
    });

    return message;
  }

  /**
   * Validate widget request (check origin)
   */
  validateWebhook(_payload: unknown, origin: string): boolean {
    if (!this.config?.allowedOrigins) {
      return false;
    }

    // Check if origin is allowed
    return this.config.allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      return origin === allowed || origin.endsWith(allowed);
    });
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return this.initialized && this.config !== null && this.config.enabled;
  }

  /**
   * Create a new session
   */
  createSession(
    sessionId: string,
    metadata?: {
      visitorId?: string;
      visitorName?: string;
      visitorEmail?: string;
      pageUrl?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): WidgetSession {
    const now = new Date();
    const session: WidgetSession = {
      id: sessionId,
      workspaceId: '', // Will be set when assigned
      visitorId: metadata?.visitorId,
      visitorName: metadata?.visitorName,
      visitorEmail: metadata?.visitorEmail,
      pageUrl: metadata?.pageUrl,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      status: 'active',
      createdAt: now,
      lastActivityAt: now,
    };

    this.sessions.set(sessionId, session);
    logger.info('Widget session created', { sessionId });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): WidgetSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      logger.info('Widget session closed', { sessionId });
    }
  }

  /**
   * Assign employee to session
   */
  assignEmployee(sessionId: string, employeeId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.assignedEmployeeId = employeeId;
      logger.info('Employee assigned to widget session', { sessionId, employeeId });
    }
  }

  /**
   * Register message handler for a session
   */
  onMessage(sessionId: string, handler: (message: WidgetClientMessage) => void): void {
    this.messageHandlers.set(sessionId, handler);
  }

  /**
   * Remove message handler for a session
   */
  offMessage(sessionId: string): void {
    this.messageHandlers.delete(sessionId);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): WidgetSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Clean up old sessions
   */
  cleanupSessions(maxAgeMinutes: number = 30): number {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.lastActivityAt < cutoff) {
        this.sessions.delete(id);
        this.messageHandlers.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up widget sessions', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Get widget configuration for embed
   */
  getEmbedConfig(): {
    brandColor: string;
    welcomeMessage: string;
    offlineMessage: string;
  } {
    return {
      brandColor: this.config?.brandColor || '#6366f1',
      welcomeMessage: this.config?.welcomeMessage || "Hi! How can I help you today?",
      offlineMessage: this.config?.offlineMessage || "We're currently offline. Leave a message and we'll get back to you.",
    };
  }
}

/**
 * Create a widget channel instance
 */
export function createWidgetChannel(): WidgetChannel {
  return new WidgetChannel();
}

/**
 * Widget embed script generator
 */
export function generateEmbedScript(workspaceId: string, options?: {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  greeting?: string;
}): string {
  const position = options?.position || 'bottom-right';
  const color = options?.primaryColor || '#6366f1';
  const greeting = options?.greeting || "Hi! How can I help you?";

  return `
<!-- AI Business OS Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['AIBOSWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id='aibos-widget';js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','aibos','https://widget.aibos.com/widget.js'));
  aibos('init', {
    workspaceId: '${workspaceId}',
    position: '${position}',
    primaryColor: '${color}',
    greeting: '${greeting}'
  });
</script>
`;
}

