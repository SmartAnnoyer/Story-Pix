import { DomainEventType, NotificationType } from '../../common/enums';

export interface NotificationDefinition {
  type: NotificationType;
  title: string;
  message: string;
  emailTemplateKey?: string;
  sendInApp: boolean;
  sendEmail: boolean;
}

export const DOMAIN_EVENT_NOTIFICATION_MAP: Partial<
  Record<DomainEventType, NotificationDefinition>
> = {
  [DomainEventType.USER_WELCOME]: {
    type: NotificationType.WELCOME,
    title: 'Welcome to Story-pix',
    message: 'Your studio account is ready. Start creating interactive albums.',
    emailTemplateKey: 'welcome',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.USER_PASSWORD_RESET]: {
    type: NotificationType.PASSWORD_RESET,
    title: 'Password Reset Requested',
    message: 'Use the link sent to your email to reset your password.',
    emailTemplateKey: 'password_reset',
    sendInApp: false,
    sendEmail: true,
  },
  [DomainEventType.USER_ACCOUNT_ACTIVATED]: {
    type: NotificationType.ACCOUNT_ACTIVATED,
    title: 'Account Activated',
    message: 'Your account has been activated.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.USER_ACCOUNT_SUSPENDED]: {
    type: NotificationType.ACCOUNT_SUSPENDED,
    title: 'Account Suspended',
    message: 'Your account has been suspended. Contact support for assistance.',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_TRIAL_STARTED]: {
    type: NotificationType.TRIAL_STARTED,
    title: 'Trial Started',
    message: 'Your trial period has begun.',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_TRIAL_EXPIRING]: {
    type: NotificationType.TRIAL_EXPIRING,
    title: 'Trial Ending Soon',
    message: 'Your trial is ending soon. Upgrade to keep your studio active.',
    emailTemplateKey: 'trial_expiry',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_TRIAL_EXPIRED]: {
    type: NotificationType.TRIAL_EXPIRED,
    title: 'Trial Expired',
    message: 'Your trial has expired.',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_ACTIVATED]: {
    type: NotificationType.SUBSCRIPTION_ACTIVATED,
    title: 'Subscription Activated',
    message: 'Your subscription is now active.',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_RENEWED]: {
    type: NotificationType.SUBSCRIPTION_RENEWED,
    title: 'Subscription Renewed',
    message: 'Your subscription has been renewed.',
    emailTemplateKey: 'subscription_renewal',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_EXPIRING]: {
    type: NotificationType.SUBSCRIPTION_EXPIRING,
    title: 'Subscription Renewing Soon',
    message: 'Your subscription period is ending soon.',
    emailTemplateKey: 'subscription_renewal',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_EXPIRED]: {
    type: NotificationType.SUBSCRIPTION_EXPIRED,
    title: 'Subscription Expired',
    message: 'Your subscription has expired.',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.SUBSCRIPTION_CANCELLED]: {
    type: NotificationType.SUBSCRIPTION_CANCELLED,
    title: 'Subscription Cancelled',
    message: 'Your subscription has been cancelled.',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.PAYMENT_SUCCESS]: {
    type: NotificationType.PAYMENT_SUCCESS,
    title: 'Payment Successful',
    message: 'Your payment was processed successfully.',
    emailTemplateKey: 'payment_success',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.PAYMENT_FAILED]: {
    type: NotificationType.PAYMENT_FAILED,
    title: 'Payment Failed',
    message: 'Your payment could not be processed.',
    emailTemplateKey: 'payment_failure',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.INVOICE_GENERATED]: {
    type: NotificationType.INVOICE_GENERATED,
    title: 'Invoice Generated',
    message: 'A new invoice is available in your billing dashboard.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.ALBUM_CREATED]: {
    type: NotificationType.ALBUM_CREATED,
    title: 'Album Created',
    message: 'A new album was created.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.ALBUM_PUBLISHED]: {
    type: NotificationType.ALBUM_PUBLISHED,
    title: 'Album Published',
    message: 'Your album is now live for viewers.',
    emailTemplateKey: 'album_published',
    sendInApp: true,
    sendEmail: true,
  },
  [DomainEventType.ALBUM_ARCHIVED]: {
    type: NotificationType.ALBUM_ARCHIVED,
    title: 'Album Archived',
    message: 'An album has been archived.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.MEDIA_UPLOAD_COMPLETED]: {
    type: NotificationType.UPLOAD_COMPLETED,
    title: 'Upload Completed',
    message: 'Your media upload finished successfully.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.MEDIA_UPLOAD_FAILED]: {
    type: NotificationType.UPLOAD_FAILED,
    title: 'Upload Failed',
    message: 'A media upload failed. Please retry.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.VIEWER_MILESTONE]: {
    type: NotificationType.VIEWER_MILESTONE,
    title: 'Viewer Milestone',
    message: 'Your album reached a new viewer milestone.',
    sendInApp: true,
    sendEmail: false,
  },
  [DomainEventType.SCAN_MILESTONE]: {
    type: NotificationType.SCAN_MILESTONE,
    title: 'Scan Milestone',
    message: 'Your album reached a new scan milestone.',
    sendInApp: true,
    sendEmail: false,
  },
};

export const BILLING_TO_DOMAIN_EVENT: Record<string, DomainEventType> = {
  trial_ending_soon: DomainEventType.SUBSCRIPTION_TRIAL_EXPIRING,
  payment_success: DomainEventType.PAYMENT_SUCCESS,
  payment_failed: DomainEventType.PAYMENT_FAILED,
  subscription_expiring: DomainEventType.SUBSCRIPTION_EXPIRING,
  subscription_renewed: DomainEventType.SUBSCRIPTION_RENEWED,
};
