export enum AnalyticsEventType {
  ALBUM_CREATED = 'album_created',
  ALBUM_PUBLISHED = 'album_published',
  ALBUM_ARCHIVED = 'album_archived',
  ALBUM_VIEWED = 'album_viewed',

  VIEWER_OPENED = 'viewer_opened',
  CAMERA_PERMISSION_GRANTED = 'camera_permission_granted',
  CAMERA_PERMISSION_DENIED = 'camera_permission_denied',
  SCAN_ATTEMPT = 'scan_attempt',
  SCAN_SUCCESS = 'scan_success',
  SCAN_FAILED = 'scan_failed',
  VIDEO_STARTED = 'video_started',
  VIDEO_COMPLETED = 'video_completed',

  PLAN_ASSIGNED = 'plan_assigned',
  PLAN_UPGRADED = 'plan_upgraded',
  PLAN_DOWNGRADED = 'plan_downgraded',
  PLAN_EXPIRED = 'plan_expired',
  PLAN_RENEWED = 'plan_renewed',

  TRIAL_ENDING_SOON = 'trial_ending_soon',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',

  PHOTO_UPLOADED = 'photo_uploaded',
  VIDEO_UPLOADED = 'video_uploaded',
  MEDIA_DELETED = 'media_deleted',
}
