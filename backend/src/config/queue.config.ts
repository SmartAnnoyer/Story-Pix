import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  enabled: Boolean(process.env.REDIS_URL),
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS ?? '3', 10),
  retryDelayMs: parseInt(process.env.QUEUE_RETRY_DELAY_MS ?? '5000', 10),
}));
