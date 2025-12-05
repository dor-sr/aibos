// Types
export * from './types';

// Email notifications
export {
  EmailNotificationProvider,
  getEmailProvider,
  configureEmailProvider,
  sendEmailNotification,
  type EmailProviderConfig,
} from './email';

// Slack notifications
export {
  SlackNotificationProvider,
  getSlackProvider,
  configureSlackProvider,
  sendSlackNotification,
  type SlackProviderConfig,
} from './slack';

// In-app notifications
export {
  InAppNotificationProvider,
  getInAppProvider,
  configureInAppProvider,
  sendInAppNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  type InAppProviderConfig,
} from './in-app';

// Push notifications
export {
  PushNotificationProvider,
  getPushProvider,
  configurePushProvider,
  savePushSubscription,
  removePushSubscription,
  getVapidPublicKey,
  type PushProviderConfig,
} from './push';

// Notification service
export {
  NotificationService,
  getNotificationService,
  configureNotificationService,
  sendNotification,
} from './service';
