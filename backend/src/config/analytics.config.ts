import { registerAs } from '@nestjs/config';

export default registerAs('analytics', () => ({
  ipSalt: process.env.ANALYTICS_IP_SALT ?? 'storypix-analytics-salt',
}));
