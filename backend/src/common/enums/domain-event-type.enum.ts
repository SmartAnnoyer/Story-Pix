export enum DomainEventType {
  USER_WELCOME = 'user.welcome',
  USER_PASSWORD_RESET = 'user.password_reset',
  USER_ACCOUNT_ACTIVATED = 'user.account_activated',
  USER_ACCOUNT_SUSPENDED = 'user.account_suspended',

  SUBSCRIPTION_TRIAL_STARTED = 'subscription.trial_started',
  SUBSCRIPTION_TRIAL_EXPIRING = 'subscription.trial_expiring',
  SUBSCRIPTION_TRIAL_EXPIRED = 'subscription.trial_expired',
  SUBSCRIPTION_ACTIVATED = 'subscription.activated',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_EXPIRING = 'subscription.expiring',
  SUBSCRIPTION_EXPIRED = 'subscription.expired',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',

  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  INVOICE_GENERATED = 'invoice.generated',

  ALBUM_CREATED = 'album.created',
  ALBUM_PUBLISHED = 'album.published',
  ALBUM_ARCHIVED = 'album.archived',

  MEDIA_UPLOAD_COMPLETED = 'media.upload_completed',
  MEDIA_UPLOAD_FAILED = 'media.upload_failed',

  VIEWER_MILESTONE = 'viewer.milestone',
  SCAN_MILESTONE = 'scan.milestone',
}
