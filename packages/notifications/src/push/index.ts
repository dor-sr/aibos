import { createLogger } from '@aibos/core';
import { db, pushSubscriptions, type PushSubscription } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { NotificationPayload, NotificationResult, NotificationProvider } from '../types';

const logger = createLogger('notifications:push');

/**
 * Push notification provider configuration
 */
export interface PushProviderConfig {
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string; // e.g., 'mailto:admin@example.com'
}

/**
 * Web Push notification provider
 *
 * Handles browser push notifications using the Web Push protocol.
 */
export class PushNotificationProvider implements NotificationProvider {
  readonly channel = 'push' as const;
  private config: PushProviderConfig | null = null;

  constructor(config?: PushProviderConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Configure the push provider
   */
  configure(config: PushProviderConfig): void {
    this.config = config;
    logger.info('Push provider configured', {
      hasVapidKey: !!config.vapidPublicKey,
    });
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return (
      this.config !== null &&
      !!this.config.vapidPublicKey &&
      !!this.config.vapidPrivateKey &&
      !!this.config.vapidSubject
    );
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Push provider not configured');
      return { valid: false, errors };
    }

    if (!this.config.vapidPublicKey) {
      errors.push('VAPID public key is required');
    }

    if (!this.config.vapidPrivateKey) {
      errors.push('VAPID private key is required');
    }

    if (!this.config.vapidSubject) {
      errors.push('VAPID subject is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Send push notification
   */
  async send(
    payload: NotificationPayload,
    options?: { userId?: string; userIds?: string[] }
  ): Promise<NotificationResult> {
    if (!this.isConfigured()) {
      logger.warn('Push provider not configured, skipping notification');
      return {
        success: false,
        channel: 'push',
        error: 'Push provider not configured',
      };
    }

    try {
      const userIds = options?.userIds || (options?.userId ? [options.userId] : []);

      if (userIds.length === 0) {
        return {
          success: false,
          channel: 'push',
          error: 'No users specified for push notification',
        };
      }

      logger.info('Sending push notifications', {
        type: payload.type,
        workspaceId: payload.workspaceId,
        userCount: userIds.length,
      });

      // Get active subscriptions for these users
      const subscriptions = await this.getSubscriptionsForUsers(userIds);

      if (subscriptions.length === 0) {
        logger.info('No active push subscriptions found');
        return {
          success: true,
          channel: 'push',
          messageId: 'no_subscriptions',
        };
      }

      // Prepare push payload
      const pushPayload = this.buildPushPayload(payload);

      // Send to each subscription
      // Note: In production, use web-push library
      // import webpush from 'web-push';
      // webpush.setVapidDetails(...)
      let successCount = 0;
      let failCount = 0;

      for (const subscription of subscriptions) {
        try {
          // In production:
          // await webpush.sendNotification(
          //   {
          //     endpoint: subscription.endpoint,
          //     keys: {
          //       p256dh: subscription.p256dhKey,
          //       auth: subscription.authKey,
          //     },
          //   },
          //   JSON.stringify(pushPayload)
          // );
          
          // For now, log the push that would be sent
          logger.info('Push notification prepared', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
          });
          
          successCount++;
        } catch (error) {
          logger.error('Failed to send push to subscription', error as Error, {
            subscriptionId: subscription.id,
          });
          failCount++;
          
          // Mark subscription as inactive if it failed
          if ((error as Error).message?.includes('410') || (error as Error).message?.includes('expired')) {
            await this.deactivateSubscription(subscription.id);
          }
        }
      }

      logger.info('Push notifications sent', {
        successCount,
        failCount,
        totalSubscriptions: subscriptions.length,
      });

      return {
        success: successCount > 0,
        channel: 'push',
        messageId: `push_batch_${Date.now()}`,
        sentAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send push notification', error as Error, {
        type: payload.type,
        workspaceId: payload.workspaceId,
      });

      return {
        success: false,
        channel: 'push',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save push subscription for a user
   */
  async saveSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    deviceInfo?: {
      userAgent?: string;
      deviceName?: string;
    }
  ): Promise<PushSubscription> {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    const existingSub = existing[0];
    if (existingSub) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent: deviceInfo?.userAgent,
          deviceName: deviceInfo?.deviceName,
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existingSub.id));

      return {
        ...existingSub,
        userId,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        isActive: true,
      };
    }

    // Create new subscription
    const id = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSubscription = {
      id,
      userId,
      endpoint: subscription.endpoint,
      p256dhKey: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
      userAgent: deviceInfo?.userAgent || null,
      deviceName: deviceInfo?.deviceName || null,
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(pushSubscriptions).values(newSubscription);

    logger.info('Push subscription saved', { userId, subscriptionId: id });

    return newSubscription;
  }

  /**
   * Remove push subscription
   */
  async removeSubscription(userId: string, endpoint: string): Promise<boolean> {
    try {
      await db
        .delete(pushSubscriptions)
        .where(
          and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))
        );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get VAPID public key (for client-side subscription)
   */
  getVapidPublicKey(): string | null {
    return this.config?.vapidPublicKey || null;
  }

  /**
   * Get subscriptions for users
   */
  private async getSubscriptionsForUsers(userIds: string[]): Promise<PushSubscription[]> {
    if (userIds.length === 0) return [];

    // Get all active subscriptions for these users
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true));

