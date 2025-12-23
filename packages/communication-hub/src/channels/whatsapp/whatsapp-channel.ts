/**
 * WhatsApp Business Channel
 * 
 * WhatsApp Business API communication channel for AI employees.
 */

import { createLogger } from '@aibos/core';
import type {
  ChannelProvider,
  UnifiedMessage,
  SendMessageInput,
  WhatsAppChannelConfig,
} from '../../types';

const logger = createLogger('communication:whatsapp');

interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'interactive';
  text?: { body: string; preview_url?: boolean };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>;
  };
  interactive?: {
    type: 'button' | 'list';
    body: { text: string };
    action: {
      buttons?: Array<{ type: string; reply: { id: string; title: string } }>;
      sections?: Array<{ title: string; rows: Array<{ id: string; title: string }> }>;
    };
  };
}

interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: 'text' | 'image' | 'document' | 'interactive';
          text?: { body: string };
          interactive?: { type: string; button_reply?: { id: string; title: string } };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * WhatsApp Channel Provider
 */
export class WhatsAppChannel implements ChannelProvider {
  readonly channel = 'whatsapp' as const;
  private config: WhatsAppChannelConfig | null = null;
  private initialized = false;
  private apiUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Initialize the WhatsApp channel
   */
  async initialize(config: WhatsAppChannelConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    
    logger.info('WhatsApp channel initialized', {
      phoneNumberId: config.phoneNumberId,
    });
  }

  /**
   * Send a WhatsApp message
   */
  async send(input: SendMessageInput): Promise<UnifiedMessage> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp channel not configured');
    }

    const id = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Get recipient phone number
    const phone = input.metadata?.whatsapp?.phone;
    if (!phone) {
      throw new Error('No WhatsApp phone number specified');
    }

    // Build WhatsApp message
    let waMessage: WhatsAppMessage;

    // Check if using a template (required for starting new conversations)
    if (input.metadata?.whatsapp?.templateId) {
      waMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: input.metadata.whatsapp.templateId,
          language: { code: 'en' },
          components: input.metadata.whatsapp.templateParams
            ? [
                {
                  type: 'body',
                  parameters: Object.entries(input.metadata.whatsapp.templateParams).map(
                    ([_, value]) => ({ type: 'text', text: value })
                  ),
                },
              ]
            : undefined,
        },
      };
    } else {
      // Regular text message (only works within 24-hour window)
      waMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: {
          body: input.content,
          preview_url: true,
        },
      };
    }

    try {
      const result = await this.sendMessage(waMessage);

      const message: UnifiedMessage = {
        id,
        workspaceId: input.workspaceId,
        employeeId: input.employeeId,
        contactId: input.contactId,
        channel: 'whatsapp',
        direction: 'outbound',
        status: 'sent',
        priority: input.priority || 'normal',
        content: input.content,
        threadId: input.threadId,
        externalId: result.messageId,
        metadata: {
          whatsapp: {
            phone,
            status: 'sent',
            timestamp: now.toISOString(),
          },
        },
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      };

      logger.info('WhatsApp message sent', {
        id,
        to: phone,
      });

      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send WhatsApp message', new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Receive WhatsApp webhook
   */
  async receive(webhookPayload: WhatsAppWebhookPayload): Promise<UnifiedMessage | null> {
    // Validate payload structure
    if (webhookPayload.object !== 'whatsapp_business_account') {
      return null;
    }

    const entry = webhookPayload.entry[0];
    if (!entry) return null;

    const change = entry.changes[0];
    if (!change || change.field !== 'messages') return null;

    const value = change.value;

    // Handle message status updates
    if (value.statuses && value.statuses.length > 0) {
      const statusUpdate = value.statuses[0];
      if (statusUpdate) {
        logger.debug('WhatsApp status update', {
          messageId: statusUpdate.id,
          status: statusUpdate.status,
        });
      }
      // Could update message status in inbox here
      return null;
    }

    // Handle incoming messages
    if (!value.messages || value.messages.length === 0) {
      return null;
    }

    const incomingMessage = value.messages[0];
    if (!incomingMessage) {
      return null;
    }
    
    const contact = value.contacts?.[0];

    const id = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    let content = '';
    if (incomingMessage.type === 'text' && incomingMessage.text) {
      content = incomingMessage.text.body;
    } else if (incomingMessage.type === 'interactive' && incomingMessage.interactive) {
      content = incomingMessage.interactive.button_reply?.title || '';
    }

    const message: UnifiedMessage = {
      id,
      workspaceId: '', // Will be resolved by inbox
      channel: 'whatsapp',
      direction: 'inbound',
      status: 'delivered',
      priority: 'normal',
      content,
      externalId: incomingMessage.id,
      metadata: {
        whatsapp: {
          phone: incomingMessage.from,
          timestamp: incomingMessage.timestamp,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    logger.info('WhatsApp message received', {
      id,
      from: incomingMessage.from,
      contactName: contact?.profile?.name,
    });

    return message;
  }

  /**
   * Validate webhook (verify token for subscription)
   */
  validateWebhook(payload: unknown, signature: string): boolean {
    // WhatsApp uses hub.verify_token for initial webhook verification
    // and X-Hub-Signature-256 for payload verification
    
    if (!this.config?.webhookVerifyToken) {
      return false;
    }

    // For GET verification requests
    if (typeof payload === 'object' && payload !== null) {
      const params = payload as Record<string, string>;
      if (params['hub.verify_token'] === this.config.webhookVerifyToken) {
        return true;
      }
    }

    // TODO: Implement HMAC signature validation for POST requests
    logger.debug('Validating WhatsApp webhook signature');
    return true;
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return this.initialized && this.config !== null;
  }

  /**
   * Send message via WhatsApp API
   */
  private async sendMessage(message: WhatsAppMessage): Promise<{ messageId: string }> {
    const url = `${this.apiUrl}/${this.config!.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return { messageId: data.messages[0].id };
  }

  /**
   * Send interactive message with buttons
   */
  async sendWithButtons(
    phone: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ messageId: string }> {
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    };

    return this.sendMessage(message);
  }

  /**
   * Send template message
   */
  async sendTemplate(
    phone: string,
    templateName: string,
    languageCode: string,
    parameters: string[]
  ): Promise<{ messageId: string }> {
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: parameters.length > 0
          ? [
              {
                type: 'body',
                parameters: parameters.map(text => ({ type: 'text', text })),
              },
            ]
          : undefined,
      },
    };

    return this.sendMessage(message);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const url = `${this.apiUrl}/${this.config!.phoneNumberId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  }
}

/**
 * Create a WhatsApp channel instance
 */
export function createWhatsAppChannel(): WhatsAppChannel {
  return new WhatsAppChannel();
}

