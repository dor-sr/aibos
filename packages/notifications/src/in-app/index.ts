import { createLogger } from '@aibos/core';
import {
  db,
  inAppNotifications,
  userNotificationPreferences,
  type InAppNotification,
  type NewInAppNotification,
} from '@aibos/data-model';
import { eq, and, desc, isNull, sql, lt, or } from 'drizzle-orm';
import type { NotificationPayload, NotificationResult, NotificationProvider } from '../types';

const logger = createLogger('notifications:in-app');

/**
 * In-app notification provider configuration
 */
export interface InAppProviderConfig {
  // Maximum notifications to keep per user (older ones are auto-deleted)
  maxNotificationsPerUser?: number;
  // Default expiration time in days (0 = never expire)
  defaultExpirationDays?: number;
}

/**
 * In-app notification service
 *
 * Handles creating, reading, and managing in-app notifications
 * that appear in the notification center.
 */
export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = 'in_app' as const;
  private config: InAppProviderConfig = {
    maxNotificationsPerUser: 100,
    defaultExpirationDays: 30,
  };

  constructor(config?: InAppProviderConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Configure the in-app provider
   */
  configure(config: InAppProviderConfig): void {
    this.config = { ...this.config, ...config };
    logger.info('In-app provider configured', { config: this.config });
  }

  /**
   * Check if provider is configured (always true for in-app)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  /**
   * Send in-app notification
   */
  async send(
    payload: NotificationPayload,
    options?: { userId?: string; userIds?: string[] }
  ): Promise<NotificationResult> {
    try {
      const userIds = options?.userIds || (options?.userId ? [options.userId] : []);

      if (userIds.length === 0) {
        // If no specific users, get all users in the workspace
        logger.warn('No specific users for in-app notification, skipping');
        return {
          success: false,
          channel: 'in_app',
          error: 'No users specified for in-app notification',
        };
      }

      logger.info('Creating in-app notifications', {
        type: payload.type,
        workspaceId: payload.workspaceId,
        userCount: userIds.length,
      });

      // Create notifications for each user
      const notifications: NewInAppNotification[] = userIds.map((userId) => ({
        id: `inapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workspaceId: payload.workspaceId,
        userId,
        type: payload.type,
        priority: this.getPriorityFromPayload(payload),
        title: payload.subject,
        message: this.getMessageFromPayload(payload),
        actionUrl: this.getActionUrlFromPayload(payload),
        actionLabel: this.getActionLabelFromPayload(payload),
        data: payload.data,
        iconType: this.getIconTypeFromPayload(payload),
        groupKey: this.getGroupKeyFromPayload(payload),
        expiresAt: this.getExpirationDate(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(inAppNotifications).values(notifications);

      // Clean up old notifications if needed
      await this.cleanupOldNotifications(userIds);

      logger.info('In-app notifications created', {
        count: notifications.length,
      });

      return {
        success: true,
        channel: 'in_app',
        messageId: notifications[0]?.id,
        sentAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to create in-app notification', error as Error, {
        type: payload.type,
        workspaceId: payload.workspaceId,
      });

      return {
        success: false,
        channel: 'in_app',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      workspaceId?: string;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      includeExpired?: boolean;
    }
  ): Promise<{ notifications: InAppNotification[]; unreadCount: number; totalCount: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Build base conditions
    const conditions = [eq(inAppNotifications.userId, userId), eq(inAppNotifications.isDismissed, false)];

    if (options?.workspaceId) {
      conditions.push(eq(inAppNotifications.workspaceId, options.workspaceId));
    }

    if (options?.unreadOnly) {
      conditions.push(eq(inAppNotifications.isRead, false));
    }

    if (!options?.includeExpired) {
      conditions.push(
        or(isNull(inAppNotifications.expiresAt), sql`${inAppNotifications.expiresAt} > NOW()`)!
      );
    }

    // Get notifications
    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(and(...conditions))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get counts
    const unreadCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.isRead, false),
          eq(inAppNotifications.isDismissed, false),
          or(isNull(inAppNotifications.expiresAt), sql`${inAppNotifications.expiresAt} > NOW()`)!
        )
      );

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inAppNotifications)
      .where(and(...conditions));

    return {
      notifications,
      unreadCount: unreadCountResult[0]?.count || 0,
      totalCount: totalCountResult[0]?.count || 0,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await db
        .update(inAppNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(inAppNotifications.id, notificationId), eq(inAppNotifications.userId, userId)));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, workspaceId?: string): Promise<number> {
    const conditions = [eq(inAppNotifications.userId, userId), eq(inAppNotifications.isRead, false)];

    if (workspaceId) {
      conditions.push(eq(inAppNotifications.workspaceId, workspaceId));
    }

    // Count unread first
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inAppNotifications)
      .where(and(...conditions));

    const count = countResult[0]?.count || 0;

    if (count > 0) {
      await db
        .update(inAppNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    }

    return count;
  }

  /**
   * Dismiss notification
   */
  async dismiss(notificationId: string, userId: string): Promise<boolean> {
    try {
      await db
        .update(inAppNotifications)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(inAppNotifications.id, notificationId), eq(inAppNotifications.userId, userId)));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dismiss all notifications for a user
   */
  async dismissAll(userId: string, workspaceId?: string): Promise<number> {
    const conditions = [eq(inAppNotifications.userId, userId), eq(inAppNotifications.isDismissed, false)];

    if (workspaceId) {
      conditions.push(eq(inAppNotifications.workspaceId, workspaceId));
    }

    // Count undismissed first
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inAppNotifications)
      .where(and(...conditions));

    const count = countResult[0]?.count || 0;

    if (count > 0) {
      await db
        .update(inAppNotifications)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    }

    return count;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(
    userId: string,
    workspaceId: string
  ): Promise<{
    emailEnabled: boolean;
    slackEnabled: boolean;
    inAppEnabled: boolean;
    pushEnabled: boolean;
    weeklyReports: boolean;
    anomalyAlerts: boolean;
    syncNotifications: boolean;
    insightNotifications: boolean;
    anomalySeverityThreshold: string;
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    emailDigestEnabled: boolean;
    emailDigestFrequency: string;
  }> {
    const prefs = await db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.workspaceId, workspaceId)
        )
      )
      .limit(1);

    const p = prefs[0];
    
    if (!p) {
      // Return defaults
      return {
        emailEnabled: true,
        slackEnabled: true,
        inAppEnabled: true,
        pushEnabled: false,
        weeklyReports: true,
        anomalyAlerts: true,
        syncNotifications: false,
        insightNotifications: true,
        anomalySeverityThreshold: 'medium',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        emailDigestEnabled: false,
        emailDigestFrequency: 'daily',
      };
    }

    return {
      emailEnabled: p.emailEnabled,
      slackEnabled: p.slackEnabled,
      inAppEnabled: p.inAppEnabled,
      pushEnabled: p.pushEnabled,
      weeklyReports: p.weeklyReports,
      anomalyAlerts: p.anomalyAlerts,
      syncNotifications: p.syncNotifications,
      insightNotifications: p.insightNotifications,
      anomalySeverityThreshold: p.anomalySeverityThreshold || 'medium',
      quietHoursEnabled: p.quietHoursEnabled,
      quietHoursStart: p.quietHoursStart,
      quietHoursEnd: p.quietHoursEnd,
      emailDigestEnabled: p.emailDigestEnabled,
      emailDigestFrequency: p.emailDigestFrequency || 'daily',
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    workspaceId: string,
    preferences: Partial<{
      emailEnabled: boolean;
      slackEnabled: boolean;
      inAppEnabled: boolean;
      pushEnabled: boolean;
      weeklyReports: boolean;
      anomalyAlerts: boolean;
      syncNotifications: boolean;
      insightNotifications: boolean;
      anomalySeverityThreshold: string;
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
      quietHoursTimezone: string;
      emailDigestEnabled: boolean;
      emailDigestFrequency: string;
    }>
  ): Promise<boolean> {
    // Check if preferences exist
    const existing = await db
      .select({ id: userNotificationPreferences.id })
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new preferences
      await db.insert(userNotificationPreferences).values({
        id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        workspaceId,
        ...preferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Update existing preferences
      await db
        .update(userNotificationPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userNotificationPreferences.userId, userId),
            eq(userNotificationPreferences.workspaceId, workspaceId)
          )
        );
    }

    return true;
  }

  /**
   * Clean up old notifications to stay within limit
   */
  private async cleanupOldNotifications(userIds: string[]): Promise<void> {
    const maxNotifications = this.config.maxNotificationsPerUser || 100;

    for (const userId of userIds) {
      // Get count of notifications
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inAppNotifications)
        .where(eq(inAppNotifications.userId, userId));

      const count = countResult[0]?.count || 0;

      if (count > maxNotifications) {
        // Get IDs of oldest notifications to delete
        const toDelete = await db
          .select({ id: inAppNotifications.id })
          .from(inAppNotifications)
          .where(eq(inAppNotifications.userId, userId))
          .orderBy(desc(inAppNotifications.createdAt))
          .offset(maxNotifications);

        if (toDelete.length > 0) {
          const idsToDelete = toDelete.map((n) => n.id);
          await db.delete(inAppNotifications).where(
            sql`${inAppNotifications.id} = ANY(${idsToDelete})`
          );

          logger.info('Cleaned up old notifications', {
            userId,
            deletedCount: idsToDelete.length,
          });
        }
      }
    }

    // Also delete expired notifications
    try {
      await db
        .delete(inAppNotifications)
        .where(lt(inAppNotifications.expiresAt, new Date()));

      logger.debug('Cleaned up expired notifications');
    } catch (error) {
      logger.error('Failed to clean up expired notifications', error as Error);
    }
  }

  /**
   * Get priority from notification payload
   */
  private getPriorityFromPayload(
    payload: NotificationPayload
  ): 'low' | 'normal' | 'high' | 'urgent' {
    const data = payload.data as { severity?: string };

    if (payload.type === 'anomaly_alert') {
      const severity = data.severity;
      if (severity === 'critical') return 'urgent';
      if (severity === 'high') return 'high';
      if (severity === 'medium') return 'normal';
      return 'low';
    }

    if (payload.type === 'sync_failed') return 'high';
    if (payload.type === 'weekly_report') return 'normal';

    return 'normal';
  }

  /**
   * Get message from notification payload
   */
  private getMessageFromPayload(payload: NotificationPayload): string {
    const data = payload.data as { summary?: string; description?: string; errorMessage?: string };

    if (payload.type === 'weekly_report') {
      return data.summary || 'Your weekly report is ready';
    }

    if (payload.type === 'anomaly_alert') {
      return data.description || 'An anomaly was detected in your metrics';
    }

    if (payload.type === 'sync_completed') {
      return 'Data sync completed successfully';
    }

    if (payload.type === 'sync_failed') {
      return data.errorMessage || 'Data sync failed';
    }

    return payload.subject;
  }

  /**
   * Get action URL from notification payload
   */
  private getActionUrlFromPayload(payload: NotificationPayload): string | undefined {
    const data = payload.data as { reportUrl?: string; dashboardUrl?: string };
    return data.reportUrl || data.dashboardUrl;
  }

  /**
   * Get action label from notification payload
   */
  private getActionLabelFromPayload(payload: NotificationPayload): string | undefined {
    if (payload.type === 'weekly_report') return 'View Report';
    if (payload.type === 'anomaly_alert') return 'View Dashboard';
    if (payload.type === 'sync_failed') return 'View Details';
    return undefined;
  }

  /**
   * Get icon type from notification payload
   */
  private getIconTypeFromPayload(payload: NotificationPayload): string {
    switch (payload.type) {
      case 'weekly_report':
        return 'report';
      case 'anomaly_alert':
        return 'alert';
      case 'sync_completed':
      case 'sync_failed':
        return 'sync';
      case 'insight':
        return 'insight';
      case 'welcome':
        return 'welcome';
      default:
        return 'system';
    }
  }

  /**
   * Get group key from notification payload
   */
  private getGroupKeyFromPayload(payload: NotificationPayload): string | undefined {
    const date = new Date().toISOString().split('T')[0];

    if (payload.type === 'anomaly_alert') {
      return `anomaly-${date}`;
    }

    if (payload.type === 'sync_completed' || payload.type === 'sync_failed') {
      const data = payload.data as { connectorType?: string };
      return `sync-${data.connectorType || 'unknown'}`;
    }

    return undefined;
  }

  /**
   * Get expiration date based on config
   */
  private getExpirationDate(): Date | undefined {
    const days = this.config.defaultExpirationDays;
    if (!days || days <= 0) return undefined;

    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}

// Singleton instance
let inAppProvider: InAppNotificationProvider | null = null;

/**
 * Get the in-app notification provider instance
 */
export function getInAppProvider(): InAppNotificationProvider {
  if (!inAppProvider) {
    inAppProvider = new InAppNotificationProvider();
  }
  return inAppProvider;
}

/**
 * Configure the in-app notification provider
 */
export function configureInAppProvider(config: InAppProviderConfig): void {
  getInAppProvider().configure(config);
}

/**
 * Send an in-app notification
 */
export async function sendInAppNotification(
  payload: NotificationPayload,
  options?: { userId?: string; userIds?: string[] }
): Promise<NotificationResult> {
  return getInAppProvider().send(payload, options);
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  options?: {
    workspaceId?: string;
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }
) {
  return getInAppProvider().getNotifications(userId, options);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return getInAppProvider().markAsRead(notificationId, userId);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string, workspaceId?: string) {
  return getInAppProvider().markAllAsRead(userId, workspaceId);
}

/**
 * Dismiss notification
 */
export async function dismissNotification(notificationId: string, userId: string) {
  return getInAppProvider().dismiss(notificationId, userId);
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(userId: string, workspaceId: string) {
  return getInAppProvider().getUserPreferences(userId, workspaceId);
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  workspaceId: string,
  preferences: Parameters<InAppNotificationProvider['updateUserPreferences']>[2]
) {
  return getInAppProvider().updateUserPreferences(userId, workspaceId, preferences);
}

