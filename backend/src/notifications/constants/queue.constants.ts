export const QUEUE_NAMES = {
  EMAIL: 'storypix-email',
  NOTIFICATIONS: 'storypix-notifications',
  SCHEDULED: 'storypix-scheduled',
  DEAD_LETTER: 'storypix-dead-letter',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueJobPayload {
  jobLogId?: string;
  [key: string]: unknown;
}
