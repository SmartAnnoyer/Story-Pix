export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

export enum NotificationType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  ALBUM_PUBLISHED = 'album_published',
  UPLOAD_COMPLETED = 'upload_completed',
  TRIAL_EXPIRING = 'trial_expiring',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
}

export interface NotificationItem {
  id: string;
  studioId: string | null;
  userId: string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string | null;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface JobLogItem {
  id: string;
  queueName: string;
  jobType: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  createdAt: string | null;
}

export interface PaginatedJobLogs {
  items: JobLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface EmailTemplate {
  id: string;
  key: string;
  notificationType: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  version: number;
  isActive: boolean;
}
