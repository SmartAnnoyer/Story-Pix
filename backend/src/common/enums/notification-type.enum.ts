export enum NotificationType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_ACTIVATED = 'account_activated',
  ACCOUNT_SUSPENDED = 'account_suspended',

  TRIAL_STARTED = 'trial_started',
  TRIAL_EXPIRING = 'trial_expiring',
  TRIAL_EXPIRED = 'trial_expired',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  SUBSCRIPTION_ACTIVATED = 'subscription_activated',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',

  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  INVOICE_GENERATED = 'invoice_generated',

  ALBUM_CREATED = 'album_created',
  ALBUM_PUBLISHED = 'album_published',
  ALBUM_ARCHIVED = 'album_archived',

  UPLOAD_COMPLETED = 'upload_completed',
  UPLOAD_FAILED = 'upload_failed',

  VIEWER_MILESTONE = 'viewer_milestone',
  SCAN_MILESTONE = 'scan_milestone',
}
