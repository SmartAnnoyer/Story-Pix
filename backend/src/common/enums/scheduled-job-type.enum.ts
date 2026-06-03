export enum ScheduledJobType {
  TRIAL_EXPIRY_CHECK = 'trial_expiry_check',
  SUBSCRIPTION_EXPIRY_CHECK = 'subscription_expiry_check',
  PAYMENT_RECONCILIATION = 'payment_reconciliation',
  ANALYTICS_AGGREGATION = 'analytics_aggregation',
  STORAGE_USAGE_SYNC = 'storage_usage_sync',
  EMAIL_SEND = 'email_send',
  NOTIFICATION_DELIVERY = 'notification_delivery',
}