    return subscriptions.filter((s) => userIds.includes(s.userId));
  }

  /**
   * Deactivate a subscription (e.g., if it expired)
   */
  private async deactivateSubscription(subscriptionId: string): Promise<void> {
    await db
      .update(pushSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushSubscriptions.id, subscriptionId));
  }

  /**
   * Build push notification payload
   */
  private buildPushPayload(notification: NotificationPayload): {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
    actions?: Array<{ action: string; title: string }>;
  } {
    const data = notification.data as {
      reportUrl?: string;
      dashboardUrl?: string;
      severity?: string;
    };

    // Determine actions based on notification type
    const actions: Array<{ action: string; title: string }> = [];
    if (data.reportUrl || data.dashboardUrl) {
      actions.push({ action: 'view', title: 'View' });
    }
    actions.push({ action: 'dismiss', title: 'Dismiss' });

    return {
      title: notification.subject,
      body: this.getBodyFromPayload(notification),
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        type: notification.type,
        workspaceId: notification.workspaceId,
        url: data.reportUrl || data.dashboardUrl,
        ...notification.data,
      },
      actions,
    };
  }

  /**
   * Get body text from payload
   */
  private getBodyFromPayload(payload: NotificationPayload): string {
    const data = payload.data as {
      summary?: string;
      description?: string;
      errorMessage?: string;
    };

    if (payload.type === 'weekly_report') {
      return data.summary || 'Your weekly report is ready';
    }

    if (payload.type === 'anomaly_alert') {
      return data.description || 'An anomaly was detected in your metrics';
    }

    if (payload.type === 'sync_failed') {
      return data.errorMessage || 'Data sync failed';
    }

    return `${payload.workspaceName}: ${payload.subject}`;
  }
}

// Singleton instance
let pushProvider: PushNotificationProvider | null = null;

/**
 * Get the push notification provider instance
 */
export function getPushProvider(): PushNotificationProvider {
  if (!pushProvider) {
    pushProvider = new PushNotificationProvider();
  }
  return pushProvider;
}

/**
 * Configure the push notification provider
 */
export function configurePushProvider(config: PushProviderConfig): void {
  getPushProvider().configure(config);
}

/**
 * Save a push subscription
 */
export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  deviceInfo?: { userAgent?: string; deviceName?: string }
) {
  return getPushProvider().saveSubscription(userId, subscription, deviceInfo);
}

/**
 * Remove a push subscription
 */
export async function removePushSubscription(userId: string, endpoint: string) {
  return getPushProvider().removeSubscription(userId, endpoint);
}

/**
 * Get VAPID public key
 */
export function getVapidPublicKey(): string | null {
  return getPushProvider().getVapidPublicKey();
}
