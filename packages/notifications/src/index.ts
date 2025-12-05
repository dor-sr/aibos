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

// Notification service
export {
  NotificationService,
  getNotificationService,
  configureNotificationService,
  sendNotification,
} from './service';
